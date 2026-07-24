'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';

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
}

type LoadStatus = 'loading' | 'loaded' | 'error';

const HEALTH_BADGE: Record<StreamerRow['poll_health'], { emoji: string; label: string; color: string }> = {
  healthy: { emoji: '🟢', label: 'Polling healthy', color: 'text-green-400' },
  warning: { emoji: '🟡', label: 'Polling delayed', color: 'text-amber-400' },
  stale: { emoji: '🔴', label: 'Polling stalled', color: 'text-red-400' },
  pending: { emoji: '⚪', label: 'Awaiting first check', color: 'text-gray-400' },
};

export default function TwitchStreamersSettings() {
  const params = useParams();
  const { showToast } = useToast();
  const guildId = (params?.guildId as string) || '';

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
      return data.message || `Request failed (${res.status})`;
    } catch {
      return `Request failed (${res.status})`;
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
      setLoadErrorMsg('Network error while loading streamer data.');
      setLoadStatus('error');
    }
  };

  const handleRemove = async (streamer: StreamerRow) => {
    if (!window.confirm(`Stop tracking ${streamer.broadcaster_login}? This can't be undone from here.`)) return;
    setRemovingId(streamer.broadcaster_id);
    try {
      const res = await fetch(`/api/twitch/${guildId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcaster_id: streamer.broadcaster_id }),
      });
      if (res.ok) {
        showToast(`${streamer.broadcaster_login} removed.`, 'success');
        setStreamers((prev) => prev.filter((s) => s.broadcaster_id !== streamer.broadcaster_id));
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while removing.', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#949ba4] text-sm">
        Loading streamers...
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-red-400 font-bold">⚠️ Failed to load streamer data</p>
        <p className="text-sm text-[#949ba4]">{loadErrorMsg}</p>
        <button
          type="button"
          onClick={loadData}
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black px-6 py-3 rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <header className="border-b border-[#2b2d31] pb-6">
        <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">📺 Twitch Streamers</h1>
        <p className="text-[10px] text-[#57576F] mt-1 tracking-widest uppercase">
          Registered via /twitch_channel_set - live announcements &amp; role grants
        </p>
      </header>

      {streamers.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#2b2d31] rounded-xl bg-[#1e1f22]">
          <p className="text-sm text-gray-400">
            No Twitch streamers registered yet. Use <code className="text-[#5865F2]">/twitch_channel_set</code> in Discord to add one.
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
                      <span className="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded-full">🔴 LIVE</span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-500 bg-[#111214] px-2 py-0.5 rounded-full">Offline</span>
                    )}
                  </div>
                  <span className={`text-[11px] font-bold ${badge.color}`}>
                    {badge.emoji} {badge.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#b5bac1]">
                  <div>
                    <span className="text-[#57576F] uppercase text-[10px] font-bold block">Announcement Channel</span>
                    {s.announcement_channel_name ? `#${s.announcement_channel_name}` : `Unknown (${s.announcement_channel_id})`}
                  </div>
                  <div>
                    <span className="text-[#57576F] uppercase text-[10px] font-bold block">Role Grant Target</span>
                    {s.member_id ? (s.member_display_name || `Unknown member (${s.member_id})`) : '— not configured —'}
                  </div>
                  <div>
                    <span className="text-[#57576F] uppercase text-[10px] font-bold block">Last Poll Check</span>
                    {s.last_checked_at
                      ? `${Math.round(s.minutes_since_last_check ?? 0)} min ago`
                      : 'Never checked yet'}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemove(s)}
                    disabled={removingId === s.broadcaster_id}
                    className="text-[11px] font-black text-red-400 hover:text-white hover:bg-red-600 border border-red-500/30 px-4 py-2 rounded-lg transition-all"
                  >
                    {removingId === s.broadcaster_id ? 'Removing...' : '🗑️ Remove'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
