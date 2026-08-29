export const PARTY_STATS_WINDOW_DAYS = 7;
export const PARTY_STATS_SPARSE_THRESHOLD = 5;
export const PARTY_STATS_CACHE_TTL_SECONDS = 3600;

export interface RecruitmentRow {
  selected_game: string | null;
  created_at: string;
}

export interface GameFrequencyStat {
  game_name: string;
  count: number;
}

export interface WeeklyStats {
  totalCount: number;
  topGames: GameFrequencyStat[];
}

function normalizeGameKey(game: string | null): string {
  return (game || '').trim().toLowerCase();
}

/**
 * 🛡️ [queue_type 삭제 - 게임 빈도 통계로 재정의] 예전엔 queue_type+lanes(둘 다 자유 텍스트) 조합을
 * 세서 "인기 큐/라인 조합"을 보여줬는데, queue_type 필드 자체가 없어져서 selected_game(자유 텍스트가
 * 아니라 party_game_presets 자동완성으로 고른 값) 하나만으로 "어떤 게임이 제일 많이 모집되는지"
 * 랭킹을 낸다. 그래도 대소문자/공백 차이로 흩어지는 걸 막기 위해 trim+소문자로 정규화해서 묶는 건
 * 동일하다(관리자가 프리셋을 대소문자만 다르게 여러 개 만든 경우 대비).
 *
 * selected_game이 없는(게임 미지정 캐주얼) 모집은 "어떤 게임이 인기있는지" 랭킹 대상이 아니므로
 * topGames 집계에서 제외한다 - 다만 totalCount(이번 주 전체 모집 건수)에는 여전히 포함된다.
 */
export function computeWeeklyStats(rows: RecruitmentRow[], topN: number = 5): WeeklyStats {
  const groups = new Map<string, GameFrequencyStat>();
  for (const row of rows) {
    const game = (row.selected_game || '').trim();
    if (!game) continue;
    const key = normalizeGameKey(game);
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, { game_name: game, count: 1 });
    }
  }

  const topGames = Array.from(groups.values()).sort((a, b) => b.count - a.count).slice(0, topN);
  return { totalCount: rows.length, topGames };
}

export interface VerificationRow {
  user_id: string;
  tier: string | null;
  verified_at: string;
}

/**
 * SQL의 `DISTINCT ON (user_id) ORDER BY verified_at DESC`와 동일한 결과를 낸다 - PostgREST는
 * DISTINCT ON을 지원하지 않아 여기서 처리한다. riot_verifications는 upsert(on_conflict=
 * guild_id,user_id)라 이미 유저당 1행이 보장되지만, 스키마가 바뀌거나 레이스로 중복이 생겨도
 * 항상 최신 인증만 분포에 반영되도록 방어적으로 다시 거른다.
 */
export function pickLatestTierPerUser(rows: VerificationRow[]): VerificationRow[] {
  const latestByUser = new Map<string, VerificationRow>();
  for (const row of rows) {
    const existing = latestByUser.get(row.user_id);
    if (!existing || new Date(row.verified_at).getTime() > new Date(existing.verified_at).getTime()) {
      latestByUser.set(row.user_id, row);
    }
  }
  return Array.from(latestByUser.values());
}

export interface TierDistributionEntry {
  tier: string;
  count: number;
}

export function computeTierDistribution(rows: VerificationRow[]): TierDistributionEntry[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const tier = (row.tier || '').trim();
    if (!tier) continue;
    counts.set(tier, (counts.get(tier) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([tier, count]) => ({ tier, count }));
}

export interface DataSufficiency {
  isEmpty: boolean;
  isSparse: boolean;
}

/** 그래프를 억지로 그리지 않고, 데이터가 없거나 적을 때 정직하게 알리기 위한 판정.
 * 0건이면 완전히 숨기고 안내 문구로 대체하고, 1~4건이면 실데이터는 그대로 보여주되
 * 참고용이라는 caveat를 붙인다(데이터를 숨기는 것보다 그게 더 정직하다는 판단). */
export function resolveDataSufficiency(totalCount: number): DataSufficiency {
  return {
    isEmpty: totalCount === 0,
    isSparse: totalCount > 0 && totalCount < PARTY_STATS_SPARSE_THRESHOLD,
  };
}
