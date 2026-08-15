'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import ChannelSelect from '@/components/ChannelSelect';
import { useGuildName } from '@/components/GuildsContext';
import ConfiguredBadge from '@/components/ConfiguredBadge';

export default function VoiceSettingsPage() {
  const params = useParams();
  const t = useT();
  const guildId = params?.guildId as string | undefined;
  const guildName = useGuildName(guildId);

  const [triggerChannelId, setTriggerChannelId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  const isConfigured = Boolean(triggerChannelId.trim());

  const fetchSettings = () => {
    if (!guildId || guildId === '[guildId]') return;
    setLoading(true);
    setMessage('');

    fetch(`/api/voice-settings/${guildId}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.ok) {
          setTriggerChannelId(data.voice_settings?.trigger_channel_id || '');
        } else {
          setMessage(`${t('voicePage.loadFailedPrefix')} [${res.status}]: ${data.error || t('voicePage.unknownError')}`);
        }
        setLoading(false);
        setHasLoaded(true);
      })
      .catch((err) => {
        console.error(err);
        setMessage(t('voicePage.fetchFailed'));
        setLoading(false);
        setHasLoaded(true);
      });
  };

  useEffect(() => {
    fetchSettings();
  }, [guildId]);

  const handleSave = async () => {
    if (!guildId || guildId === '[guildId]') return;
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/voice-settings/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_channel_id: triggerChannelId || null }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setMessage(t('voicePage.saveSuccess'));
      } else {
        setMessage(`${t('voicePage.saveFailedPrefix')} [${res.status}]: ${data.error || t('voicePage.unknownError')}`);
      }
    } catch (err) {
      console.error(err);
      setMessage(t('voicePage.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white p-6 font-mono selection:bg-[#2A1F40]">
      <SettingsPageContainer>
        <header className="mb-8 border-b border-[#2A1F40] pb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-purple-400">{t('voicePage.title')}</h1>
            <HelpText className="mt-1">
              {t('voicePage.subtitle')}
            </HelpText>
          </div>
          {hasLoaded && <ConfiguredBadge configured={isConfigured} />}
        </header>

        <div className="flex flex-col gap-6 bg-[#161626] border border-[#2A1F40] p-6 rounded-xl shadow-xl">
          <div>
            <label className="text-sm text-gray-400 block mb-1">{t('common.activeContext')}</label>
            <div className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-base text-purple-400 px-3 py-2 rounded font-bold select-none">
              {guildName || (guildId ? `${t('common.guildLabel')} ${guildId}` : t('common.loading'))}
            </div>
          </div>

          <div className="bg-[#0F0F1A] border border-[#2A1F40] rounded-lg p-3 text-[11px] text-gray-300 leading-relaxed">
            {t('voicePage.explainer')}
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">{t('voicePage.triggerChannelLabel')}</label>
            <ChannelSelect
              guildId={guildId || ''}
              value={triggerChannelId}
              onChange={setTriggerChannelId}
              className="px-3 py-2"
            />
            <HelpText className="mt-2">
              {t('voicePage.triggerChannelHelp')}
            </HelpText>
          </div>

          {message && (
            <div className="bg-[#0F0F1A] border border-purple-900/50 text-sm text-center p-3 rounded text-gray-300 break-all whitespace-pre-wrap">
              {message}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full text-base bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white px-4 py-2 rounded font-bold"
          >
            {loading ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </SettingsPageContainer>
    </div>
  );
}
