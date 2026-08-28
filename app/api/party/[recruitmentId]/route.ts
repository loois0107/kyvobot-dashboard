import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireLogin, verifyGuildAdmin } from '@/lib/auth';
import { fetchMemberInfoMap } from '@/lib/discordMembers';

export const dynamic = 'force-dynamic';

const VALID_TEAMS = ['red', 'blue'] as const;
type Team = (typeof VALID_TEAMS)[number];

// 🛡️ [종료된 모집 잠금] party.py의 party_recruitments.status가 이 두 값이면 이미 끝난 모집이다 -
// 팀 편성 딥링크 버튼은 카드가 마감/만료될 때 discord.py 쪽에서 view=None으로 지워지지만, 링크
// 버튼은 콜백이 없어 클릭해도 봇으로 인터랙션이 안 오므로 그 서버사이드 방어가 아예 안 먹힌다 -
// 그래서 이 라우트 자체가 마지막 방어선이다.
const ENDED_STATUSES = ['closed', 'expired'];

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * 리더 본인이거나(길드 관리자 권한과 무관하게 이 모집을 만든 사람) 이 길드의 관리자면 통과.
 * requireGuildAdmin과 달리 "이 특정 모집의 리더인지"는 길드 권한 API가 아니라 DB 행 자체로
 * 판단해야 해서, lib/auth.ts의 범용 가드로는 표현이 안 되고 이 라우트에서 직접 조합한다.
 */
async function canManageRecruitment(userId: string, recruitment: { leader_id: string; guild_id: string }): Promise<boolean> {
  if (recruitment.leader_id === userId) return true;
  return verifyGuildAdmin(recruitment.guild_id);
}

/**
 * mmr_score 내림차순 정렬 후 스네이크 드래프트(R,B,B,R,R,B,B,R,...) 배정.
 *
 * 🛡️ [단순 교대(R,B,R,B,...)에서 변경됨] 처음엔 "단순하게 교대 배정"으로 만들었는데, 실제
 * 점수 분포(3800,2900,2750,1450,1300,1100,900,700,400,100)로 돌려보니 단순 교대는 레드 평균
 * 1830 vs 블루 평균 1250(580점 차이)로 전혀 안 balanced했다 - 상위권 픽이 한쪽에 쏠리기 쉬운
 * 구조적 문제였다. 같은 데이터에 스네이크 패턴을 적용하면 1530 vs 1550(20점 차이)로 크게
 * 개선된다 - 코드 복잡도는 조건 하나 늘어나는 정도라 "단순함"은 거의 그대로 유지된다.
 * mmr_score가 없는 참가자(-1로 취급, 실제 점수는 Iron IV 0LP=0부터 시작하므로 항상 맨 뒤로
 * 밀림)도 배정에서 빠지지 않고 순서상 마지막에 섞여 들어간다 - 전원이 팀을 받아야 하므로
 * 데이터 없다고 열외시키지 않는다.
 */
function computeAutoBalance(participants: { user_id: string; mmr_score: number | null }[]): Map<string, Team> {
  const sorted = [...participants].sort((a, b) => (b.mmr_score ?? -1) - (a.mmr_score ?? -1));
  const assignment = new Map<string, Team>();
  sorted.forEach((p, i) => {
    const round = Math.floor(i / 2);
    const posInRound = i % 2;
    const firstTeam: Team = round % 2 === 0 ? 'red' : 'blue';
    const secondTeam: Team = firstTeam === 'red' ? 'blue' : 'red';
    assignment.set(p.user_id, posInRound === 0 ? firstTeam : secondTeam);
  });
  return assignment;
}

/**
 * GET: 모집 정보 + 참가자 명단(닉네임/아바타 포함, fetchMemberInfoMap 재사용 - 리더보드/감사
 * 로그와 동일한 패턴)을 반환한다. 팀 편성 페이지가 4초 폴링으로 이 라우트를 반복 호출한다.
 */
export async function GET(request: Request, ctx: { params: Promise<{ recruitmentId: string }> }) {
  const loginResult = await requireLogin();
  if (loginResult instanceof NextResponse) return loginResult;
  const { userId } = loginResult;

  const { recruitmentId } = await ctx.params;
  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { data: recruitment, error: recruitmentError } = await supabase
    .from('party_recruitments')
    .select('id, guild_id, channel_id, leader_id, queue_type, lanes, needed_count, selected_game, required_positions, status, expires_at')
    .eq('id', recruitmentId)
    .maybeSingle();
  if (recruitmentError) {
    console.error('[PARTY_TEAM][ERROR]', recruitmentError);
    return NextResponse.json({ status: 'error', message: recruitmentError.message }, { status: 500 });
  }
  if (!recruitment) {
    return NextResponse.json({ status: 'error', message: 'This recruitment no longer exists.' }, { status: 404 });
  }

  const isLeader = recruitment.leader_id === userId;
  const isAdmin = isLeader ? false : await verifyGuildAdmin(recruitment.guild_id);
  if (!isLeader && !isAdmin) {
    return NextResponse.json({ status: 'error', message: 'Only this recruitment\'s leader or a server admin can manage teams.' }, { status: 403 });
  }

  const { data: participantRows, error: participantsError } = await supabase
    .from('party_participants')
    .select('user_id, position, team, mmr_score')
    .eq('recruitment_id', recruitmentId);
  if (participantsError) {
    console.error('[PARTY_TEAM][ERROR]', participantsError);
    return NextResponse.json({ status: 'error', message: participantsError.message }, { status: 500 });
  }

  const neededUserIds = new Set((participantRows || []).map((p) => p.user_id));
  const { map: memberInfoMap } = await fetchMemberInfoMap(recruitment.guild_id, neededUserIds);

  const participants = (participantRows || []).map((p) => ({
    user_id: p.user_id,
    position: p.position,
    team: p.team,
    mmr_score: p.mmr_score,
    username: memberInfoMap.get(p.user_id)?.username || `Unknown (${p.user_id.slice(-4)})`,
    avatar_url: memberInfoMap.get(p.user_id)?.avatar_url || null,
    is_leader: p.user_id === recruitment.leader_id,
  }));

  return NextResponse.json({
    status: 'success',
    recruitment,
    participants,
    viewer: { isLeader, isAdmin },
    readOnly: ENDED_STATUSES.includes(recruitment.status),
  });
}

