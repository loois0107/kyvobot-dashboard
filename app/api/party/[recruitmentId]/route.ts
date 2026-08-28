import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireLogin, verifyGuildAdmin } from '@/lib/auth';
import { fetchMemberInfoMap } from '@/lib/discordMembers';

export const dynamic = 'force-dynamic';

const VALID_TEAMS = ['red', 'blue'] as const;
type Team = (typeof VALID_TEAMS)[number];

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
    .select('user_id, position, team')
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
    username: memberInfoMap.get(p.user_id)?.username || `Unknown (${p.user_id.slice(-4)})`,
    avatar_url: memberInfoMap.get(p.user_id)?.avatar_url || null,
    is_leader: p.user_id === recruitment.leader_id,
  }));

  return NextResponse.json({
    status: 'success',
    recruitment,
    participants,
    viewer: { isLeader, isAdmin },
  });
}

/**
 * POST: 한 참가자의 팀 배정을 바꾼다. { user_id, team } - team은 'red'/'blue'/null(배정 해제)만
 * 허용한다 - DB 컬럼 자체엔 제약이 없지만(1단계 position처럼 향후 확장 여지를 열어두는 설계),
 * 이 라우트가 지금 UI가 실제로 쓰는 값만 받도록 방어선 역할을 한다.
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

  const targetUserId = typeof body?.user_id === 'string' ? body.user_id : null;
  const team: Team | null = body?.team === null ? null : body?.team;
  if (!targetUserId) {
    return NextResponse.json({ status: 'error', message: 'user_id is required.' }, { status: 400 });
  }
  if (team !== null && !VALID_TEAMS.includes(team)) {
    return NextResponse.json({ status: 'error', message: `team must be one of: ${VALID_TEAMS.join(', ')}, or null.` }, { status: 400 });
  }

  const { data: recruitment, error: recruitmentError } = await supabase
    .from('party_recruitments')
    .select('leader_id, guild_id')
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
