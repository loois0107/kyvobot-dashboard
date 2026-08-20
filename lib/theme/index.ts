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

/**
 * 🛡️ [랜딩/가이드 전용 쿠키 - 대시보드와 완전 분리] kyvo_theme(대시보드, 기본 dark)와 이름부터
 * 다른 별도 쿠키를 쓴다 - 대시보드에서 고른 다크/라이트가 랜딩에 새어 들어오거나 그 반대가
 * 일어나면 "관리자 도구"와 "마케팅 페이지"라는 서로 다른 맥락의 취향이 뒤섞인다. 기본값도
 * 반대(light)다 - 대시보드는 도구성 화면이라 다크가 기본이지만, 랜딩은 LINK류 마케팅
 * 사이트처럼 밝은 톤이 첫인상 기본이어야 한다는 이번 요청의 전제.
 */
export const LANDING_THEME_COOKIE_NAME = 'kyvo_landing_theme';

export function resolveInitialLandingTheme(cookieValue: string | undefined): Theme {
  return cookieValue === 'dark' ? 'dark' : 'light';
}
