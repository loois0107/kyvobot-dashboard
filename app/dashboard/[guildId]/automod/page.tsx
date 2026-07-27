'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import {
  AUTOMOD_SPAM_LIMIT_MIN,
  AUTOMOD_SPAM_LIMIT_MAX,
  AUTOMOD_SPAM_INTERVAL_MIN_SECONDS,
  AUTOMOD_SPAM_INTERVAL_MAX_SECONDS,
  AUTOMOD_TIMEOUT_MIN_SECONDS,
  AUTOMOD_TIMEOUT_MAX_SECONDS,
  AUTOMOD_MAX_CHARS_MIN,
  AUTOMOD_MAX_CHARS_MAX,
  AUTOMOD_MAX_LINES_MIN,
  AUTOMOD_MAX_LINES_MAX,
  AUTOMOD_FORBIDDEN_WORD_MAX_LENGTH,
  AUTOMOD_FORBIDDEN_WORDS_MAX_COUNT,
  DEFAULT_AUTOMOD_SETTINGS,
} from '@/lib/automodSettings';

type LoadStatus = 'loading' | 'loaded' | 'error';

export default function AutomodSettingsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const guildId = (params?.guildId as string) || '';

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [spamLimit, setSpamLimit] = useState(DEFAULT_AUTOMOD_SETTINGS.spam_limit);
  const [spamIntervalSeconds, setSpamIntervalSeconds] = useState(DEFAULT_AUTOMOD_SETTINGS.spam_interval_seconds);
  const [timeoutSeconds, setTimeoutSeconds] = useState(DEFAULT_AUTOMOD_SETTINGS.timeout_seconds);
  const [maxChars, setMaxChars] = useState(DEFAULT_AUTOMOD_SETTINGS.max_chars);
  const [maxLines, setMaxLines] = useState(DEFAULT_AUTOMOD_SETTINGS.max_lines);
  const [forbiddenWordsText, setForbiddenWordsText] = useState('');

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
      const res = await fetch(`/api/automod-settings/${guildId}`);
      if (!res.ok) {
        setLoadErrorMsg(await extractErrorMessage(res));
        setLoadStatus('error');
        return;
      }
      const data = await res.json();
      const s = data.automod_settings || DEFAULT_AUTOMOD_SETTINGS;
      setSpamLimit(s.spam_limit);
      setSpamIntervalSeconds(s.spam_interval_seconds);
      setTimeoutSeconds(s.timeout_seconds);
      setMaxChars(s.max_chars ?? DEFAULT_AUTOMOD_SETTINGS.max_chars);
      setMaxLines(s.max_lines ?? DEFAULT_AUTOMOD_SETTINGS.max_lines);
      setForbiddenWordsText((s.forbidden_words || []).join('\n'));
      setIsDirty(false);
      setLoadStatus('loaded');
    } catch (err) {
      console.error(err);
      setLoadErrorMsg('Network error while loading automod settings.');
      setLoadStatus('error');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/automod-settings/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spam_limit: spamLimit,
          spam_interval_seconds: spamIntervalSeconds,
          timeout_seconds: timeoutSeconds,
          max_chars: maxChars,
          max_lines: maxLines,
          forbidden_words_text: forbiddenWordsText,
        }),
      });
      if (res.ok) {
        showToast('AutoMod settings saved!', 'success');
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
        Loading AutoMod settings...
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-red-400 font-bold">⚠️ Failed to load AutoMod settings</p>
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

  const wordCount = forbiddenWordsText.split('\n').map((w) => w.trim()).filter(Boolean).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-28">
      <header className="border-b border-[#2b2d31] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">🛡️ AutoMod Settings</h1>
          <p className="text-[10px] text-[#57576F] mt-1 tracking-widest uppercase">
            Spam detection thresholds and forbidden word list
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
          Spam Detection
        </h3>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#b5bac1]">
            Message Limit ({AUTOMOD_SPAM_LIMIT_MIN}-{AUTOMOD_SPAM_LIMIT_MAX} messages)
          </label>
          <input
            type="number"
            min={AUTOMOD_SPAM_LIMIT_MIN}
            max={AUTOMOD_SPAM_LIMIT_MAX}
            value={spamLimit}
            onChange={(e) => { setSpamLimit(parseInt(e.target.value) || 0); setIsDirty(true); }}
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#5865F2]"
          />
          <p className="text-[10px] text-[#57576F]">More than this many messages within the time window triggers automod.</p>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-[#b5bac1]">
            Time Window ({AUTOMOD_SPAM_INTERVAL_MIN_SECONDS}-{AUTOMOD_SPAM_INTERVAL_MAX_SECONDS} seconds)
          </label>
          <input
            type="number"
            min={AUTOMOD_SPAM_INTERVAL_MIN_SECONDS}
            max={AUTOMOD_SPAM_INTERVAL_MAX_SECONDS}
            value={spamIntervalSeconds}
            onChange={(e) => { setSpamIntervalSeconds(parseInt(e.target.value) || 0); setIsDirty(true); }}
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#5865F2]"
          />
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-[#b5bac1]">
            Timeout Duration ({AUTOMOD_TIMEOUT_MIN_SECONDS}-{AUTOMOD_TIMEOUT_MAX_SECONDS} seconds)
          </label>
          <input
            type="number"
            min={AUTOMOD_TIMEOUT_MIN_SECONDS}
            max={AUTOMOD_TIMEOUT_MAX_SECONDS}
            value={timeoutSeconds}
            onChange={(e) => { setTimeoutSeconds(parseInt(e.target.value) || 0); setIsDirty(true); }}
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#5865F2]"
          />
          <p className="text-[10px] text-[#57576F]">How long a member is timed out for when they trip the spam threshold.</p>
        </div>
      </div>

      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
        <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          Message Shape
        </h3>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#b5bac1]">
            Max Characters ({AUTOMOD_MAX_CHARS_MIN}-{AUTOMOD_MAX_CHARS_MAX} chars)
          </label>
          <input
            type="number"
            min={AUTOMOD_MAX_CHARS_MIN}
            max={AUTOMOD_MAX_CHARS_MAX}
            value={maxChars}
            onChange={(e) => { setMaxChars(parseInt(e.target.value) || 0); setIsDirty(true); }}
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#5865F2]"
          />
          <p className="text-[10px] text-[#57576F]">A single message longer than this (outside of code blocks) is deleted, regardless of send rate.</p>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-[#b5bac1]">
            Max Lines ({AUTOMOD_MAX_LINES_MIN}-{AUTOMOD_MAX_LINES_MAX} lines)
          </label>
          <input
            type="number"
            min={AUTOMOD_MAX_LINES_MIN}
            max={AUTOMOD_MAX_LINES_MAX}
            value={maxLines}
            onChange={(e) => { setMaxLines(parseInt(e.target.value) || 0); setIsDirty(true); }}
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#5865F2]"
          />
          <p className="text-[10px] text-[#57576F]">A single message with more line breaks than this (outside of code blocks) is deleted.</p>
        </div>
      </div>

      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-2 shadow-xl">
        <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          Forbidden Words
        </h3>
        <label className="text-xs font-bold text-[#b5bac1] block">
          One word per line ({wordCount}/{AUTOMOD_FORBIDDEN_WORDS_MAX_COUNT}, {AUTOMOD_FORBIDDEN_WORD_MAX_LENGTH} chars max each)
        </label>
        <textarea
          value={forbiddenWordsText}
          onChange={(e) => { setForbiddenWordsText(e.target.value); setIsDirty(true); }}
          rows={8}
          placeholder="badword1\nbadword2"
          className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#5865F2]"
        />
        <p className="text-[10px] text-[#57576F]">Case-sensitive substring match - a message containing any of these words anywhere is deleted.</p>
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
