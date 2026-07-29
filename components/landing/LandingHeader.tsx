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
    <header className="relative z-20 flex items-center justify-end gap-3 px-4 sm:px-6 py-4">
      <LanguageToggle />
      <AccountMenu
        profileHref="/profile"
        extraItems={dashboardHref ? [{ href: dashboardHref, label: `🎛️ ${t('landingPage.goToDashboardCta')}` }] : []}
      />
    </header>
  );
}
