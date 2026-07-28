'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { COOKIE_NAME, dictionaries, getByPath, type Lang, type TranslationKey } from './index';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * initialLang은 서버(app/layout.tsx)에서 쿠키/디스코드 locale로 미리 계산해서 내려준다 -
 * 클라이언트에서 useState 초깃값으로 그대로 쓰므로 첫 렌더부터 올바른 언어이고 깜빡임이 없다.
 */
export function LanguageProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const router = useRouter();

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    // 🛡️ 이 쿠키는 UI 취향 하나만 담는 비민감 정보라 httpOnly가 필요 없다 - 클라이언트에서
    // 즉시 써야 다음 새로고침/새 탭에서도 서버가 바로 올바른 언어로 렌더링할 수 있다.
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    // 🛡️ 서버 컴포넌트(예: 랜딩 페이지 app/page.tsx)는 이 쿠키를 요청 시점에 한 번만 읽으므로,
    // 클라이언트 state만 바꿔서는 다시 그려지지 않는다 - router.refresh()로 현재 라우트의 서버
    // 컴포넌트를 방금 쓴 새 쿠키로 다시 가져오게 만든다. 클라이언트 state(이 lang 포함)나 스크롤
    // 위치는 유지되고 풀 리로드가 아니라서 깜빡임도 없다.
    router.refresh();
  }, [router]);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage() must be used within a LanguageProvider');
  return ctx;
}

/**
 * t('sidebar.selectServer') 형태로 조회한다. 현재 언어 사전에 키가 없으면 영어로, 그마저
 * 없으면(있을 수 없지만 방어적으로) 키 문자열 자체를 그대로 보여준다 - 절대 크래시하지 않는다.
 * vars로 {name} 같은 자리표시자를 치환한다(봇 쪽 locales/*.json과 동일한 문법).
 */
export function useT() {
  const { lang } = useLanguage();

  return useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      const raw = getByPath(dictionaries[lang], key) ?? getByPath(dictionaries.en, key) ?? key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
    },
    [lang]
  );
}
