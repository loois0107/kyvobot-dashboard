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
            <SidebarNavLink href={`/dashboard/${currentGuildId}`} active={pathname === `/dashboard/${currentGuildId}`}>
              {t('sidebar.controlHubHome')}
            </SidebarNavLink>

            <SidebarNavLink href={`/profile/${currentGuildId}`}>
              {t('sidebar.myPage')}
            </SidebarNavLink>

            <SidebarNavLink href={`/dashboard/${currentGuildId}/general`} active={pathname?.includes('/general')}>
              {t('sidebar.generalSettings')}
            </SidebarNavLink>

            <div className="space-y-1">
              <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2 px-2">{t('sidebar.categoryCommunity')}</label>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/automod`} active={pathname?.includes('/automod')}>
                {t('sidebar.automod')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/welcome`} active={pathname?.includes('/welcome')}>
                {t('sidebar.welcomeSettings')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/voice`} active={pathname?.includes('/voice')}>
                {t('sidebar.joinToCreate')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/anonymous-reports`} active={pathname?.includes('/anonymous-reports')}>
                {t('sidebar.anonymousReports')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/reaction-roles`} active={pathname?.includes('/reaction-roles')}>
                {t('sidebar.reactionRoles')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/settings`} active={pathname?.includes('/settings')}>
                {t('sidebar.customCommands')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/audit-logs`} active={pathname?.includes('/audit-logs')}>
                {t('sidebar.auditLogs')}
              </SidebarNavLink>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2 px-2">{t('sidebar.categoryPartyGames')}</label>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/party-settings`} active={pathname?.includes('/party-settings')}>
                {t('sidebar.partyRecruitment')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/party-stats`} active={pathname?.includes('/party-stats')}>
                {t('sidebar.partyStats')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/party-presets`} active={pathname?.includes('/party-presets')}>
                {t('sidebar.gamePresets')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/tier-roles`} active={pathname?.includes('/tier-roles')}>
                {t('sidebar.tierRoleMapping')}
              </SidebarNavLink>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2 px-2">{t('sidebar.categoryEconomy')}</label>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/leveling`} active={pathname?.includes('/leveling')}>
                {t('sidebar.levelingEconomy')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/leaderboard`} active={pathname?.includes('/leaderboard')}>
                {t('sidebar.serverLeaderboard')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/giveaways`} active={pathname?.includes('/giveaways')}>
                {t('sidebar.giveaways')}
              </SidebarNavLink>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2 px-2">{t('sidebar.categoryIntegrationsAI')}</label>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/twitch`} active={pathname?.includes('/twitch')}>
                {t('sidebar.twitchStreamers')}
              </SidebarNavLink>
              <SidebarNavLink href={`/dashboard/${currentGuildId}/ticket-settings`} active={pathname?.includes('/ticket-settings')}>
                {t('sidebar.aiSupportTicket')}
              </SidebarNavLink>
            </div>
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
            <Button type="button" variant="ghost" onClick={() => router.push('/')} aria-label={t('sidebar.homeButton')} title={t('sidebar.homeButton')} className="!px-2 !py-1 text-base">
              🏠
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push('/guide')} aria-label={t('sidebar.guideButton')} title={t('sidebar.guideButton')} className="!px-2 !py-1 text-base">
              📖
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
                  <span>🏠</span> {t('sidebar.homeButton')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.push('/guide')}>
                  <span>📖</span> {t('sidebar.guideButton')}
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