export type Theme = 'dark' | 'light';

export const THEME_COOKIE_NAME = 'kyvo_theme';

/**
 * 초기 테마 결정: 쿠키(유저가 명시적으로 고른 값)만 본다. 언어처럼 대체할 2차 신호(Discord
 * locale 같은)가 없고, 기본값은 항상 dark다 - 쿠키가 없거나 'light'가 아니면 무조건 dark.
 * app/layout.tsx(서버 컴포넌트)에서 호출해서 <html data-theme>에 SSR로 반영 - 클라이언트에서
 * 뒤늦게 테마가 바뀌는 깜빡임(FOUC)을 없앤다. lib/i18n/index.ts의 resolveInitialLanguage()와
 * 동일한 역할을 하는 테마 버전.
 */
export function resolveInitialTheme(cookieValue: string | undefined): Theme {
  return cookieValue === 'light' ? 'light' : 'dark';
}
