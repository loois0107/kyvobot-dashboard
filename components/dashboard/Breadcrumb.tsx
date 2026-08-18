'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useT } from '@/lib/i18n/LanguageContext';
import { useGuildName } from '@/components/GuildsContext';
import type { TranslationKey } from '@/lib/i18n';

type GroupDef = {
  labelKey: TranslationKey;
  pages: Record<string, TranslationKey>;
};

// 🛡️ [브레드크럼] 각 그룹의 pages는 GroupTabLayout의 탭 순서와 동일하게 정렬했다 -
// Object.keys(...)[0]이 곧 그 그룹의 첫 탭이자 사이드바 진입점 href와 일치해야 한다
// (app/dashboard/[guildId]/layout.tsx의 사이드바 그룹 진입 href와 반드시 동기화 유지).
const GROUPS: Record<string, GroupDef> = {
  community: {
    labelKey: 'sidebar.categoryCommunity',
    pages: {
      automod: 'sidebar.automod',
      welcome: 'sidebar.welcomeSettings',
      voice: 'sidebar.joinToCreate',
      'anonymous-reports': 'sidebar.anonymousReports',
      'reaction-roles': 'sidebar.reactionRoles',
      settings: 'sidebar.customCommands',
      'audit-logs': 'sidebar.auditLogs',
    },
  },
  party: {
    labelKey: 'sidebar.categoryPartyGames',
    pages: {
      'party-settings': 'sidebar.partyRecruitment',
      'party-stats': 'sidebar.partyStats',
      'party-presets': 'sidebar.gamePresets',
      'tier-roles': 'sidebar.tierRoleMapping',
    },
  },
  economy: {
    labelKey: 'sidebar.categoryEconomy',
    pages: {
      leveling: 'sidebar.levelingEconomy',
      leaderboard: 'sidebar.serverLeaderboard',
      giveaways: 'sidebar.giveaways',
    },
  },
  integrations: {
    labelKey: 'sidebar.categoryIntegrationsAI',
    pages: {
      twitch: 'sidebar.twitchStreamers',
      'ticket-settings': 'sidebar.aiSupportTicket',
    },
  },
};

const STANDALONE_PAGES: Record<string, TranslationKey> = {
  general: 'sidebar.generalSettings',
};

type Segment = {
  label: string;
  href: string | null;
};

type BreadcrumbProps = {
  className?: string;
};

export default function Breadcrumb({ className = '' }: BreadcrumbProps) {
  const pathname = usePathname();
  const params = useParams();
  const t = useT();
  const guildId = params?.guildId as string;
  const guildName = useGuildName(guildId);

  const rest = (pathname || '').replace(`/dashboard/${guildId}`, '').split('/').filter(Boolean);
  const [first, second] = rest;

  const segments: Segment[] = [
    { label: t('sidebar.breadcrumbRoot'), href: `/dashboard/${guildId}` },
    { label: guildName || guildId, href: null },
  ];

  const group = first ? GROUPS[first] : undefined;
  if (group) {
    const entrySegment = Object.keys(group.pages)[0];
    segments.push({ label: t(group.labelKey), href: `/dashboard/${guildId}/${first}/${entrySegment}` });
    const pageLabelKey = second ? group.pages[second] : undefined;
    if (pageLabelKey) segments.push({ label: t(pageLabelKey), href: null });
  } else if (first && STANDALONE_PAGES[first]) {
    segments.push({ label: t(STANDALONE_PAGES[first]), href: null });
  }
  // else: Control Hub Home (no `first` segment) - last segment intentionally omitted here.

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-xs sm:text-sm ${className}`}
    >
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1.5 shrink-0">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />}
          {seg.href ? (
            <Link href={seg.href} className="text-text-secondary hover:text-text-primary transition-colors shrink-0">
              {seg.label}
            </Link>
          ) : (
            <span className={`shrink-0 ${i === segments.length - 1 ? 'text-text-primary font-bold' : 'text-text-secondary'}`}>
              {seg.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
