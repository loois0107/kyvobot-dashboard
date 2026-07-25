export const PARTY_HISTORY_LIMIT = 50;

export interface PartyRecruitmentRow {
  id: number;
  guild_id: string;
  leader_id: string;
  queue_type: string;
  lanes: string | null;
  selected_game: string | null;
  status: string;
  created_at: string;
}

export interface PartyHistoryEntry extends PartyRecruitmentRow {
  role: 'leader' | 'participant';
}

/**
 * party_participants 기준 조회 결과와 leader_id 직접 조회 결과를 합쳐서 id 기준 중복을
 * 제거하고 역할(leader/participant)을 계산한다. 리더는 handle_recruitment_submit에서 항상
 * 참가자로도 자동 등록되지만, 그 INSERT가 실패하는 예외 케이스(try/except로 감싸져 있어
 * 실패해도 모집 자체는 만들어짐)를 놓치지 않기 위해 두 쿼리를 각각 조회해서 병합한다.
 * leader_id 직접 조회 쪽이 항상 더 신뢰할 수 있는 소스라 role 판정에서 우선한다.
 * 최신순 정렬 + 개수 상한까지 이 함수에서 끝낸다 - 순수 함수라 실제 DB 없이 단독 테스트 가능.
 */
export function mergePartyHistory(
  participantRecruitments: PartyRecruitmentRow[],
  leaderRecruitments: PartyRecruitmentRow[],
  userId: string,
  limit: number = PARTY_HISTORY_LIMIT
): PartyHistoryEntry[] {
  const byId = new Map<number, PartyHistoryEntry>();

  for (const row of participantRecruitments) {
    byId.set(row.id, { ...row, role: row.leader_id === userId ? 'leader' : 'participant' });
  }
  for (const row of leaderRecruitments) {
    byId.set(row.id, { ...row, role: 'leader' });
  }

  return Array.from(byId.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}
