'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n/LanguageContext';

type Channel = { id: string; name: string };
type LoadStatus = 'loading' | 'loaded' | 'error';

type ChannelSelectProps = {
  guildId: string;
  value: string;
  onChange: (channelId: string) => void;
  className?: string;
};

// Shared channel picker for the settings pages that used to take a raw channel ID as free text -
// fetches this guild's text/announcement channels from /api/guilds/{guildId}/channels and renders
// them as a <select>. Falls back to the old text input if the channel list can't be loaded, so a
// bot-token/API outage doesn't block admins from still typing an ID by hand.
export default function ChannelSelect({ guildId, value, onChange, className = '' }: ChannelSelectProps) {
  const t = useT();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');

  useEffect(() => {
    if (!guildId) return;
    let cancelled = false;
    setLoadStatus('loading');
    fetch(`/api/guilds/${guildId}/channels`)
      .then((res) => {
        if (!res.ok) throw new Error(`channels fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data)) throw new Error('unexpected channels response shape');
        setChannels(data);
        setLoadStatus('loaded');
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[CHANNEL_SELECT] Failed to load channel list:', err);
        setLoadStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [guildId]);

  const baseClassName = `w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2] ${className}`;

  if (loadStatus === 'error') {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        placeholder={t('common.egPlaceholderId')}
        className={baseClassName}
      />
    );
  }

  // The saved channel may no longer exist in the freshly-fetched list (deleted channel, bot kicked
  // from it, etc.) - surface it as its own option instead of silently falling back to "no selection"
  // and losing the reference the moment the admin saves again.
  const selectedMissingFromList = value && loadStatus === 'loaded' && !channels.some((c) => c.id === value);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loadStatus === 'loading'}
      className={`${baseClassName} disabled:opacity-50 cursor-pointer`}
    >
      <option value="">{loadStatus === 'loading' ? t('common.loadingChannels') : t('common.selectChannel')}</option>
      {selectedMissingFromList && <option value={value}>{t('common.unknownChannel', { id: value })}</option>}
      {channels.map((c) => (
        <option key={c.id} value={c.id}>
          #{c.name}
        </option>
      ))}
    </select>
  );
}
