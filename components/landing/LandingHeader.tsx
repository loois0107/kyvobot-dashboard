'use client';

import { useT } from '@/lib/i18n/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import AccountMenu from '@/components/AccountMenu';

type LandingHeaderProps = {
  dashboardHref: string | null;
};

export default function LandingHeader({ dashboardHref }: LandingHeaderProps) {
  const t = useT();

  return (
    <header className="relative z-20 flex items-center justify-end md:justify-between gap-3 px-4 sm:px-6 py-4">
      <nav className="hidden md:flex items-center gap-6">
        <a href="#features" className="text-sm font-bold text-[#b5bac1] hover:text-white transition-colors">
          {t('landingPage.navFeatures')}
        </a>
      </nav>
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
