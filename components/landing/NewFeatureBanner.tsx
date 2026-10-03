'use client';

import Link from 'next/link';
import { useLanguage, useT } from '@/lib/i18n/LanguageContext';
import BetaBadge from '@/components/ui/BetaBadge';

// 🛡️ [dismiss(✕) 버튼 제거 - 유일한 진입점] /whats-new로 가는 링크가 사이트 전체에서 이 배너
// 하나뿐이다(헤더/푸터 어디에도 없음, 실측 확인) - dismiss로 닫고 나면 쿠키가 영구히 남아
// 사용자가 /whats-new에 다시 들어갈 방법이 아예 사라지는 문제가 실제로 보고됐다. 닫기
// 자체를 없애 항상 보이게 한다 - 쿠키 영속 로직(lib/newFeatureBanner.ts)도 더 이상 쓸 곳이
// 없어져서 같이 제거했다.
export default function NewFeatureBanner() {
  const t = useT();
  const { lang } = useLanguage();

  return (
    <div className="relative z-10 mt-6 mx-4 sm:mx-6 lg:max-w-7xl lg:mx-auto">
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
