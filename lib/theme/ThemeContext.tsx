'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { THEME_COOKIE_NAME, type Theme } from './index';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * lib/i18n/LanguageContext.tsx와 같은 구조(서버가 미리 계산한 initialTheme을 useState 초깃값으로
 * 받아 첫 렌더부터 정확한 테마, 깜빡임 없음)를 재사용한다. 다만 언어와 달리 테마는 서버 컴포넌트가
 * 다른 텍스트를 렌더링하는 게 아니라 순수 CSS 변수 값만 바뀌는 거라, setTheme()이
 * router.refresh()를 호출할 필요가 없다 - document.documentElement의 data-theme 속성만 즉시
 * 바꾸면 CSS가 알아서 새 변수 값을 적용한다(app/globals.css의 [data-theme="light"] 오버라이드).
 */
export function ThemeProvider({ initialTheme, children }: { initialTheme: Theme; children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.cookie = `${THEME_COOKIE_NAME}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.setAttribute('data-theme', next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() must be used within a ThemeProvider');
  return ctx;
}