/**
 * POST: 두 가지 액션을 처리한다.
 * ① { user_id, team } - 참가자 한 명의 팀 배정을 바꾼다 (team은 'red'/'blue'/null만 허용 -
 *    DB 컬럼 자체엔 제약이 없지만, 이 라우트가 지금 UI가 실제로 쓰는 값만 받도록 방어선 역할을 한다).
 * ② { action: 'auto_balance' } - 저장된 mmr_score 기준으로 전원의 팀을 다시 계산해 일괄 배정한다.
 * 리더/관리자 확인(canManageRecruitment)은 두 액션이 공유하는 단일 지점이라 body 형태를 보기 전에
 * 먼저 통과시킨다 - 어느 쪽 액션이든 동일하게 보호된다.
 */
export async function POST(request: Request, ctx: { params: Promise<{ recruitmentId: string }> }) {
  const loginResult = await requireLogin();
  if (loginResult instanceof NextResponse) return loginResult;
  const { userId } = loginResult;

  const { recruitmentId } = await ctx.params;
  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid request body.' }, { status: 400 });
  }

  const { data: recruitment, error: recruitmentError } = await supabase
    .from('party_recruitments')
    .select('leader_id, guild_id, status')
    .eq('id', recruitmentId)
    .maybeSingle();
  if (recruitmentError) {
    console.error('[PARTY_TEAM][ERROR]', recruitmentError);
    return NextResponse.json({ status: 'error', message: recruitmentError.message }, { status: 500 });
  }
  if (!recruitment) {
    return NextResponse.json({ status: 'error', message: 'This recruitment no longer exists.' }, { status: 404 });
  }

  const allowed = await canManageRecruitment(userId, recruitment);
  if (!allowed) {
    return NextResponse.json({ status: 'error', message: 'Only this recruitment\'s leader or a server admin can manage teams.' }, { status: 403 });
  }

  // 🛡️ [종료된 모집 잠금] 수동 배정/자동 밸런스 둘 다 이 체크 하나로 막는다 - 링크 버튼이 화면에
  // 남아있든 아니든(위 ENDED_STATUSES 주석 참고) 실제 쓰기는 여기서 최종적으로 차단된다.
  if (ENDED_STATUSES.includes(recruitment.status)) {
    return NextResponse.json({ status: 'error', message: 'This recruitment has already ended and can no longer be edited.' }, { status: 403 });
  }

  if (body?.action === 'auto_balance') {
    const { data: participantRows, error: participantsError } = await supabase
      .from('party_participants')
      .select('user_id, mmr_score')
      .eq('recruitment_id', recruitmentId);
    if (participantsError) {
      console.error('[PARTY_TEAM][ERROR]', participantsError);
      return NextResponse.json({ status: 'error', message: participantsError.message }, { status: 500 });
    }
    if (!participantRows || participantRows.length === 0) {
      return NextResponse.json({ status: 'error', message: 'No participants to balance yet.' }, { status: 400 });
    }

    const assignment = computeAutoBalance(participantRows);
    try {
      for (const [targetUserId, team] of assignment) {
        const { error } = await supabase
          .from('party_participants')
          .update({ team })
          .eq('recruitment_id', recruitmentId)
          .eq('user_id', targetUserId);
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('[PARTY_TEAM][ERROR]', err);
      return NextResponse.json({ status: 'error', message: err.message || 'Failed to auto-balance teams.' }, { status: 500 });
    }

    return NextResponse.json({ status: 'success' });
  }

  const targetUserId = typeof body?.user_id === 'string' ? body.user_id : null;
  const team: Team | null = body?.team === null ? null : body?.team;
  if (!targetUserId) {
    return NextResponse.json({ status: 'error', message: 'user_id is required.' }, { status: 400 });
  }
  if (team !== null && !VALID_TEAMS.includes(team)) {
    return NextResponse.json({ status: 'error', message: `team must be one of: ${VALID_TEAMS.join(', ')}, or null.` }, { status: 400 });
  }

  // 🛡️ 임의의 user_id를 이 모집에 팀만 배정하는 식으로 끼워넣는 걸 막는다 - 실제로 이 모집에
  // 참가한 사람만 팀을 받을 수 있다.
  const { data: existingParticipant, error: participantLookupError } = await supabase
    .from('party_participants')
    .select('user_id')
    .eq('recruitment_id', recruitmentId)
    .eq('user_id', targetUserId)
    .maybeSingle();
  if (participantLookupError) {
    console.error('[PARTY_TEAM][ERROR]', participantLookupError);
    return NextResponse.json({ status: 'error', message: participantLookupError.message }, { status: 500 });
  }
  if (!existingParticipant) {
    return NextResponse.json({ status: 'error', message: 'This user has not joined this recruitment.' }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from('party_participants')
    .update({ team })
    .eq('recruitment_id', recruitmentId)
    .eq('user_id', targetUserId);
  if (updateError) {
    console.error('[PARTY_TEAM][ERROR]', updateError);
    return NextResponse.json({ status: 'error', message: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'success' });
}
