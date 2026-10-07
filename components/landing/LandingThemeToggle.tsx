'use client';

import { Moon, Sun } from 'lucide-react';
import { useLandingTheme } from '@/lib/theme/LandingThemeContext';
import { useT } from '@/lib/i18n/LanguageContext';

// 🛡️ [원형 배지 제거 + 이모지 -> 색 없는 lucide 아이콘] 예전엔 ThemeToggle.tsx와 똑같은
// rounded-full 배지 모양에 🌙/☀️ 이모지를 썼는데, "원 없애고 해/달 모양 색깔 빼줘"라는
// 피드백으로 바뀌었다 - 이모지는 고유색이 박혀 있어 CSS로 탈색이 안 되므로(글리프 자체가
// 컬러) lucide-react의 Sun/Moon(stroke="currentColor" SVG)으로 교체해야 토큰 색(text-
// secondary/text-primary)을 그대로 입힐 수 있다. 배지 배경(bg-bg-elevated)/테두리/
// rounded-full/padding도 전부 제거해 순수 아이콘만 남겼다.
// 🛡️ [헤더 다크 고정은 롤백, 아이콘은 키움] 헤더 배경을 항상 다크로 고정하는 시도는
// 되돌렸다(색상은 다시 페이지 테마를 따라가는 bg-bg-surface) - 대신 "토글이 너무 작다"는
// 피드백으로 아이콘을 w-4(16px) -> w-6(24px)로 키웠다.
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
      className="p-1.5 text-text-secondary hover:text-text-primary transition-colors"
    >
      {isDark ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
    </button>
  );
}
