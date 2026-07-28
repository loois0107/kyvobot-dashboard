'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useT } from '@/lib/i18n/LanguageContext';

export default function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const { data: session } = useSession();
  const t = useT();

  // The dashboard section renders its own full sidebar/navigation - don't stack a second one next to it.
  if (pathname?.startsWith('/dashboard/')) {
    return null;
  }

  const guildId = params?.guildId as string | undefined;
  // No known guild in the URL - send to '/', which resolves a real one via the Discord API rather than guessing.
  const controlHubHref = guildId ? `/dashboard/${guildId}` : '/';

  // Logged-out visitors only get "Home" (the marketing landing page) - there's nothing to control yet.
  // Logged-in visitors only get "Control Hub" - the landing page has nothing left for them since '/'
  // just auto-redirects them straight back into their dashboard. Showing exactly one item per auth
  // state (instead of always showing both) is what actually fixes the two ever resolving to the same
  // href - previously they silently collided whenever the URL had no guildId (i.e. on '/' or '/profile').
  const menuItems = session
    ? [{ id: 'controlHub', href: controlHubHref, label: t('sidebar.genericControlHub'), activeColor: 'text-[#5865F2] border-[#5865F2]' }]
    : [{ id: 'home', href: '/', label: t('sidebar.genericHome'), activeColor: 'text-white border-white' }];

  return (
    <aside className="w-full md:w-64 bg-[#161626] border-b md:border-b-0 md:border-r border-[#2A1F40] p-4 md:p-6 flex flex-row md:flex-col justify-between items-center md:items-stretch sticky top-0 z-50">
      <div className="flex flex-row md:flex-col items-center md:items-stretch gap-4 md:gap-0 w-full md:w-auto justify-between md:justify-start">

        <h2 className="text-sm md:text-xl font-bold text-[#FFD700] tracking-wider mb-0 md:mb-8 whitespace-nowrap">
          {t('sidebar.genericTitle')}
        </h2>
        
        <nav className="flex flex-row md:flex-col gap-3 md:gap-4 text-xs md:text-sm text-[#57576F]">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`transition-all duration-200 whitespace-nowrap font-bold relative md:pl-3 py-1 md:border-l-2 ${
                  isActive 
                    ? `${item.activeColor} bg-[#2A1F40]/20` 
                    : 'border-transparent text-gray-400 hover:text-white' 
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-row md:flex-col items-center md:items-stretch gap-3 md:gap-2">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
          className="whitespace-nowrap text-xs md:text-sm font-bold text-[#f23f42]/80 hover:text-[#f23f42] transition-colors"
        >
          {t('sidebar.logout')}
        </button>
        <div className="hidden md:block text-[10px] text-[#57576F]">
          {t('sidebar.genericStatus')}
        </div>
      </div>
    </aside>
  );
}
