'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useT } from '@/lib/i18n/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

type LandingHeaderProps = {
  dashboardHref: string | null;
};

export default function LandingHeader({ dashboardHref }: LandingHeaderProps) {
  const { data: session } = useSession();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-20 flex items-center justify-end gap-3 px-4 sm:px-6 py-4">
      <LanguageToggle />

      {!session?.user ? (
        <a
          href="/api/auth/signin"
          className="border border-[#5865F2]/40 hover:border-[#5865F2] text-[#b5bac1] hover:text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-lg transition-all whitespace-nowrap"
        >
          {t('landingPage.loginCta')}
        </a>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-[#2A1F40] hover:border-[#5865F2]/50 pl-1 pr-3 py-1 transition-all"
          >
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <span className="w-7 h-7 rounded-full bg-[#5865F2] flex items-center justify-center text-xs font-bold text-white">
                {session.user.name?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
            <span className="hidden sm:inline text-xs font-bold text-white max-w-[100px] truncate">
              {session.user.name}
            </span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-[#1e1f22] border border-[#2b2d31] rounded-xl shadow-2xl overflow-hidden z-20">
                {dashboardHref && (
                  <Link
                    href={dashboardHref}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-xs font-bold text-[#dbdee1] hover:bg-[#2b2d31] transition-colors"
                  >
                    🎛️ {t('landingPage.goToDashboardCta')}
                  </Link>
                )}
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-xs font-bold text-[#dbdee1] hover:bg-[#2b2d31] transition-colors"
                >
                  {t('profilePickerPage.title')}
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="block w-full text-left px-4 py-2.5 text-xs font-bold text-[#f23f42] hover:bg-[#f23f42]/10 transition-colors"
                >
                  {t('sidebar.logout')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
