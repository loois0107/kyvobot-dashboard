'use client';

import { usePathname, useParams } from 'next/navigation';
import { useT } from '@/lib/i18n/LanguageContext';
import GroupTabLayout from '@/components/dashboard/GroupTabLayout';

// 🛡️ [연동 & AI 지원 그룹 파일럿] guildId 유효성 검사는 이 레이아웃이 항상 대시보드 루트
// layout.tsx(app/dashboard/[guildId]/layout.tsx) 안에 중첩되어서만 렌더링되므로 다시 하지
// 않는다 - 루트 레이아웃이 이미 잘못된 guildId면 children 자체를 렌더링하지 않고 일찍
// return null 한다.
export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const t = useT();
  const guildId = params?.guildId as string;

  const tabs = [
    {
      href: `/dashboard/${guildId}/integrations/twitch`,
      label: t('sidebar.twitchStreamers'),
      active: Boolean(pathname?.includes('/twitch')),
    },
    {
      href: `/dashboard/${guildId}/integrations/ticket-settings`,
      label: t('sidebar.aiSupportTicket'),
      active: Boolean(pathname?.includes('/ticket-settings')),
    },
  ];

  return <GroupTabLayout tabs={tabs}>{children}</GroupTabLayout>;
}
