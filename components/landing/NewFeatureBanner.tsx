'use client';

import { useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n/LanguageContext';
import { WHATS_NEW_BANNER_COOKIE_NAME } from '@/lib/newFeatureBanner';

type NewFeatureBannerProps = {
  initialDismissed: boolean;
};

// 🛡️ [app/dashboard/[guildId]/page.tsx:204-227 Quick Start 배너 패턴 참고] 제목/본문 영역과
// dismiss(✕) 버튼을 형제 요소로 나란히 두는 구조를 그대로 가져왔다 - Link 안에 button을 중첩시키면
// (인터랙티브 요소 중첩) 접근성/이벤트 버블링이 불안정해지므로, 클릭 가능한 Link와 dismiss 버튼을
// 같은 flex row의 형제로 둔다. 영속은 길드별 Supabase 컬럼 대신 랜딩 전용 쿠키(kyvo_lang/
// kyvo_landing_theme과 동일 패턴, lib/newFeatureBanner.ts)로 처리한다 - 로그인 없이도 보이는
// 공개 배너라 길드 컨텍스트 자체가 없다.
export default function NewFeatureBanner({ initialDismissed }: NewFeatureBannerProps) {
  const t = useT();
  const [dismissed, setDismissed] = useState(initialDismissed);

  if (dismissed) return null;

  const handleDismiss = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDismissed(true);
    document.cookie = `${WHATS_NEW_BANNER_COOKIE_NAME}=1; path=/; max-age=31536000; SameSite=Lax`;
  };

  return (
    <div className="relative z-10 mt-4 mx-4 sm:mx-6 lg:max-w-7xl lg:mx-auto flex items-center justify-center gap-3 rounded-2xl border border-border-default bg-bg-surface hover:border-border-hover transition-colors px-5 py-3">
      <Link href="/whats-new" className="flex-1 text-center text-sm font-bold text-text-primary">
        {t('newFeatureBanner.text')}
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('newFeatureBanner.dismissLabel')}
        className="shrink-0 text-text-secondary hover:text-text-primary transition-colors text-lg leading-none"
      >
        ✕
      </button>
    </div>
  );
}
