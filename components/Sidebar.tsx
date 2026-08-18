'use client';

import { usePathname, useParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LayoutDashboard, Home } from 'lucide-react';
import { useT } from '@/lib/i18n/LanguageContext';
import SidebarNavLink from '@/components/ui/SidebarNavLink';

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
  const menuItem = session
    ? { id: 'controlHub', href: controlHubHref, label: t('sidebar.genericControlHub'), icon: LayoutDashboard }
    : { id: 'home', href: '/', label: t('sidebar.genericHome'), icon: Home };

  const isActive = pathname === menuItem.href || (menuItem.href !== '/' && pathname?.startsWith(menuItem.href));

  return (
    <aside className="w-full md:w-64 bg-bg-surface border-b md:border-b-0 md:border-r border-border-default p-4 md:p-6 flex flex-row md:flex-col justify-between items-center md:items-stretch sticky top-0 z-50">
      <div className="flex flex-row md:flex-col items-center md:items-stretch gap-4 md:gap-0 w-full md:w-auto justify-between md:justify-start">

        {/* 🛡️ [리디자인] 이 사이드바의 실제 역할이 "링크 1개 + 로그아웃"뿐이라, 메인 대시보드
            헤더의 풀네임("Kyvo Central Control Hub") 대신 대시보드 모바일 헤더가 이미 같은
            "간결한 브랜드 라벨" 용도로 쓰던 mobileHeaderTitle을 재사용했다 - 새 문구를 안
            만들어도 톤이 자연스럽게 맞는다. 옛 genericTitle 키("KYVO DASH")는 폐기. */}
        <h2 className="text-sm md:text-xl font-black text-brand tracking-wider mb-0 md:mb-8 whitespace-nowrap uppercase">
          {t('sidebar.mobileHeaderTitle')}
        </h2>

        <nav className="text-xs md:text-sm">
          <SidebarNavLink href={menuItem.href} active={isActive} icon={menuItem.icon}>
            {menuItem.label}
          </SidebarNavLink>
        </nav>
      </div>

      <div className="flex flex-row md:flex-col items-center md:items-stretch gap-3 md:gap-2">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
          className="whitespace-nowrap text-xs md:text-sm font-bold text-danger/80 hover:text-danger transition-colors"
        >
          {t('sidebar.logout')}
        </button>
        <div className="hidden md:block text-[10px] text-text-muted">
          {t('sidebar.genericStatus')}
        </div>
      </div>
    </aside>
  );
}
