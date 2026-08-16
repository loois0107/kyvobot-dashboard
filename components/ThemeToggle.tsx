'use client';

import { useTheme } from '@/lib/theme/ThemeContext';
import { useT } from '@/lib/i18n/LanguageContext';

// LanguageToggle.tsx와 같은 자리(헤더)에 나란히 놓이는 짝 컴포넌트라 크기/모양(rounded-full
// px-3 py-1.5 text-xs font-black)을 그대로 맞췄다 - 다만 상태가 2개뿐(dark/light)이라 드롭다운이
// 아니라 클릭 한 번으로 바로 전환되는 단일 토글 버튼이다. 색상은 LanguageToggle처럼 하드코딩된
// hex가 아니라 디자인 토큰(bg-elevated 등)을 쓴다 - 이 컴포넌트 자체가 라이트/다크 양쪽에서 다
// 정상으로 보여야 하는 게 존재 이유라, 토큰을 안 쓰면 자기 목적을 스스로 어기게 된다.
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
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
