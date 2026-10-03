/**
 * 🛡️ [랜딩 전용 쿠키 - kyvo_lang/kyvo_landing_theme과 동일 패턴] 대시보드 온보딩 배너
 * (app/dashboard/[guildId]/page.tsx)는 길드별 Supabase 컬럼(onboarding_dismissed)에
 * dismiss 상태를 저장하지만, 이 배너는 로그인/길드 컨텍스트가 없는 공개 랜딩 페이지에
 * 뜨므로 그 방식을 쓸 수 없다 - lib/theme/index.ts의 LANDING_THEME_COOKIE_NAME과 같은
 * 단순 쿠키 방식을 그대로 재사용한다.
 */
export const WHATS_NEW_BANNER_COOKIE_NAME = 'kyvo_whatsnew_dismissed';

export function resolveWhatsNewBannerDismissed(cookieValue: string | undefined): boolean {
  return cookieValue === '1';
}
