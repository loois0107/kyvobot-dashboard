'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import AccountMenu from '@/components/AccountMenu';

type LandingHeaderProps = {
  dashboardHref: string | null;
};

export default function LandingHeader({ dashboardHref }: LandingHeaderProps) {
  const t = useT();

  return (
    <header className="relative z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-wide">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5865F2] to-[#4752C4] flex items-center justify-center text-sm text-white">
            K
          </span>
          <span className="bg-gradient-to-r from-white via-[#c7cdfd] to-[#5865F2] bg-clip-text text-transparent">
            {t('landingPage.heroTitle')}
          </span>
        </Link>
        {/* 🛡️ 로고는 모바일에서도 계속 보이지만, 메뉴가 "기능" 하나뿐이라 모바일에선 nav만
            숨긴다 - 헤더 오른쪽(언어토글+계정)은 여전히 존재하니 justify-between이 모바일에서도
            안전하다(로고가 왼쪽에 항상 있어서 한쪽만 비어 정렬이 깨지는 일이 없다). */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm font-bold text-[#b5bac1] hover:text-white transition-colors">
            {t('landingPage.navFeatures')}
          </a>
        </nav>
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
