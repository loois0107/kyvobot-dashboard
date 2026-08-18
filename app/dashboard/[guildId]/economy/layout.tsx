'use client';

import { usePathname, useParams } from 'next/navigation';
import { useT } from '@/lib/i18n/LanguageContext';
import GroupTabLayout from '@/components/dashboard/GroupTabLayout';

// 🛡️ [경제 & 참여도 그룹] "연동 & AI 지원"/"파티 & 게임"과 동일한 패턴 - guildId 유효성 검사는
// 이 레이아웃이 항상 대시보드 루트 layout.tsx 안에 중첩되어서만 렌더링되므로 다시 하지 않는다.
export default function EconomyGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const t = useT();
  const guildId = params?.guildId as string;

  const tabs = [
    {
      href: `/dashboard/${guildId}/economy/leveling`,
      label: t('sidebar.levelingEconomy'),
      active: Boolean(pathname?.includes('/leveling')),
    },
    {
      href: `/dashboard/${guildId}/economy/leaderboard`,
      label: t('sidebar.serverLeaderboard'),
      active: Boolean(pathname?.includes('/leaderboard')),
    },
    {
      href: `/dashboard/${guildId}/economy/giveaways`,
      label: t('sidebar.giveaways'),
      active: Boolean(pathname?.includes('/giveaways')),
    },
  ];

  return <GroupTabLayout tabs={tabs}>{children}</GroupTabLayout>;
}
