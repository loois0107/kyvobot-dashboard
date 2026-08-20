'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import AccountMenu from '@/components/AccountMenu';
import LandingThemeToggle from '@/components/landing/LandingThemeToggle';

type LandingHeaderProps = {
  dashboardHref: string | null;
};

// 🛡️ [반응형 토큰으로 전환 - 랜딩 전용 다크/라이트] 예전엔 "랜딩은 다크 고정이라 토큰 대신
// 리터럴 hex를 직접 쓴다"였는데, 이제 랜딩도 자체 다크/라이트 토글이 생겨서(LandingThemeToggle,
// kyvo_landing_theme 쿠키) 반응형 토큰 클래스가 필요해졌다. 이 헤더를 감싸는
// LandingThemeProvider(app/page.tsx 쪽)가 로컬 data-theme을 얹어주므로, 대시보드의 <html
// data-theme>과 완전히 독립적으로 이 토큰들이 해석된다. AccountMenu/LanguageToggle은 대시보드와
// 공유하는 컴포넌트라 원래도 토큰을 쓰고 있었으니 이제 색이 어긋날 일도 없어졌다.
export default function LandingHeader({ dashboardHref }: LandingHeaderProps) {
  const t = useT();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="relative z-20 mt-6 mx-4 sm:mx-6 lg:max-w-7xl lg:mx-auto rounded-2xl border border-border-default bg-bg-surface flex items-center justify-between gap-3 px-6 sm:px-8 py-4 sm:py-5">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-wide">
          {/* 🛡️ [로고 배지는 고정 흑백 유지] 검정 배경+흰 테두리는 브랜드 마크 그 자체라 다크/
              라이트 어느 페이지 배경 위에서도 항상 같은 모습이어야 한다고 판단해 토큰화하지
              않았다(어느 배경에서도 대비가 확실함) - 아래 워드마크 텍스트만 토큰 그라디언트로
              바뀐다. */}
          <span className="w-8 h-8 rounded-lg bg-[#000000] border border-[#FFFFFF] flex items-center justify-center text-sm text-white">
            K
          </span>
          {/* 🛡️ [워드마크: 브랜드 블루 제거, 토큰만으로 3->2단 그라디언트] 원래
              from-white via-[#c7cdfd] to-[#5865F2] - 라이트 모드로 그대로 가져가면 두 가지가
              깨진다: from-white는 라이트 배경(흰색에 가까움) 위에서 왼쪽 절반이 거의 안 보이고,
              to-[#5865F2]는 이번 회색톤 정리 방향과도 안 맞는다. text-primary(다크 흰/라이트
              검정) -> text-secondary로 흐르는 2단 그라디언트로 바꿔서, 토큰만으로 양쪽 테마에서
              항상 또렷하게 페이드되는 "중립 워드마크"를 만들었다 - 중간 정지점(#c7cdfd 자리)은
              토큰화된 값이 없어서 억지로 만들지 않고 아예 뺐다. */}
          <span className="bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
            {t('landingPage.heroTitle')}
          </span>
        </Link>
        {/* 🛡️ "기능"은 /guide 등 다른 페이지에서도 눌릴 수 있어 Link href="/#features"로 - 랜딩
            페이지로 이동 후 해당 섹션까지 스크롤된다. */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/#features" className="text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
            {t('landingPage.navFeatures')}
          </Link>
          <Link href="/guide" className="text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
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
            className="text-text-secondary hover:text-text-primary transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {navOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNavOpen(false)} />
              <div className="absolute left-0 mt-2 w-40 bg-bg-surface border border-border-default rounded-xl shadow-2xl overflow-hidden z-20">
                <Link
                  href="/#features"
                  onClick={() => setNavOpen(false)}
                  className="block px-4 py-2.5 text-sm font-bold text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
                >
                  {t('landingPage.navFeatures')}
                </Link>
                <Link
                  href="/guide"
                  onClick={() => setNavOpen(false)}
                  className="block px-4 py-2.5 text-sm font-bold text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
                >
                  {t('landingPage.navGuide')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <LandingThemeToggle />
        <LanguageToggle />
        <AccountMenu
          profileHref="/profile"
          extraItems={dashboardHref ? [{ href: dashboardHref, label: `🎛️ ${t('landingPage.goToDashboardCta')}` }] : []}
        />
      </div>
    </header>
  );
}
