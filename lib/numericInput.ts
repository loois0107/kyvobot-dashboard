/**
 * 🛡️ [숫자 입력 필드 leading zero 버그 공용 수정] type="number" 필드를 number state에 직접
 * 바인딩하고 onChange마다 parseInt(e.target.value) || 0으로 즉시 강제 변환하던 게 원인이었다 -
 * 필드를 전체 지우면 빈 문자열이 순간적으로 0이 되고(controlled input이라 리액트가 필드에 "0"을
 * 강제로 다시 그림), 그 직후 입력한 숫자가 그 0 뒤에 그대로 이어붙어 "15"를 치려 해도 "015"가
 * 됐다(automod/leveling/party-settings 9곳에서 실측 재현 확인됨).
 *
 * 표준 수정 패턴: state를 number가 아니라 string으로 갖고 입력 중엔 아무 가공 없이 그대로
 * 반영한다(그래서 지우면 진짜 빈 칸으로 보임) - 이 두 헬퍼는 blur 시점(표시 정규화)과 저장
 * 시점(실제 전송값 변환)에만 쓴다. 범위(min/max) 검증은 여기서 하지 않는다 - 서버가 이미
 * "조용히 clamp하지 않고 명확히 거부"하는 정책(lib/automodSettings.ts 등)을 갖고 있어서,
 * 클라이언트가 같은 값을 다시 clamp하면 그 정책과 어긋난다.
 */

/** blur 시점: 빈 칸은 빈 칸으로 유지하고, 유효한 숫자는 정규화된 문자열로(예: "007" -> "7"). */
export function normalizeNumericFieldOnBlur(raw: string): string {
  if (raw.trim() === '') return '';
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? String(parsed) : '';
}

/** 저장 시점: 서버로 보낼 실제 숫자값. 빈 칸/파싱 불가는 0 - 기존 payload 계약과 동일하게
 * 유지해서(서버가 범위 검증으로 걸러냄), 이번 수정이 저장 동작 자체는 안 바꾸게 한다. */
export function parseNumericFieldValue(raw: string): number {
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
