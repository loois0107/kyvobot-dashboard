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
        {/* 🛡️ ["신기능"을 검은색 별 장식 프리픽스로, "베타"는 헤드라인 끝에 영어로] 예전엔
            위에 작은 빨간 "(베타)" 배지가 따로 있고 헤드라인 안에 "(신기능)"이 끼어있는
            구조였는데, 역할을 맞바꿨다 - "신기능"을 별 두 개로 감싼 눈에 띄는 프리픽스로
            올리고(검은색, 헤드라인과 거의 붙는 간격만), "베타"는 문장 끝("만들어드려요!" 옆)에
            영어 "(BETA)"로 고정 - 언어와 무관하게 항상 영어로 쓰고 빨간색만 유지한다(요청
            그대로, i18n 번역 대상이 아님 - BetaBadge에 리터럴 "BETA"를 직접 넘긴다). */}
        <div
          className={`text-sm md:text-base font-black tracking-widest text-text-primary mb-1 ${lang === 'ko' ? 'break-keep' : ''}`}
        >
          {t('newFeatureBanner.newFeatureLabel')}
        </div>
        <div
          className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-wide leading-tight text-text-primary ${lang === 'ko' ? 'break-keep' : ''}`}
        >
          {t('newFeatureBanner.text')}{' '}
          <BetaBadge label="BETA" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl align-middle" />
        </div>
        <div className="mt-4 text-sm md:text-base font-bold text-text-secondary">
          {t('newFeatureBanner.ctaLabel')} →
        </div>
      </Link>
    </div>
  );
}
