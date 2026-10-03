'use client';

import { useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useLanguage, useT } from '@/lib/i18n/LanguageContext';
import { WHATS_NEW_BANNER_COOKIE_NAME } from '@/lib/newFeatureBanner';
import Badge from '@/components/ui/Badge';

type NewFeatureBannerProps = {
  initialDismissed: boolean;
};

// 🛡️ [히어로급 크기로 확대] 예전엔 app/dashboard/[guildId]/page.tsx의 Quick Start 배너처럼
// 작은 공지 바(text-sm, px-5 py-3) 느낌이었는데, "히어로 섹션급으로 눈에 띄게" 요청으로 폰트
// 2~3배(text-2xl~5xl)+패딩을 대폭 키운 카드형으로 바꿨다. 커진 만큼 dismiss(✕) 버튼을 텍스트와
// 같은 줄의 형제 요소로 두면 세로 중앙 정렬이 어색해져서, 카드 우상단에 절대 위치로 뗐다 -
// Link 안에 button을 중첩시키면(인터랙티브 요소 중첩) 접근성/이벤트 버블링이 불안정해지므로
// 여전히 형제 요소 구조(Link와 button이 같은 relative 컨테이너의 자식)는 유지한다. 영속은
// 길드별 Supabase 컬럼 대신 랜딩 전용 쿠키(kyvo_lang/kyvo_landing_theme과 동일 패턴,
// lib/newFeatureBanner.ts)로 처리한다 - 로그인 없이도 보이는 공개 배너라 길드 컨텍스트 자체가
// 없다.
export default function NewFeatureBanner({ initialDismissed }: NewFeatureBannerProps) {
  const t = useT();
  const { lang } = useLanguage();
  const [dismissed, setDismissed] = useState(initialDismissed);

  if (dismissed) return null;

  const handleDismiss = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDismissed(true);
    document.cookie = `${WHATS_NEW_BANNER_COOKIE_NAME}=1; path=/; max-age=31536000; SameSite=Lax`;
  };

  return (
    <div className="relative z-10 mt-4 mx-4 sm:mx-6 lg:max-w-7xl lg:mx-auto rounded-3xl border-2 border-border-default bg-gradient-to-br from-bg-surface to-bg-elevated hover:border-border-hover transition-colors overflow-hidden">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('newFeatureBanner.dismissLabel')}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 text-text-secondary hover:text-text-primary transition-colors text-xl leading-none"
      >
        ✕
      </button>
      <Link href="/whats-new" className="block px-6 py-10 sm:py-14 md:py-16 text-center">
        <Badge variant="warning" className="!text-xs mb-4">
          {t('newFeatureBanner.betaBadgeLabel')}
        </Badge>
        <div
          className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-wide text-text-primary leading-tight ${lang === 'ko' ? 'break-keep' : ''}`}
        >
          {t('newFeatureBanner.text')}
        </div>
        <div className="mt-4 text-sm md:text-base font-bold text-text-secondary">
          {t('newFeatureBanner.ctaLabel')} →
        </div>
      </Link>
    </div>
  );
}
