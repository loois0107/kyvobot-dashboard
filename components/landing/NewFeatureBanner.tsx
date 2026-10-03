'use client';

import { useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useLanguage, useT } from '@/lib/i18n/LanguageContext';
import { WHATS_NEW_BANNER_COOKIE_NAME } from '@/lib/newFeatureBanner';
import BetaBadge from '@/components/ui/BetaBadge';

type NewFeatureBannerProps = {
  initialDismissed: boolean;
};

// 🛡️ [박스 제거 - 배경 위에 바로 얹는 형태] 카드(border/bg/rounded) 컨테이너를 걷어내고 텍스트가
// 페이지 배경 위에 직접 놓이도록 바꿨다 - "모든 걸 박스에 가두는 패턴" 피드백. dismiss(✕) 버튼
// 위치를 잡기 위한 relative 컨테이너만 남기고, 시각적 박스(배경색/보더/모서리)는 전부 뺐다.
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
    <div className="relative z-10 mt-6 mx-4 sm:mx-6 lg:max-w-7xl lg:mx-auto">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('newFeatureBanner.dismissLabel')}
        className="absolute top-0 right-0 sm:top-2 sm:right-2 z-10 text-text-secondary hover:text-text-primary transition-colors text-xl leading-none"
      >
        ✕
      </button>
      <Link href="/whats-new" className="block py-6 sm:py-10 md:py-14 text-center">
        <BetaBadge label={t('newFeatureBanner.betaBadgeLabel')} className="mb-4" />
        {/* 🛡️ ["신기능" 강조 - 같은 헤드라인 안에서 색으로만 구분] 작은 프리픽스 줄을 따로 안
            두고, 요청하신 예시("🎬 신기능 AI가...")처럼 한 헤드라인 안에 이어 붙이되
            "🎬 신기능" 부분만 강조색(warning-border)으로 분리해 눈에 띄게 한다. */}
        <div
          className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-wide leading-tight ${lang === 'ko' ? 'break-keep' : ''}`}
        >
          <span className="text-warning-border">{t('newFeatureBanner.newFeatureLabel')}</span>{' '}
          <span className="text-text-primary">{t('newFeatureBanner.text')}</span>
        </div>
        <div className="mt-4 text-sm md:text-base font-bold text-text-secondary">
          {t('newFeatureBanner.ctaLabel')} →
        </div>
      </Link>
    </div>
  );
}
