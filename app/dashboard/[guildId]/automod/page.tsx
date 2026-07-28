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
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';

type LoadStatus = 'loading' | 'loaded' | 'error';

export default function AutomodSettingsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const t = useT();
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
      return data.message || t('common.requestFailed', { status: res.status });
    } catch {
      return t('common.requestFailed', { status: res.status });
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
      setLoadErrorMsg(t('automodPage.loadNetworkError'));
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
        showToast(t('automodPage.saveSuccess'), 'success');
        setIsDirty(false);
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('automodPage.networkError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#949ba4] text-sm">
        {t('automodPage.loading')}
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-red-400 font-bold">{t('automodPage.loadFailed')}</p>
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

  const wordCount = forbiddenWordsText.split('\n').map((w) => w.trim()).filter(Boolean).length;

  return (
    <SettingsPageContainer className="pb-28">
      <header className="border-b border-[#2b2d31] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">{t('automodPage.title')}</h1>
          <HelpText className="mt-1 tracking-widest uppercase">
            {t('automodPage.subtitle')}
          </HelpText>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black px-6 py-3 rounded-xl shadow-lg tracking-widest transition-all"
        >
          {isSaving ? t('common.saving') : t('common.save')}
        </button>
      </header>

      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
        <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          {t('automodPage.spamDetectionTitle')}
        </h3>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#b5bac1]">
            {t('automodPage.messageLimitLabel', { min: AUTOMOD_SPAM_LIMIT_MIN, max: AUTOMOD_SPAM_LIMIT_MAX })}
          </label>
          <input
            type="number"
            min={AUTOMOD_SPAM_LIMIT_MIN}
            max={AUTOMOD_SPAM_LIMIT_MAX}
            value={spamLimit}
            onChange={(e) => { setSpamLimit(parseInt(e.target.value) || 0); setIsDirty(true); }}
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#5865F2]"
          />
          <HelpText>{t('automodPage.messageLimitHelp')}</HelpText>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-[#b5bac1]">
            {t('automodPage.timeWindowLabel', { min: AUTOMOD_SPAM_INTERVAL_MIN_SECONDS, max: AUTOMOD_SPAM_INTERVAL_MAX_SECONDS })}
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
            {t('automodPage.timeoutDurationLabel', { min: AUTOMOD_TIMEOUT_MIN_SECONDS, max: AUTOMOD_TIMEOUT_MAX_SECONDS })}
          </label>
          <input
            type="number"
            min={AUTOMOD_TIMEOUT_MIN_SECONDS}
            max={AUTOMOD_TIMEOUT_MAX_SECONDS}
            value={timeoutSeconds}
            onChange={(e) => { setTimeoutSeconds(parseInt(e.target.value) || 0); setIsDirty(true); }}
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#5865F2]"
          />
          <HelpText>{t('automodPage.timeoutDurationHelp')}</HelpText>
        </div>
      </div>

      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
        <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          {t('automodPage.messageShapeTitle')}
        </h3>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#b5bac1]">
            {t('automodPage.maxCharsLabel', { min: AUTOMOD_MAX_CHARS_MIN, max: AUTOMOD_MAX_CHARS_MAX })}
          </label>
          <input
            type="number"
            min={AUTOMOD_MAX_CHARS_MIN}
            max={AUTOMOD_MAX_CHARS_MAX}
            value={maxChars}
            onChange={(e) => { setMaxChars(parseInt(e.target.value) || 0); setIsDirty(true); }}
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#5865F2]"
          />
          <HelpText>{t('automodPage.maxCharsHelp')}</HelpText>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-[#b5bac1]">
            {t('automodPage.maxLinesLabel', { min: AUTOMOD_MAX_LINES_MIN, max: AUTOMOD_MAX_LINES_MAX })}
          </label>
          <input
            type="number"
            min={AUTOMOD_MAX_LINES_MIN}
            max={AUTOMOD_MAX_LINES_MAX}
            value={maxLines}
            onChange={(e) => { setMaxLines(parseInt(e.target.value) || 0); setIsDirty(true); }}
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#5865F2]"
          />
          <HelpText>{t('automodPage.maxLinesHelp')}</HelpText>
        </div>
      </div>

      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-2 shadow-xl">
        <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          {t('automodPage.forbiddenWordsTitle')}
        </h3>
        <label className="text-xs font-bold text-[#b5bac1] block">
          {t('automodPage.forbiddenWordsLabel', { count: wordCount, max: AUTOMOD_FORBIDDEN_WORDS_MAX_COUNT, maxLen: AUTOMOD_FORBIDDEN_WORD_MAX_LENGTH })}
        </label>
        <textarea
          value={forbiddenWordsText}
          onChange={(e) => { setForbiddenWordsText(e.target.value); setIsDirty(true); }}
          rows={8}
          placeholder={t('automodPage.forbiddenWordsPlaceholder')}
          className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#5865F2]"
        />
        <HelpText>{t('automodPage.forbiddenWordsHelp')}</HelpText>
      </div>

      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1e1f22]/95 border border-[#FFD700]/50 px-6 py-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-8 backdrop-blur-md w-[90%] max-w-xl">
          <span className="text-xs font-bold text-gray-200">{t('common.unsavedChanges')}</span>
          <div className="flex gap-3">
            <button type="button" onClick={loadData} className="text-xs font-bold text-gray-400 hover:text-white transition">
              {t('common.discard')}
            </button>
            <button type="button" onClick={handleSave} className="bg-[#23A55A] hover:bg-[#1a7f43] text-white text-xs font-black px-5 py-2 rounded-lg">
              {t('common.save')}
            </button>
          </div>
        </div>
      )}
    </SettingsPageContainer>
  );
}
