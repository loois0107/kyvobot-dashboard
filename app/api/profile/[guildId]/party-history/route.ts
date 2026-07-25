import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireLogin, requireGuildMembership } from '@/lib/auth';
import { mergePartyHistory, type PartyRecruitmentRow } from '@/lib/partyHistory';

export const dynamic = 'force-dynamic';

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

const RECRUITMENT_COLUMNS = 'id, guild_id, leader_id, queue_type, lanes, selected_game, status, created_at';

/**
 * GET: 로그인한 유저 본인의 파티 참여 이력(이 서버 한정)을 반환한다. user_id는 세션에서만
 * 가져온다 - 요청 바디/쿼리로는 절대 안 받는다(다른 유저 이력을 훔쳐볼 방법이 구조적으로 없음).
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const result = await requireLogin();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { guildId } = await ctx.params;
  const blocked = await requireGuildMembership(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { data: participantLinks, error: participantLinksError } = await supabase
    .from('party_participants')
    .select('recruitment_id')
    .eq('user_id', userId);
  if (participantLinksError) {
    console.error('[PARTY_HISTORY][ERROR]', participantLinksError);
    return NextResponse.json({ status: 'error', message: participantLinksError.message }, { status: 500 });
  }

  const recruitmentIds = (participantLinks || []).map((r) => r.recruitment_id);

  const [participantRecruitmentsRes, leaderRecruitmentsRes] = await Promise.all([
    recruitmentIds.length > 0
      ? supabase.from('party_recruitments').select(RECRUITMENT_COLUMNS).eq('guild_id', guildId).in('id', recruitmentIds)
      : Promise.resolve({ data: [] as PartyRecruitmentRow[], error: null }),
    supabase.from('party_recruitments').select(RECRUITMENT_COLUMNS).eq('guild_id', guildId).eq('leader_id', userId),
  ]);

  if (participantRecruitmentsRes.error) {
    console.error('[PARTY_HISTORY][ERROR]', participantRecruitmentsRes.error);
    return NextResponse.json({ status: 'error', message: participantRecruitmentsRes.error.message }, { status: 500 });
  }
  if (leaderRecruitmentsRes.error) {
    console.error('[PARTY_HISTORY][ERROR]', leaderRecruitmentsRes.error);
    return NextResponse.json({ status: 'error', message: leaderRecruitmentsRes.error.message }, { status: 500 });
  }

  const history = mergePartyHistory(
    (participantRecruitmentsRes.data || []) as PartyRecruitmentRow[],
    (leaderRecruitmentsRes.data || []) as PartyRecruitmentRow[],
    userId
  );

  return NextResponse.json({ status: 'success', history });
}
