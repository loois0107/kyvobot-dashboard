'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LayoutDashboard, Home } from 'lucide-react';
import { useT } from '@/lib/i18n/LanguageContext';
import SidebarNavLink from '@/components/ui/SidebarNavLink';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useT();

  // 🛡️ [권한 없는 링크 숨김] "컨트롤 허브"가 예전엔 URL의 guildId를 그대로 하드코딩된
  // href로 써서, 관리 권한 없는 서버(멤버로만 들어가 있는 /profile/{guildId})에서도 눌리는
  // 링크가 떠 있었다 - 눌렀을 때 /dashboard/{guildId}가 조각조각 깨진 채로 렌더링되는
  // 원인이었다. 관리 서버 목록(/api/guilds, ServerSelect/GuildsProvider가 쓰는 것과 동일한
  // 엔드포인트)을 직접 불러 개수로만 판단한다 - 0개면 링크 자체를 숨기고, 1개 이상이면
  // 항상 /dashboard(피커)로 보낸다. 피커가 이미 "1개면 자동 이동, 여러 개면 선택"을
  // 처리해주므로 여기서 어떤 guildId로 보낼지 추측할 필요가 없다.
  const [managedGuildCount, setManagedGuildCount] = useState<number | null>(null);

  useEffect(() => {
    if (!session) {
      setManagedGuildCount(null);
      return;
    }
    let cancelled = false;
    fetch('/api/guilds')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setManagedGuildCount(Array.isArray(data) ? data.length : 0);
      })
      .catch((err) => {
        console.error('[SIDEBAR][MANAGED_GUILDS_FETCH_FAULT]', err);
        if (!cancelled) setManagedGuildCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // The dashboard section renders its own full sidebar/navigation - don't stack a second one next to it.
  if (pathname?.startsWith('/dashboard/')) {
    return null;
  }

  // Logged-out visitors only get "Home" (the marketing landing page) - there's nothing to control yet.
  // Logged-in visitors with at least one managed server get "Go to Admin Dashboard"; logged-in
  // visitors with zero get nothing at all (not even a disabled link) - showing a link that always
  // leads to a broken/empty dashboard is worse than showing no link.
  const menuItem = !session
    ? { id: 'home', href: '/', label: t('sidebar.genericHome'), icon: Home }
    : managedGuildCount && managedGuildCount > 0
    ? { id: 'controlHub', href: '/dashboard', label: t('sidebar.goToAdminDashboard'), icon: LayoutDashboard }
    : null;

  const isActive = Boolean(menuItem) && (pathname === menuItem!.href || (menuItem!.href !== '/' && pathname?.startsWith(menuItem!.href)));

  return (
    <aside className="w-full md:w-64 bg-bg-surface border-b md:border-b-0 md:border-r border-border-default p-4 md:p-6 flex flex-row md:flex-col justify-between items-center md:items-stretch sticky top-0 z-50">
      <div className="flex flex-row md:flex-col items-center md:items-stretch gap-4 md:gap-0 w-full md:w-auto justify-between md:justify-start">

        {/* 🛡️ [브랜드명은 번역 안 함] "KyvoBot Dashboard"는 랜딩 헤더(heroTitle)와 동일하게
            EN/KO 공통 고정 문자열 - mainHeaderTitle(대시보드 데스크톱 헤더)과 값은 같지만 호출부별
            반응형 크기가 달라 키는 분리해서 유지한다. */}
        <div className="flex items-center gap-2 mb-0 md:mb-8">
          <span className="w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 relative">
            <Image src="/images/features/brand/kyvobot character.png" alt="" fill className="object-contain" sizes="32px" />
          </span>
          <h2 className="text-sm md:text-xl font-black text-brand tracking-wider whitespace-nowrap uppercase">
            {t('sidebar.mobileHeaderTitle')}
          </h2>
        </div>

        {menuItem && (
          <nav className="text-xs md:text-sm">
            <SidebarNavLink href={menuItem.href} active={isActive} icon={menuItem.icon}>
              {menuItem.label}
            </SidebarNavLink>
          </nav>
        )}
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
