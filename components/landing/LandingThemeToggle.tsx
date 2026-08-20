'use client';

import { useLandingTheme } from '@/lib/theme/LandingThemeContext';
import { useT } from '@/lib/i18n/LanguageContext';

// 🛡️ [ThemeToggle.tsx와 시각적으로 동일, 연결된 상태만 다름] 대시보드용 ThemeToggle과 똑같은
// 모양(rounded-full px-3 py-1.5 text-xs font-black)을 그대로 재사용해 두 곳의 토글이 같은
// 컴포넌트처럼 보이게 했다 - 다만 이건 useLandingTheme()(kyvo_landing_theme 쿠키)에 연결되어
// 있어서, 대시보드 쪽 다크/라이트 상태와는 완전히 독립적으로 움직인다.
export default function LandingThemeToggle() {
  const { theme, setTheme } = useLandingTheme();
  const t = useT();
  const isDark = theme === 'dark';
  const label = isDark ? t('sidebar.switchToLightMode') : t('sidebar.switchToDarkMode');

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className="flex items-center gap-1.5 bg-bg-elevated hover:bg-bg-elevated/70 border border-border-default rounded-full px-3 py-1.5 text-xs font-black tracking-wider text-text-primary transition-colors"
    >
      <span>{isDark ? '🌙' : '☀️'}</span>
    </button>
  );
}
