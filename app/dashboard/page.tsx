'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/i18n/LanguageContext';
import { BOT_INVITE_URL } from '@/lib/botInvite';

type ManagedGuild = { id: string; name: string };
type BotStatus = 'checking' | 'present' | 'absent' | 'unknown';

/**
 * Admin dashboard entry point. Before this page existed, the landing page just grabbed
 * managed[0] from the caller's Discord guild list and sent multi-server admins to whichever
 * guild the Discord API happened to list first - sometimes one Kyvo wasn't even in. This page
 * replaces that guess with an actual picker: list every server the caller can manage, show
 * whether Kyvo is actually in each one, and let them choose (or invite the bot on the spot).
 *
 * If there's only one managed server, there's nothing to pick - skip straight to it.
 */
export default function DashboardPickerPage() {
  const t = useT();
  const router = useRouter();

  const [guilds, setGuilds] = useState<ManagedGuild[] | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [botStatuses, setBotStatuses] = useState<Record<string, BotStatus>>({});
  const [search, setSearch] = useState('');
  const [autoRedirecting, setAutoRedirecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/guilds');
        if (!res.ok) throw new Error(`guilds fetch failed: ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const list: ManagedGuild[] = Array.isArray(data) ? data : [];
        setGuilds(list);

        // Exactly one managed server - there's nothing to actually pick, so skip the picker
        // UI entirely and go straight there (still passes through the bot-status gate in the
        // dashboard layout itself, so an absent bot still shows the invite notice there).
        if (list.length === 1) {
          setAutoRedirecting(true);
          router.replace(`/dashboard/${list[0].id}`);
        }
      } catch (err) {
        console.error('[DASHBOARD_PICKER][GUILDS_FETCH_FAULT]', err);
        if (!cancelled) setFetchFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // One bot-status call per managed guild, in parallel. All of them hit the same underlying
  // Discord URL (bot token, no per-guild params) with a 60s Next.js fetch cache, so this fans
  // out to N requests on our own API but effectively one real Discord call behind it.
  useEffect(() => {
    if (!guilds || guilds.length < 2) return;
    let cancelled = false;
    setBotStatuses((prev) => {
      const next = { ...prev };
      for (const g of guilds) if (!next[g.id]) next[g.id] = 'checking';
      return next;
    });
    guilds.forEach((g) => {
      (async () => {
        try {
          const res = await fetch(`/api/guilds/${g.id}/bot-status`);
          if (!res.ok) throw new Error(`bot-status fetch failed: ${res.status}`);
          const data = await res.json();
          if (!cancelled) {
            setBotStatuses((prev) => ({ ...prev, [g.id]: data.bot_present ? 'present' : 'absent' }));
          }
        } catch (err) {
          console.error('[DASHBOARD_PICKER][BOT_STATUS_FAULT]', g.id, err);
          if (!cancelled) setBotStatuses((prev) => ({ ...prev, [g.id]: 'unknown' }));
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [guilds]);

  const filteredGuilds = useMemo(() => {
    if (!guilds) return [];
    const q = search.trim().toLowerCase();
    if (!q) return guilds;
    return guilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [guilds, search]);

  if (fetchFailed) {
    return (
      <div className="min-h-screen bg-bg-base text-text-primary flex items-center justify-center px-4">
        <p className="text-sm text-danger">{t('dashboardPickerPage.fetchFailed')}</p>
      </div>
    );
  }

  if (guilds === null || autoRedirecting) {
    return (
      <div className="min-h-screen bg-bg-base text-text-primary flex items-center justify-center px-4">
        <p className="text-sm text-text-secondary">{t('dashboardPickerPage.loading')}</p>
      </div>
    );
  }

  if (guilds.length === 0) {
    return (
      <div className="min-h-screen bg-bg-base text-text-primary flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-text-secondary">{t('dashboardPickerPage.noManagedServers')}</p>
        <Link
          href="/profile"
          className="bg-brand hover:bg-brand-hover text-white text-sm font-black px-8 py-3 rounded-xl transition-all"
        >
          {t('profilePickerPage.title')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-black text-text-primary">{t('dashboardPickerPage.title')}</h1>
          <p className="text-sm text-text-secondary">{t('dashboardPickerPage.subtitle')}</p>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('dashboardPickerPage.searchPlaceholder')}
          className="w-full bg-bg-surface border border-border-default rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand transition-colors"
        />

        {filteredGuilds.length === 0 ? (
          <p className="text-center text-sm text-text-secondary py-8">{t('dashboardPickerPage.noResults')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredGuilds.map((g) => {
              const status = botStatuses[g.id] ?? 'checking';
              const isPresent = status === 'present';
              const isChecking = status === 'checking';

              const cardBody = (
                <>
                  <p className="text-sm font-bold text-text-primary truncate">{g.name}</p>
                  {isChecking ? (
                    <p className="text-xs text-text-muted mt-1">{t('dashboardPickerPage.checkingStatus')}</p>
                  ) : isPresent ? (
                    <p className="text-xs text-success mt-1">{t('dashboardPickerPage.botPresentBadge')}</p>
                  ) : null}
                </>
              );

              if (isPresent) {
                return (
                  <Link
                    key={g.id}
                    href={`/dashboard/${g.id}`}
                    className="bg-bg-surface border border-border-default hover:border-brand/50 rounded-xl p-5 transition-all hover:-translate-y-0.5"
                  >
                    {cardBody}
                  </Link>
                );
              }

              return (
                <div key={g.id} className="bg-bg-surface border border-border-default rounded-xl p-5 space-y-3">
                  {cardBody}
                  {!isChecking && (
                    <a
                      href={`${BOT_INVITE_URL}&guild_id=${g.id}&disable_guild_select=true`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block bg-brand hover:bg-brand-hover text-white text-xs font-black px-4 py-2 rounded-lg transition-all"
                    >
                      {t('dashboardPickerPage.inviteCta')}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
