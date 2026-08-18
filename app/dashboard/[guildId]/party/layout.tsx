'use client';

import { usePathname, useParams } from 'next/navigation';
import { useT } from '@/lib/i18n/LanguageContext';
import GroupTabLayout from '@/components/dashboard/GroupTabLayout';

// 🛡️ [파티 & 게임 그룹] "연동 & AI 지원" 파일럿과 동일한 패턴 - guildId 유효성 검사는 이
// 레이아웃이 항상 대시보드 루트 layout.tsx 안에 중첩되어서만 렌더링되므로 다시 하지 않는다.
export default function PartyGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const t = useT();
  const guildId = params?.guildId as string;

  const tabs = [
    {
      href: `/dashboard/${guildId}/party/party-settings`,
      label: t('sidebar.partyRecruitment'),
      active: Boolean(pathname?.includes('/party-settings')),
    },
    {
      href: `/dashboard/${guildId}/party/party-stats`,
      label: t('sidebar.partyStats'),
      active: Boolean(pathname?.includes('/party-stats')),
    },
    {
      href: `/dashboard/${guildId}/party/party-presets`,
      label: t('sidebar.gamePresets'),
      active: Boolean(pathname?.includes('/party-presets')),
    },
    {
      href: `/dashboard/${guildId}/party/tier-roles`,
      label: t('sidebar.tierRoleMapping'),
      active: Boolean(pathname?.includes('/tier-roles')),
    },
  ];

  return <GroupTabLayout tabs={tabs}>{children}</GroupTabLayout>;
}
