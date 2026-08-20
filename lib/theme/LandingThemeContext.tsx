'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { LANDING_THEME_COOKIE_NAME, type Theme } from './index';

interface LandingThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const LandingThemeContext = createContext<LandingThemeContextValue | null>(null);

/**
 * 🛡️ [ThemeContext.tsx와 별개 - html에 안 씀] 대시보드용 ThemeProvider는 <html data-theme>를
 * 전역으로 바꾼다(사이트 전체가 그 값 하나를 공유). 랜딩은 그 값과 완전히 독립적이어야 하므로,
 * <html>을 건드리지 않고 이 Provider 자신이 렌더링하는 wrapper div에만 data-theme을 얹는다 -
 * CSS 커스텀 프로퍼티는 어떤 요소에 붙어도 그 서브트리로 정상 캐스케이드되므로(app/globals.css의
 * [data-theme='light'] 규칙이 <html> 전용이 아니라 그냥 속성 선택자다), <html>이 dark여도 이
 * div 밑에서는 항상 이 Provider가 관리하는 값이 이긴다. setTheme도 document.documentElement가
 * 아니라 이 컴포넌트의 리액트 상태만 바꾸면 되고(JSX가 반응형으로 data-theme을 다시 그림),
 * 쿠키 이름도 kyvo_landing_theme으로 대시보드와 분리한다.
 */
export function LandingThemeProvider({
  initialTheme,
  className,
  children,
}: {
  initialTheme: Theme;
  className?: string;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.cookie = `${LANDING_THEME_COOKIE_NAME}=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <LandingThemeContext.Provider value={value}>
      <div data-theme={theme} className={className}>
        {children}
      </div>
    </LandingThemeContext.Provider>
  );
}

export function useLandingTheme(): LandingThemeContextValue {
  const ctx = useContext(LandingThemeContext);
  if (!ctx) throw new Error('useLandingTheme() must be used within a LandingThemeProvider');
  return ctx;
}
