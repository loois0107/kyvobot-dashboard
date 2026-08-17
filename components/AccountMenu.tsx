'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useT } from '@/lib/i18n/LanguageContext';

type ExtraMenuItem = {
  href: string;
  label: string;
};

type AccountMenuProps = {
  profileHref: string;
  extraItems?: ExtraMenuItem[];
};

// Shared avatar + dropdown (login link when logged out, avatar/name -> profile/logout menu when
// logged in) - used by both the landing page header and the dashboard header. `extraItems` lets a
// caller (e.g. the landing header's "Go to Dashboard" link) inject items above "My Profile" without
// this component needing to know about caller-specific routes.
export default function AccountMenu({ profileHref, extraItems = [] }: AccountMenuProps) {
  const { data: session } = useSession();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!session?.user) {
    return (
      <a
        href="/api/auth/signin"
        className="border border-brand/40 hover:border-brand text-text-secondary hover:text-text-primary text-sm sm:text-base font-bold px-4 py-2 rounded-lg transition-all whitespace-nowrap"
      >
        {t('landingPage.loginCta')}
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border-default hover:border-brand/50 pl-1 pr-3 py-1 transition-all"
      >
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-sm font-bold text-white">
            {session.user.name?.[0]?.toUpperCase() ?? '?'}
          </span>
        )}
        <span className="hidden sm:inline text-sm font-bold text-text-primary max-w-[100px] truncate">
          {session.user.name}
        </span>
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-bg-surface border border-border-default rounded-xl shadow-2xl overflow-hidden z-20">
            {extraItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm font-bold text-text-secondary hover:bg-bg-elevated transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={profileHref}
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm font-bold text-text-secondary hover:bg-bg-elevated transition-colors"
            >
              {t('profilePickerPage.title')}
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="block w-full text-left px-4 py-2.5 text-sm font-bold text-danger hover:bg-danger/10 transition-colors"
            >
              {t('sidebar.logout')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
