import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdmin } from '@/lib/auth';
import { getCachedPartyStats, setCachedPartyStats } from '@/lib/redis';
import {
  computeWeeklyStats,
  pickLatestTierPerUser,
  computeTierDistribution,
  resolveDataSufficiency,
  PARTY_STATS_WINDOW_DAYS,
} from '@/lib/partyStats';
import { TIER_CHOICES } from '@/lib/tierRoles';

export const dynamic = 'force-dynamic';

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET: 파티 모집 통계 스냅샷을 반환한다. 1시간 Redis 캐시 우선 조회 - `?fresh=1`로 강제 재계산
 * (관리자 전용 라우트라 캐시 우회 파라미터를 노출해도 안전하고, 캐시 히트/미스 확인용으로도 쓴다).
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const url = new URL(request.url);
  const bypassCache = url.searchParams.get('fresh') === '1';

  if (!bypassCache) {
    const cached = await getCachedPartyStats(guildId);
    if (cached) {
      return NextResponse.json({ status: 'success', cached: true, ...cached });
    }
  }

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const since = new Date(Date.now() - PARTY_STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [recruitmentsRes, verificationsRes] = await Promise.all([
    supabase.from('party_recruitments').select('queue_type, lanes, created_at').eq('guild_id', guildId).gte('created_at', since),
    supabase.from('riot_verifications').select('user_id, tier, verified_at').eq('guild_id', guildId),
  ]);

  if (recruitmentsRes.error) {
    console.error('[PARTY_STATS][ERROR]', recruitmentsRes.error);
    return NextResponse.json({ status: 'error', message: recruitmentsRes.error.message }, { status: 500 });
  }
  if (verificationsRes.error) {
    console.error('[PARTY_STATS][ERROR]', verificationsRes.error);
    return NextResponse.json({ status: 'error', message: verificationsRes.error.message }, { status: 500 });
  }

  const weekly = computeWeeklyStats(recruitmentsRes.data || []);
  const latestVerifications = pickLatestTierPerUser(verificationsRes.data || []);
  const tierDistributionRaw = computeTierDistribution(latestVerifications);

  // TIER_CHOICES 순서(Iron -> Challenger)로 정렬하고, 목록에 없는 값도 뒤에 붙여서 누락 없이 보여준다.
  const tierOrder = new Map(TIER_CHOICES.map((t, i) => [t, i]));
  const tierDistribution = [...tierDistributionRaw].sort((a, b) => {
    const ai = tierOrder.has(a.tier) ? tierOrder.get(a.tier)! : Number.MAX_SAFE_INTEGER;
    const bi = tierOrder.has(b.tier) ? tierOrder.get(b.tier)! : Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });

  const sufficiency = resolveDataSufficiency(weekly.totalCount);

  const payload = {
    window_days: PARTY_STATS_WINDOW_DAYS,
    weekly_count: weekly.totalCount,
    top_combos: weekly.topCombos,
    tier_distribution: tierDistribution,
    verified_user_count: latestVerifications.length,
    is_empty: sufficiency.isEmpty,
    is_sparse: sufficiency.isSparse,
    generated_at: new Date().toISOString(),
  };

  await setCachedPartyStats(guildId, payload);

  return NextResponse.json({ status: 'success', cached: false, ...payload });
}
