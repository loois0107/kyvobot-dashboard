'use client';

import { usePathname, useParams } from 'next/navigation';
import { useT } from '@/lib/i18n/LanguageContext';
import GroupTabLayout from '@/components/dashboard/GroupTabLayout';

// 🛡️ [커뮤니티 관리 그룹] 다른 그룹들과 동일 패턴 - guildId 유효성 검사는 이 레이아웃이
// 항상 대시보드 루트 layout.tsx 안에 중첩되어서만 렌더링되므로 다시 하지 않는다.
export default function CommunityGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const t = useT();
  const guildId = params?.guildId as string;

  const tabs = [
    {
      href: `/dashboard/${guildId}/community/automod`,
      label: t('sidebar.automod'),
      active: Boolean(pathname?.includes('/automod')),
    },
    {
      href: `/dashboard/${guildId}/community/welcome`,
      label: t('sidebar.welcomeSettings'),
      active: Boolean(pathname?.includes('/welcome')),
    },
    {
      href: `/dashboard/${guildId}/community/voice`,
      label: t('sidebar.joinToCreate'),
      active: Boolean(pathname?.includes('/voice')),
    },
    {
      href: `/dashboard/${guildId}/community/anonymous-reports`,
      label: t('sidebar.anonymousReports'),
      active: Boolean(pathname?.includes('/anonymous-reports')),
    },
    {
      href: `/dashboard/${guildId}/community/reaction-roles`,
      label: t('sidebar.reactionRoles'),
      active: Boolean(pathname?.includes('/reaction-roles')),
    },
    {
      href: `/dashboard/${guildId}/community/settings`,
      label: t('sidebar.customCommands'),
      active: Boolean(pathname?.includes('/settings')),
    },
    {
      href: `/dashboard/${guildId}/community/audit-logs`,
      label: t('sidebar.auditLogs'),
      active: Boolean(pathname?.includes('/audit-logs')),
    },
  ];

  return <GroupTabLayout tabs={tabs}>{children}</GroupTabLayout>;
}
