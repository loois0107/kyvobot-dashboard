import en from './en';
import ko from './ko';

export type Lang = 'ko' | 'en';

export const COOKIE_NAME = 'kyvo_lang';

export const dictionaries: Record<Lang, typeof en> = { en, ko };

// en 사전 구조에서 "a.b.c" 형태의 모든 경로를 뽑아내는 타입 - useT('sidebar.selectServer')가
// 오타 없이 자동완성되고, 존재하지 않는 키는 컴파일 타임에 바로 잡힌다.
type Paths<T, Prefix extends string = ''> = T extends string
  ? Prefix
  : { [K in keyof T & string]: Paths<T[K], `${Prefix}${Prefix extends '' ? '' : '.'}${K}`> }[keyof T & string];

export type TranslationKey = Paths<typeof en>;

export function getByPath(dict: unknown, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[segment];
    }
    return undefined;
  }, dict);
  return typeof value === 'string' ? value : undefined;
}

/**
 * 디스코드가 실제로 내려주는 locale 문자열(예: "ko", "en-US", "ja")을 우리 Lang으로 매핑한다.
 * 한국어("ko")만 인식하고, 그 외 전부(영어 변형 포함) 영어로 폴백한다 - 명시적 요구사항.
 * Discord의 공식 로케일 목록엔 "ko" 하나만 있고 "ko-KR" 같은 변형은 존재하지 않는다
 * (discord.py의 discord.Locale enum으로 실측 확인함).
 */
export function mapDiscordLocaleToLang(discordLocale: string | null | undefined): Lang {
  return discordLocale === 'ko' ? 'ko' : 'en';
}

/**
 * 초기 언어 결정 순서: 쿠키(유저가 명시적으로 고른 값) -> 디스코드 계정 locale 추정 -> 영어 기본값.
 * 서버 컴포넌트(app/layout.tsx)에서 호출해서 첫 렌더부터 올바른 언어로 그리기 위함 -
 * 클라이언트에서 뒤늦게 언어가 바뀌는 깜빡임(FOUC)을 없앤다.
 */
export function resolveInitialLanguage(cookieValue: string | undefined, discordLocale: string | null | undefined): Lang {
  if (cookieValue === 'ko' || cookieValue === 'en') return cookieValue;
  return mapDiscordLocaleToLang(discordLocale);
}
