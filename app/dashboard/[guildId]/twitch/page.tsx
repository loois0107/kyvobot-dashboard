'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';

interface StreamerRow {
  broadcaster_id: string;
  broadcaster_login: string;
  is_live: boolean;
  last_checked_at: string | null;
  poll_health: 'healthy' | 'warning' | 'stale' | 'pending';
  minutes_since_last_check: number | null;
  announcement_channel_id: string;
  announcement_channel_name: string | null;
  member_id: string | null;
  member_display_name: string | null;
  live_role_id: string | null;
  live_role_name: string | null;
  role_grant_status: 'not_configured' | 'incomplete' | 'configured';
}

type LoadStatus = 'loading' | 'loaded' | 'error';

export default function TwitchStreamersSettings() {
  const params = useParams();
  const { showToast } = useToast();
  const t = useT();
  const guildId = (params?.guildId as string) || '';

  const HEALTH_BADGE: Record<StreamerRow['poll_health'], { emoji: string; label: string; color: string }> = {
    healthy: { emoji: '🟢', label: t('twitchPage.healthyLabel'), color: 'text-green-400' },
    warning: { emoji: '🟡', label: t('twitchPage.delayedLabel'), color: 'text-amber-400' },
    stale: { emoji: '🔴', label: t('twitchPage.stalledLabel'), color: 'text-red-400' },
    pending: { emoji: '⚪', label: t('twitchPage.pendingLabel'), color: 'text-gray-400' },
  };

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');
  const [streamers, setStreamers] = useState<StreamerRow[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!guildId) return;
    loadData();
  }, [guildId]);

  const extractErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data = await res.json();
      return data.message || t('common.requestFailed', { status: res.status });
    } catch {
      return t('common.requestFailed', { status: res.status });
    }
  };

  const loadData = async () => {
    setLoadStatus('loading');
    setLoadErrorMsg('');
    try {
      const res = await fetch(`/api/twitch/${guildId}`);
      if (!res.ok) {
        setLoadErrorMsg(await extractErrorMessage(res));
        setLoadStatus('error');
        return;
      }
      const data = await res.json();
      setStreamers(data.streamers || []);
      setLoadStatus('loaded');
    } catch (err) {
      console.error(err);
      setLoadErrorMsg(t('twitchPage.loadNetworkError'));
      setLoadStatus('error');
    }
  };

  const handleRemove = async (streamer: StreamerRow) => {
    if (!window.confirm(t('twitchPage.confirmStopTracking', { login: streamer.broadcaster_login }))) return;
    setRemovingId(streamer.broadcaster_id);
    try {
      const res = await fetch(`/api/twitch/${guildId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcaster_id: streamer.broadcaster_id }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const detail = data?.subscriptions_also_removed
          ? t('twitchPage.subscriptionAlsoRemoved')
          : t('twitchPage.subscriptionStillActive');
        showToast(t('twitchPage.removedSuccess', { login: streamer.broadcaster_login, detail }), 'success');
        setStreamers((prev) => prev.filter((s) => s.broadcaster_id !== streamer.broadcaster_id));
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('twitchPage.removeNetworkError'), 'error');
    } finally {
      setRemovingId(null);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#949ba4] text-sm">
        {t('twitchPage.loading')}
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-red-400 font-bold">{t('twitchPage.loadFailed')}</p>
        <p className="text-sm text-[#949ba4]">{loadErrorMsg}</p>
        <button
          type="button"
          onClick={loadData}
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black px-6 py-3 rounded-xl"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <SettingsPageContainer className="pb-16">
      <header className="border-b border-[#2b2d31] pb-6">
        <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">{t('twitchPage.title')}</h1>
        <HelpText className="mt-1">
          {t('twitchPage.subtitle')}
        </HelpText>
        <HelpText className="mt-2 normal-case">
          {t('twitchPage.healthLegend')}
        </HelpText>
      </header>

      {streamers.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#2b2d31] rounded-xl bg-[#1e1f22]">
          <p className="text-sm text-gray-400">
            {t('twitchPage.noStreamersYetPrefix')} <code className="text-[#5865F2]">/twitch_channel_set</code> {t('twitchPage.noStreamersYetSuffix')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {streamers.map((s) => {
            const badge = HEALTH_BADGE[s.poll_health];
            return (
              <div key={s.broadcaster_id} className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{s.broadcaster_login}</span>
                    {s.is_live ? (
                      <span className="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded-full">{t('twitchPage.live')}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-500 bg-[#111214] px-2 py-0.5 rounded-full">{t('twitchPage.offline')}</span>
                    )}
                  </div>
                  <span className={`text-[11px] font-bold ${badge.color}`}>
                    {badge.emoji} {badge.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#b5bac1]">
                  <div>
                    <span className="text-[#a1a1aa] uppercase text-[10px] font-bold block">{t('twitchPage.announcementChannel')}</span>
                    {s.announcement_channel_name ? `#${s.announcement_channel_name}` : t('twitchPage.unknownChannel', { id: s.announcement_channel_id })}
                  </div>
                  <div>
                    <span className="text-[#a1a1aa] uppercase text-[10px] font-bold block">{t('twitchPage.lastPollCheck')}</span>
                    {s.last_checked_at
                      ? t('twitchPage.minutesAgo', { minutes: Math.round(s.minutes_since_last_check ?? 0) })
                      : t('twitchPage.neverChecked')}
                  </div>
                  <div>
                    <span className="text-[#a1a1aa] uppercase text-[10px] font-bold block">{t('twitchPage.linkedMember')}</span>
                    {s.member_id ? (s.member_display_name || `Unknown member (${s.member_id})`) : t('twitchPage.notConfiguredDash')}
                  </div>
                  <div>
                    <span className="text-[#a1a1aa] uppercase text-[10px] font-bold block">{t('twitchPage.liveRole')}</span>
                    {s.live_role_id ? (s.live_role_name || `Unknown role (${s.live_role_id})`) : t('twitchPage.notConfiguredDash')}
                  </div>
                </div>

                {s.role_grant_status === 'incomplete' && (
                  <p className="text-[11px] font-bold text-amber-400 bg-amber-950/20 border border-amber-500/20 rounded-lg px-3 py-2">
                    {t('twitchPage.incompleteWarning', {
                      reason: s.member_id ? t('twitchPage.incompleteReasonNoRole') : t('twitchPage.incompleteReasonNoMember'),
                    })}
                  </p>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemove(s)}
                    disabled={removingId === s.broadcaster_id}
                    className="text-[11px] font-black text-red-400 hover:text-white hover:bg-red-600 border border-red-500/30 px-4 py-2 rounded-lg transition-all"
                  >
                    {removingId === s.broadcaster_id ? t('twitchPage.removing') : t('twitchPage.remove')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SettingsPageContainer>
  );
}
