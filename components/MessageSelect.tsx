'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n/LanguageContext';

type Message = { id: string; author: string; preview: string; timestamp: string; jump_url: string };
type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

type MessageSelectProps = {
  guildId: string;
  channelId: string;
  value: string;
  onChange: (messageId: string) => void;
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// Shared message picker for reaction-roles - fetches the target channel's most recent 20 messages
// from /api/guilds/{guildId}/channels/{channelId}/messages and renders them as a clickable list with
// an author/preview/timestamp per card. Falls back to (or can be toggled to) a raw message-ID text
// input, since the list only covers the last 20 messages and can't reach further back, and since a
// failed fetch (bot can't read the channel, network error) shouldn't block picking a message entirely.
export default function MessageSelect({ guildId, channelId, value, onChange }: MessageSelectProps) {
  const t = useT();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    setMessages([]);
    setManualMode(false);
    if (!guildId || !channelId) {
      setLoadStatus('idle');
      return;
    }
    let cancelled = false;
    setLoadStatus('loading');
    fetch(`/api/guilds/${guildId}/channels/${channelId}/messages`)
      .then((res) => {
        if (!res.ok) throw new Error(`messages fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data)) throw new Error('unexpected messages response shape');
        setMessages(data);
        setLoadStatus('loaded');
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[MESSAGE_SELECT] Failed to load message list:', err);
        setLoadStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [guildId, channelId]);

  const inputClassName = 'w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#5865F2]';

  if (!channelId) {
    return <p className="text-sm text-[#6d7178] italic py-2">{t('reactionRolesPage.selectChannelFirstForMessages')}</p>;
  }

  if (manualMode || loadStatus === 'error') {
    return (
      <div className="space-y-1.5">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="123456789012345678"
          className={inputClassName}
        />
        {loadStatus === 'error' && <p className="text-[10px] text-red-400">⚠️ {t('reactionRolesPage.messagesLoadError')}</p>}
        <p className="text-[10px] text-[#6d7178]">{t('reactionRolesPage.findIdsHelp')}</p>
        {loadStatus !== 'error' && (
          <button type="button" onClick={() => setManualMode(false)} className="text-[10px] font-bold text-[#5865F2] hover:underline">
            {t('reactionRolesPage.backToMessageList')}
          </button>
        )}
      </div>
    );
  }

  if (loadStatus === 'loading') {
    return <p className="text-sm text-[#6d7178] italic py-2">{t('reactionRolesPage.loadingMessages')}</p>;
  }

  return (
    <div className="space-y-1.5">
      {messages.length === 0 ? (
        <p className="text-sm text-[#6d7178] italic py-2">{t('reactionRolesPage.noRecentMessages')}</p>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {messages.map((m) => {
            const selected = m.id === value;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange(m.id)}
                className={`w-full text-left bg-[#111214] border rounded-lg px-3 py-2 transition-colors ${
                  selected ? 'border-[#5865F2] bg-[#5865F2]/10' : 'border-[#232428] hover:border-[#3a3c42]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white truncate">{m.author}</span>
                  <span className="text-[10px] text-[#6d7178] shrink-0">{formatTimestamp(m.timestamp)}</span>
                </div>
                <p className="text-[11px] text-[#b5bac1] truncate mt-0.5">{m.preview}</p>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[#6d7178]">{t('reactionRolesPage.manualEntryHint')}</p>
        <button type="button" onClick={() => setManualMode(true)} className="text-[10px] font-bold text-[#5865F2] hover:underline shrink-0">
          {t('reactionRolesPage.enterManually')}
        </button>
      </div>
    </div>
  );
}
