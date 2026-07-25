'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import {
  PARTY_CARD_LIFETIME_MIN_MINUTES,
  PARTY_CARD_LIFETIME_MAX_MINUTES,
  PARTY_CHANNEL_LIFETIME_MIN_HOURS,
  PARTY_CHANNEL_LIFETIME_MAX_HOURS,
  DEFAULT_PARTY_SETTINGS,
} from '@/lib/partySettings';

const COLOR_PRESETS = ['#5865F2', '#23A55A', '#FEE75C', '#EB459E', '#ED4245', '#9B59B6', '#00D2D3', '#54A0FF'];

type LoadStatus = 'loading' | 'loaded' | 'error';

export default function PartySettingsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const guildId = (params?.guildId as string) || '';

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [cardColor, setCardColor] = useState(DEFAULT_PARTY_SETTINGS.card_color);
  const [cardDescription, setCardDescription] = useState(DEFAULT_PARTY_SETTINGS.card_description);
  const [cardLifetimeMinutes, setCardLifetimeMinutes] = useState(DEFAULT_PARTY_SETTINGS.card_lifetime_minutes);
  const [channelLifetimeHours, setChannelLifetimeHours] = useState(DEFAULT_PARTY_SETTINGS.channel_lifetime_hours);
  const [gameName, setGameName] = useState(DEFAULT_PARTY_SETTINGS.game_name);
  const [cardThumbnailUrl, setCardThumbnailUrl] = useState('https://64.media.tumblr.com/1847d62bf566d47632f841c2ac0583ee/a72c90eea4141e92-5e/s1280x1920/c3d5902f839874fc3be572aaef35c47470bce4df.png');

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
      const res = await fetch(`/api/party-settings/${guildId}`);
      if (!res.ok) {
        setLoadErrorMsg(await extractErrorMessage(res));
        setLoadStatus('error');
        return;
      }
      const data = await res.json();
      const s = data.party_settings || DEFAULT_PARTY_SETTINGS;
      setCardColor(s.card_color);
      setCardDescription(s.card_description);
      setCardLifetimeMinutes(s.card_lifetime_minutes);
      setChannelLifetimeHours(s.channel_lifetime_hours);
      setGameName(s.game_name || '');
      setCardThumbnailUrl(s.card_thumbnail_url || 'https://64.media.tumblr.com/1847d62bf566d47632f841c2ac0583ee/a72c90eea4141e92-5e/s1280x1920/c3d5902f839874fc3be572aaef35c47470bce4df.png');
      setIsDirty(false);
      setLoadStatus('loaded');
    } catch (err) {
      console.error(err);
      setLoadErrorMsg('Network error while loading party settings.');
      setLoadStatus('error');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/party-settings/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_color: cardColor,
          card_description: cardDescription,
          card_lifetime_minutes: cardLifetimeMinutes,
          channel_lifetime_hours: channelLifetimeHours,
          game_name: gameName,
          card_thumbnail_url: cardThumbnailUrl,
        }),
      });
      if (res.ok) {
        showToast('Party settings saved! New recruitments will use these.', 'success');
        setIsDirty(false);
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while saving.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#949ba4] text-sm">
        Loading party settings...
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-red-400 font-bold">⚠️ Failed to load party settings</p>
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
    <div className="max-w-3xl mx-auto space-y-6 pb-28">
      <header className="border-b border-[#2b2d31] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">🎮 Party Recruitment Settings</h1>
          <p className="text-[10px] text-[#57576F] mt-1 tracking-widest uppercase">
            Applies to new /party_recruit posts - existing ones are unaffected
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black px-6 py-3 rounded-xl shadow-lg tracking-widest transition-all"
        >
          {isSaving ? 'SAVING...' : 'SAVE'}
        </button>
      </header>

      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
        <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          Preview (recruiting state only)
        </h3>
        <div className="rounded-xl p-4 border-l-4 bg-[#111214] flex items-start justify-between gap-4" style={{ borderColor: cardColor }}>
          <div className="min-w-0">
            {gameName && <p className="text-[10px] font-bold text-[#949ba4] mb-1">🎮 {gameName}</p>}
            <p className="text-sm font-bold text-white">Looking for Duo - Solo Queue</p>
            {cardDescription && <p className="text-xs text-[#b5bac1] mt-2 whitespace-pre-wrap">{cardDescription}</p>}
          </div>
          {cardThumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cardThumbnailUrl}
              alt=""
              className="w-14 h-14 rounded-lg object-cover shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-[#b5bac1]">Card Accent Color</label>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { setCardColor(p); setIsDirty(true); }}
                className={`w-6 h-6 rounded-full border ${cardColor.toLowerCase() === p.toLowerCase() ? 'border-white scale-110' : 'border-transparent opacity-60'}`}
                style={{ backgroundColor: p }}
              />
            ))}
            <input
              type="text"
              value={cardColor}
              onChange={(e) => { setCardColor(e.target.value); setIsDirty(true); }}
              className="w-24 bg-[#111214] border border-[#232428] rounded-lg px-2 text-[10px] text-white font-mono focus:outline-none focus:border-[#5865F2]"
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-[#b5bac1]">Recruitment Card Message (optional)</label>
          <textarea
            value={cardDescription}
            onChange={(e) => { setCardDescription(e.target.value); setIsDirty(true); }}
            rows={3}
            placeholder="e.g. Please be respectful and use the mic!"
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#5865F2]"
          />
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-[#b5bac1]">Game Name (optional)</label>
          <input
            type="text"
            value={gameName}
            onChange={(e) => { setGameName(e.target.value); setIsDirty(true); }}
            maxLength={256}
            placeholder="e.g. League of Legends"
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#5865F2]"
          />
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-[#b5bac1]">Card Thumbnail Image URL (optional)</label>
          <input
            type="text"
            value={cardThumbnailUrl}
            onChange={(e) => { setCardThumbnailUrl(e.target.value); setIsDirty(true); }}
            placeholder="https://..."
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#5865F2]"
          />
          <p className="text-[10px] text-[#57576F]">Checked on save. If it later becomes unreachable, the card still posts without the thumbnail.</p>
        </div>
      </div>

      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
        <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          Timers
        </h3>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#b5bac1]">
            Recruitment Card Auto-Close ({PARTY_CARD_LIFETIME_MIN_MINUTES}-{PARTY_CARD_LIFETIME_MAX_MINUTES} minutes)
          </label>
          <input
            type="number"
            min={PARTY_CARD_LIFETIME_MIN_MINUTES}
            max={PARTY_CARD_LIFETIME_MAX_MINUTES}
            value={cardLifetimeMinutes}
            onChange={(e) => { setCardLifetimeMinutes(parseInt(e.target.value) || 0); setIsDirty(true); }}
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#5865F2]"
          />
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-[#b5bac1]">
            Party Channel Auto-Delete ({PARTY_CHANNEL_LIFETIME_MIN_HOURS}-{PARTY_CHANNEL_LIFETIME_MAX_HOURS} hours)
          </label>
          <input
            type="number"
            min={PARTY_CHANNEL_LIFETIME_MIN_HOURS}
            max={PARTY_CHANNEL_LIFETIME_MAX_HOURS}
            value={channelLifetimeHours}
            onChange={(e) => { setChannelLifetimeHours(parseInt(e.target.value) || 0); setIsDirty(true); }}
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#5865F2]"
          />
        </div>
      </div>

      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1e1f22]/95 border border-[#FFD700]/50 px-6 py-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-8 backdrop-blur-md w-[90%] max-w-xl">
          <span className="text-xs font-bold text-gray-200">⚠️ You have unsaved changes</span>
          <div className="flex gap-3">
            <button type="button" onClick={loadData} className="text-xs font-bold text-gray-400 hover:text-white transition">
              Discard
            </button>
            <button type="button" onClick={handleSave} className="bg-[#23A55A] hover:bg-[#1a7f43] text-white text-xs font-black px-5 py-2 rounded-lg">
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}