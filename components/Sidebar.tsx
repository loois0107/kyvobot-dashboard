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
    <aside className="w-full md:w-64 bg-bg-surface border-b md:border-b-0 md:border-r border-border-default p-4 md:p-6 flex flex-col justify-between items-stretch sticky top-0 z-50">
      {/* 🛡️ [모바일도 데스크톱과 같은 세로 배치] 원래 모바일만 flex-row로 (뱃지+타이틀)과 nav
          링크를 한 줄에 나란히 욱여넣었는데, 390px 폭에서 nav 링크("관리자 대시보드로 이동")에
          남는 가로 공간이 60~100px밖에 안 남아 글자가 한 자씩 세로로 쌓이는 렌더링 붕괴가 있었다
          (뱃지 크기와 무관하게 재현됨 - 원래부터 있던 버그). 모바일도 데스크톱과 동일하게
          flex-col로 통일해서 nav 링크가 항상 전체 폭을 쓰는 한 줄로 내려온다. */}
      <div className="flex flex-col items-stretch gap-0 w-full justify-start">

        {/* 🛡️ [브랜드명은 번역 안 함] "KyvoBot Dashboard"는 랜딩 헤더(heroTitle)와 동일하게
            EN/KO 공통 고정 문자열 - mainHeaderTitle(대시보드 데스크톱 헤더)과 값은 같지만 호출부별
            반응형 크기가 달라 키는 분리해서 유지한다.

            🛡️ [768px+에서는 축약형] 이 aside는 md:부터 폭이 256px(패딩 제외 실사용 208px)로
            고정되는데, 뱃지(44px)+"KyvoBot Dashboard"(text-xl 기준 실측 ~253px)를 그대로 넣으면
            72.8px가 옆 탭바 위로 그대로 삐져나왔다(overflow-hidden도 없어서 안 잘리고 겹침).
            모바일 상단바가 이미 쓰던 축약형 mobileTopBarTitle("KyvoBot", 실측 110px)을 여기서도
            재사용하면 뱃지+gap+텍스트 = 162.1px로 208px 안에 45.9px 여유 있게 들어간다 - 뱃지를
            더 줄일 필요 없음. 768px 미만(모바일, aside가 풀폭)에서는 원래대로 전체 문구 유지. */}
        <div className="flex items-center gap-2 mb-8">
          <span className="w-11 h-11 rounded-lg overflow-hidden bg-white shrink-0 relative">
            <Image src="/images/features/brand/kyvobot character.png" alt="" fill className="object-contain" sizes="44px" />
          </span>
          <h2 className="text-sm md:text-xl font-black text-text-primary tracking-wider whitespace-nowrap uppercase">
            <span className="md:hidden">{t('sidebar.mobileHeaderTitle')}</span>
            <span className="hidden md:inline">{t('sidebar.mobileTopBarTitle')}</span>
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

      <div className="flex flex-col items-stretch gap-2">
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
