'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import AccountMenu from '@/components/AccountMenu';

type LandingHeaderProps = {
  dashboardHref: string | null;
};

// 🛡️ [고정 다크] 랜딩/가이드는 관리자 대시보드와 달리 다크/라이트 토글이 없는 마케팅 페이지라 -
// bg-bg-base 같은 반응형 토큰 클래스 대신 다크 팔레트의 리터럴 hex를 직접 쓴다(관리자 대시보드가
// 라이트로 설정돼 있어도 이 페이지는 항상 다크). AccountMenu/LanguageToggle은 대시보드와 공유하는
// 컴포넌트라 반응형 토큰을 그대로 쓰고 있어서, 라이트 쿠키가 남아있으면 그 두 드롭다운만 밝게
// 보일 수 있다 - 의도된 동작이다(공유 컴포넌트를 랜딩 전용으로 분기하지 않기로 함).
export default function LandingHeader({ dashboardHref }: LandingHeaderProps) {
  const t = useT();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="relative z-20 mt-6 mx-4 sm:mx-6 lg:max-w-7xl lg:mx-auto rounded-2xl border border-[#676771] bg-[#141416] flex items-center justify-between gap-3 px-6 sm:px-8 py-4 sm:py-5">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-wide">
          <span className="w-8 h-8 rounded-lg bg-[#000000] border border-[#FFFFFF] flex items-center justify-center text-sm text-white">
            K
          </span>
          <span className="bg-gradient-to-r from-white via-[#c7cdfd] to-[#5865F2] bg-clip-text text-transparent">
            {t('landingPage.heroTitle')}
          </span>
        </Link>
        {/* 🛡️ "기능"은 /guide 등 다른 페이지에서도 눌릴 수 있어 Link href="/#features"로 - 랜딩
            페이지로 이동 후 해당 섹션까지 스크롤된다. */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/#features" className="text-sm font-bold text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors">
            {t('landingPage.navFeatures')}
          </Link>
          <Link href="/guide" className="text-sm font-bold text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors">
            {t('landingPage.navGuide')}
          </Link>
        </nav>
        {/* 🛡️ 모바일 전용 - AccountMenu/LanguageToggle과 동일한 패턴(토글 state + 투명 백드롭 +
            절대위치 패널)으로 "기능"/"가이드" 2개 링크에 접근하는 길을 만든다. 데스크톱에서 nav가
            보일 땐 md:hidden으로 숨어서 둘 중 하나만 항상 보인다. */}
        <div className="relative md:hidden">
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            aria-label={t('landingPage.navFeatures')}
            className="text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {navOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNavOpen(false)} />
              <div className="absolute left-0 mt-2 w-40 bg-[#141416] border border-[#676771] rounded-xl shadow-2xl overflow-hidden z-20">
                <Link
                  href="/#features"
                  onClick={() => setNavOpen(false)}
                  className="block px-4 py-2.5 text-sm font-bold text-[#A1A1AA] hover:bg-[#1C1C1F] hover:text-[#F5F5F5] transition-colors"
                >
                  {t('landingPage.navFeatures')}
                </Link>
                <Link
                  href="/guide"
                  onClick={() => setNavOpen(false)}
                  className="block px-4 py-2.5 text-sm font-bold text-[#A1A1AA] hover:bg-[#1C1C1F] hover:text-[#F5F5F5] transition-colors"
                >
                  {t('landingPage.navGuide')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <LanguageToggle />
        <AccountMenu
          profileHref="/profile"
          extraItems={dashboardHref ? [{ href: dashboardHref, label: `🎛️ ${t('landingPage.goToDashboardCta')}` }] : []}
        />
      </div>
    </header>
  );
}
