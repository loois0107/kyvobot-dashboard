// cogs/giveaway.py의 GIVEAWAY_MIN_DURATION_MINUTES/GIVEAWAY_MAX_DURATION_MINUTES/
// GIVEAWAY_PRIZE_MAX_LENGTH와 반드시 일치해야 한다 - levelingEconomySettings.ts와 동일한 이유
// (여기서 통과시킨 값이 봇 쪽 한계와 어긋나면 대시보드는 저장 성공으로 보이는데 봇이 authoritative
// 검증에서 거부하는 혼란스러운 불일치가 생긴다). API 라우트와 페이지 폼이 이 값 하나를 공유한다.
export const GIVEAWAY_MIN_DURATION_MINUTES = 5;
export const GIVEAWAY_MAX_DURATION_MINUTES = 10080; // 7일
export const GIVEAWAY_PRIZE_MAX_LENGTH = 100;
