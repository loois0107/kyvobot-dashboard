/**
 * cogs/giveaway.py의 _replace_winner는 role_note(역할 상품은 원 당첨자 역할을 자동 회수하지
 * 않음)와 payout_ok(새 당첨자에게 실제로 상품이 전달됐는지)를 서로 독립적으로 반환한다 -
 * payout_ok는 False가 될 수 있는데(포인트 지급 저장 실패, 역할 삭제됨/봇 권한·위계 문제/새
 * 당첨자가 이미 서버를 나감 등, giveaway.py:547-572,663-667) 예전엔 프론트가 이 필드를 아예
 * 안 보고 role_note만으로 성공 토스트를 띄웠다 - 교체 기록은 저장되고 발표 채널 공지까지
 * 올라갔는데 실제로는 상품이 전달 안 된 경우를 관리자가 알 방법이 없었다.
 */
export function buildReplaceWinnerToastMessage(
  roleNote: boolean,
  payoutOk: boolean | null | undefined,
  roleLabel: string | null
): string {
  const payoutFailed = payoutOk === false;

  if (!payoutFailed && !roleNote) {
    return 'Winner replaced successfully.';
  }

  const sentences: string[] = [];
  if (payoutFailed) {
    sentences.push("Winner replaced, but the prize couldn't be delivered automatically - check server logs and grant it manually if needed.");
  } else {
    sentences.push('Winner replaced.');
  }
  if (roleNote) {
    sentences.push(`Remember to manually remove the "${roleLabel || 'prize'}" role from the original winner if appropriate.`);
  }
  return sentences.join(' ');
}

/** payout_ok===false면 관리자가 놓치지 않도록 error 스타일 토스트를 쓴다 - role_note만 있는
 * 경우(정상 흐름의 일부)는 기존처럼 success 유지. */
export function replaceWinnerToastType(payoutOk: boolean | null | undefined): 'success' | 'error' {
  return payoutOk === false ? 'error' : 'success';
}
