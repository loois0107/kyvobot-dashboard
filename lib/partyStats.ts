export const PARTY_STATS_WINDOW_DAYS = 7;
export const PARTY_STATS_SPARSE_THRESHOLD = 5;
export const PARTY_STATS_CACHE_TTL_SECONDS = 3600;

export interface RecruitmentRow {
  queue_type: string | null;
  lanes: string | null;
  created_at: string;
}

export interface QueueComboStat {
  queue_type: string;
  lanes: string;
  count: number;
}

export interface WeeklyStats {
  totalCount: number;
  topCombos: QueueComboStat[];
}

function normalizeComboKey(queueType: string | null, lanes: string | null): string {
  const q = (queueType || '').trim().toLowerCase();
  const l = (lanes || '').trim().toLowerCase();
  return `${q}|${l}`;
}

/**
 * queue_type/lanes는 자유 텍스트라(디스코드 모달은 select choices를 지원 안 함) 대소문자/공백
 * 차이로 같은 조합이 서로 다른 항목으로 흩어지는 걸 막기 위해 trim+소문자로 정규화해서 묶는다.
 * 화면에 보여줄 라벨은 그 그룹에서 최초로 본 원본 표기를 그대로 쓴다.
 */
export function computeWeeklyStats(rows: RecruitmentRow[], topN: number = 5): WeeklyStats {
  const groups = new Map<string, QueueComboStat>();
  for (const row of rows) {
    const key = normalizeComboKey(row.queue_type, row.lanes);
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, {
        queue_type: (row.queue_type || '').trim(),
        lanes: (row.lanes || '').trim(),
        count: 1,
      });
    }
  }

  const topCombos = Array.from(groups.values()).sort((a, b) => b.count - a.count).slice(0, topN);
  return { totalCount: rows.length, topCombos };
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
