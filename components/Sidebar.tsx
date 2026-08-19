'use client';

import { useEffect, useState } from 'react';
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

        {/* 🛡️ [리디자인] 이 사이드바의 실제 역할이 "링크 1개 + 로그아웃"뿐이라, 메인 대시보드
            헤더의 풀네임("Kyvo Central Control Hub") 대신 대시보드 모바일 헤더가 이미 같은
            "간결한 브랜드 라벨" 용도로 쓰던 mobileHeaderTitle을 재사용했다 - 새 문구를 안
            만들어도 톤이 자연스럽게 맞는다. 옛 genericTitle 키("KYVO DASH")는 폐기. */}
        <h2 className="text-sm md:text-xl font-black text-brand tracking-wider mb-0 md:mb-8 whitespace-nowrap uppercase">
          {t('sidebar.mobileHeaderTitle')}
        </h2>

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
