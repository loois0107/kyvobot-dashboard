// cogs/twitch.py의 TWITCH_POLL_INTERVAL_MINUTES(5)와 동일한 값 - 여기 정본은 봇 쪽이고
// 이건 표시용 복제. 배지는 "웹훅이 살아있는가"가 아니라 "5분 폴링 안전망이 최근에 돌았는가"를
// 측정한다 (last_checked_at은 폴링 루프가 매 사이클 끝에 갱신하는 값) - 실제 EventSub 구독
// 상태 자체를 확인하려면 트위치에 직접 물어보는 라이브 체크가 별도로 필요하다(2단계, 아직 미구현).
export const POLL_INTERVAL_MINUTES = 5;

export type PollHealthStatus = 'healthy' | 'warning' | 'stale' | 'pending';

export interface PollHealthResult {
  status: PollHealthStatus;
  minutesSinceLastCheck: number | null;
}

/**
 * last_checked_at(ISO 문자열 또는 null)을 기준으로 폴링 안전망의 건강 상태를 계산한다.
 * - null -> pending (등록 직후, 첫 폴링 사이클을 아직 못 돈 상태)
 * - 10분 이내(폴링 주기의 2배 마진) -> healthy
 * - 10~30분 -> warning (일시적 다운/재배포 중일 수 있음)
 * - 30분 초과 -> stale (폴링 루프가 멈춘 것으로 판단)
 */
export function computePollHealth(lastCheckedAt: string | null | undefined, now: Date = new Date()): PollHealthResult {
  if (!lastCheckedAt) {
    return { status: 'pending', minutesSinceLastCheck: null };
  }

  const lastChecked = new Date(lastCheckedAt);
  if (Number.isNaN(lastChecked.getTime())) {
    return { status: 'pending', minutesSinceLastCheck: null };
  }

  const minutesSince = (now.getTime() - lastChecked.getTime()) / (60 * 1000);

  if (minutesSince < 0) {
    // 시계 오차 등으로 미래 시각이 와도 크래시하지 않고 healthy로 취급 (방어적)
    return { status: 'healthy', minutesSinceLastCheck: 0 };
  }
  if (minutesSince <= POLL_INTERVAL_MINUTES * 2) {
    return { status: 'healthy', minutesSinceLastCheck: minutesSince };
  }
  if (minutesSince <= 30) {
    return { status: 'warning', minutesSinceLastCheck: minutesSince };
  }
  return { status: 'stale', minutesSinceLastCheck: minutesSince };
}

export type RoleGrantStatus = 'not_configured' | 'incomplete' | 'configured';

/**
 * cogs/twitch.py의 _fanout_online/_fanout_offline은 member_id와 live_role_id가 "둘 다" 있어야만
 * 실제로 역할을 지급/회수한다(twitch.py:533-534,541). /twitch_channel_set은 role만 있고 member가
 * 없는 조합은 막지만(twitch.py:216-219), member만 있고 role이 없는 조합은 막지 않는다 - 그 상태로
 * 저장되면 대시보드가 "Role Grant Target: {멤버}"만 보여줘서 역할이 지급되는 것처럼 보이지만 실제로는
 * 아무 일도 안 일어난다. 이 함수가 그 반쪽 상태를 명시적으로 구분한다.
 */
export function computeRoleGrantStatus(memberId: string | null, liveRoleId: string | null): RoleGrantStatus {
  const hasMember = !!memberId;
  const hasRole = !!liveRoleId;
  if (!hasMember && !hasRole) return 'not_configured';
  if (hasMember !== hasRole) return 'incomplete';
  return 'configured';
}
