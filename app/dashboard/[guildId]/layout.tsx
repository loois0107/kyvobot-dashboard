'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useT } from '@/lib/i18n/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import ThemeToggle from '@/components/ThemeToggle';
import AccountMenu from '@/components/AccountMenu';
import BotNotInvitedNotice from '@/components/BotNotInvitedNotice';
import { GuildsProvider, type ManagedGuild } from '@/components/GuildsContext';
import Button from '@/components/ui/Button';
import SidebarNavLink from '@/components/ui/SidebarNavLink';
import {
  LayoutDashboard,
  User,
  Settings,
  Shield,
  DoorOpen,
  Mic,
  Flag,
  Smile,
  Terminal,
  ScrollText,
  Gamepad2,
  Sparkles,
  Trophy,
  Gift,
  Plug,
  Home,
  BookOpen,
} from 'lucide-react';

type BotStatus = 'checking' | 'present' | 'absent' | 'unknown';

function isValidGuildId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && !id.includes('[') && !id.includes('%5B');
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();

  const rawGuildId = params?.guildId as string | undefined;
  const currentGuildId = isValidGuildId(rawGuildId) ? rawGuildId : undefined;

  const [guilds, setGuilds] = useState<ManagedGuild[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [botStatus, setBotStatus] = useState<BotStatus>('checking');

  const isSubPage = pathname ? pathname !== `/dashboard/${currentGuildId}` : false;

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Invalid/missing guildId in the URL - bounce to the root page, which resolves a real guild via the Discord API,
  // instead of guessing a hardcoded server.
  useEffect(() => {
    if (!currentGuildId) {
      router.replace('/');
    }
  }, [currentGuildId, router]);

  // Live-loads the caller's actually-managed guilds from Discord (via /api/guilds) instead of a
  // client-cached list, so servers the user has left or renamed never linger in the dropdown.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/guilds');
        if (!res.ok) throw new Error(`guilds fetch failed: ${res.status}`);
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setGuilds(data.filter((g: any): g is ManagedGuild => g && isValidGuildId(g.id) && typeof g.name === 'string'));
        }
      } catch (err) {
        console.error('[GUILD LIST SYNC FAULT]', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Gates every page under this layout on whether Kyvo is actually in the guild being viewed -
  // user permission (owner/MANAGE_GUILD) and bot membership are completely independent, so without
  // this, channel/role pickers and stats just silently degrade with no explanation. Fails open
  // (treats a failed check as 'unknown', not 'absent') since this is a UX guide rail, not the
  // security boundary - the per-page requireGuildAdmin calls still enforce real access control.
  const checkBotStatus = async (guildId: string) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/bot-status`);
      if (!res.ok) {
        console.error('[BOT_STATUS_CHECK_FAULT] non-OK response:', res.status);
        setBotStatus('unknown');
        return;
      }
      const data = await res.json();
      setBotStatus(data.bot_present ? 'present' : 'absent');
    } catch (err) {
      console.error('[BOT_STATUS_CHECK_FAULT]', err);
      setBotStatus('unknown');
    }
  };

  useEffect(() => {
    if (!currentGuildId) return;
    setBotStatus('checking');
    checkBotStatus(currentGuildId);
  }, [currentGuildId]);

  const handleGuildChange = (targetId: string) => {
    if (!targetId || !pathname) return;
    // Path shape is always /dashboard/{guildId}/{...rest} - carry over whatever follows the guildId
    // instead of maintaining a manually-synced whitelist of known subpages.
    const pathSegments = pathname.split('/').filter(Boolean);
    const destinationMenu = pathSegments.slice(2).join('/');
    router.push(`/dashboard/${targetId}${destinationMenu ? `/${destinationMenu}` : ''}`);
  };

  if (!currentGuildId) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-bg-base text-text-primary font-sans relative overflow-x-hidden">
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-bg-surface p-4 flex flex-col justify-between border-r border-border-default transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="mb-6 flex justify-between items-center">
            <div>
              <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">{t('sidebar.selectServer')}</label>
              <select
                value={currentGuildId || ''}
                onChange={(e) => handleGuildChange(e.target.value)}
                className="w-44 bg-bg-elevated text-text-primary rounded-lg px-3 py-2 border border-border-default focus:outline-none focus:border-brand cursor-pointer font-medium text-sm"
              >
                {guilds.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="text-text-secondary hover:text-text-primary md:hidden text-lg p-1 mt-5">✕</button>
          </div>

          <nav className="space-y-4">
            <SidebarNavLink href={`/dashboard/${currentGuildId}`} active={pathname === `/dashboard/${currentGuildId}`} icon={LayoutDashboard}>
              {t('sidebar.controlHubHome')}
            </SidebarNavLink>

            <SidebarNavLink href={`/profile/${currentGuildId}`} icon={User}>
              {t('sidebar.myPage')}
            </SidebarNavLink>

            <SidebarNavLink href={`/dashboard/${currentGuildId}/general`} active={pathname?.includes('/general')} icon={Settings}>
              {t('sidebar.generalSettings')}
            </SidebarNavLink>

            <div className="space-y-1">
              <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2 px-2">{t('sidebar.categoryCommunity')}</label>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/automod`} active={pathname?.includes('/automod')} icon={Shield}>
                {t('sidebar.automod')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/welcome`} active={pathname?.includes('/welcome')} icon={DoorOpen}>
                {t('sidebar.welcomeSettings')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/voice`} active={pathname?.includes('/voice')} icon={Mic}>
                {t('sidebar.joinToCreate')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/anonymous-reports`} active={pathname?.includes('/anonymous-reports')} icon={Flag}>
                {t('sidebar.anonymousReports')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/reaction-roles`} active={pathname?.includes('/reaction-roles')} icon={Smile}>
                {t('sidebar.reactionRoles')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/settings`} active={pathname?.includes('/settings')} icon={Terminal}>
                {t('sidebar.customCommands')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/audit-logs`} active={pathname?.includes('/audit-logs')} icon={ScrollText}>
                {t('sidebar.auditLogs')}
              </SidebarNavLink>
            </div>

            {/* 🛡️ [파티 & 게임 그룹] "연동 & AI 지원" 파일럿과 동일 패턴 - 개별 링크 4개 대신
                그룹 진입점 1개. 아이콘은 기존 4개 중 Gamepad2(게임 프리셋에서 재사용) - 게임
                컨트롤러가 "파티 모집/통계/프리셋/티어"를 아우르는 "같이 게임한다"는 그룹
                전체 개념을 가장 보편적으로 대표한다고 판단해서 새로 고르지 않고 그대로 썼다. */}
            <SidebarNavLink href={`/dashboard/${currentGuildId}/party/party-settings`} active={pathname?.includes('/party')} icon={Gamepad2}>
              {t('sidebar.categoryPartyGames')}
            </SidebarNavLink>

            <div className="space-y-1">
              <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2 px-2">{t('sidebar.categoryEconomy')}</label>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/leveling`} active={pathname?.includes('/leveling')} icon={Sparkles}>
                {t('sidebar.levelingEconomy')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/leaderboard`} active={pathname?.includes('/leaderboard')} icon={Trophy}>
                {t('sidebar.serverLeaderboard')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/giveaways`} active={pathname?.includes('/giveaways')} icon={Gift}>
                {t('sidebar.giveaways')}
              </SidebarNavLink>
            </div>

            {/* 🛡️ [연동 & AI 지원 그룹 파일럿] 트위치/AI지원티켓 개별 링크 2개 대신, 그룹
                진입점 1개로 교체 - 클릭하면 첫 탭(twitch)으로 들어가고, 그 안에서
                integrations/layout.tsx가 렌더링하는 탭바로 두 세부 페이지를 전환한다.
                나머지 3개 그룹(커뮤니티 관리/파티 & 게임/경제 & 참여도)은 이번 파일럿
                범위가 아니라 기존 "카테고리 라벨 + 개별 링크" 구조 그대로 유지한다. */}
            <SidebarNavLink href={`/dashboard/${currentGuildId}/integrations/twitch`} active={pathname?.includes('/integrations')} icon={Plug}>
              {t('sidebar.categoryIntegrationsAI')}
            </SidebarNavLink>
          </nav>
        </div>

        <div className="pt-4 border-t border-border-default text-sm text-text-secondary">
          <p>{t('sidebar.activeServerLabel')}</p>
          <code className="text-brand block mt-1 truncate">{currentGuildId}</code>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center justify-between bg-bg-surface px-4 py-3 border-b border-border-default z-20">
          <button type="button" onClick={() => setIsMobileMenuOpen(true)} className="text-text-secondary hover:text-text-primary p-1 focus:outline-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="text-sm font-black tracking-widest text-brand uppercase">{t('sidebar.mobileHeaderTitle')}</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => router.push('/')} aria-label={t('sidebar.homeButton')} title={t('sidebar.homeButton')} className="!px-2 !py-1">
              <Home className="w-5 h-5" />
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push('/guide')} aria-label={t('sidebar.guideButton')} title={t('sidebar.guideButton')} className="!px-2 !py-1">
              <BookOpen className="w-5 h-5" />
            </Button>
            <LanguageToggle />
          </div>
        </div>

        <main className="flex-1 p-5 md:p-8 overflow-y-auto">
          <header className="mb-6 pb-4 border-b border-border-default flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-text-primary uppercase tracking-wide break-words max-w-full">{t('sidebar.mainHeaderTitle')}</h1>
            <div className="flex items-center gap-3">
              <div className="bg-bg-elevated px-3 py-1 rounded-full text-sm text-success font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success"></span> {t('sidebar.syncStatus')}</div>
              <div className="hidden md:flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => router.push('/')}>
                  <Home className="w-4 h-4" /> {t('sidebar.homeButton')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.push('/guide')}>
                  <BookOpen className="w-4 h-4" /> {t('sidebar.guideButton')}
                </Button>
              </div>
              <ThemeToggle />
              <div className="hidden md:block">
                <LanguageToggle />
              </div>
              <AccountMenu profileHref={`/profile/${currentGuildId}`} />
            </div>
          </header>

          {botStatus === 'checking' ? (
            <div className="flex items-center justify-center py-20 text-base text-text-muted">{t('botNotInvited.checking')}</div>
          ) : botStatus === 'absent' ? (
            <BotNotInvitedNotice onRecheck={() => checkBotStatus(currentGuildId)} />
          ) : (
            <>
              {isSubPage && (
                <div className="mb-6">
                  <Button type="button" variant="ghost" onClick={() => router.back()}>
                    <span>◀</span> {t('sidebar.goBack')}
                  </Button>
                </div>
              )}
              <GuildsProvider guilds={guilds}>{children}</GuildsProvider>
            </>
          )}
        </main>
      </div>

    </div>
  );
}