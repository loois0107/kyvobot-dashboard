'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import ChannelSelect from '@/components/ChannelSelect';
import { useGuildName } from '@/components/GuildsContext';
import ConfiguredBadge from '@/components/ConfiguredBadge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function VoiceSettingsPage() {
  const params = useParams();
  const t = useT();
  const guildId = params?.guildId as string | undefined;
  const guildName = useGuildName(guildId);

  const [triggerChannelId, setTriggerChannelId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const isConfigured = Boolean(triggerChannelId.trim());

  const fetchSettings = () => {
    if (!guildId || guildId === '[guildId]') return;
    setLoading(true);
    setMessage('');
    setMessageType(null);

    fetch(`/api/voice-settings/${guildId}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.ok) {
          setTriggerChannelId(data.voice_settings?.trigger_channel_id || '');
        } else {
          setMessage(`${t('voicePage.loadFailedPrefix')} [${res.status}]: ${data.error || t('voicePage.unknownError')}`);
          setMessageType('error');
        }
        setLoading(false);
        setHasLoaded(true);
      })
      .catch((err) => {
        console.error(err);
        setMessage(t('voicePage.fetchFailed'));
        setMessageType('error');
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
    setMessageType(null);

    try {
      const res = await fetch(`/api/voice-settings/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_channel_id: triggerChannelId || null }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setMessage(t('voicePage.saveSuccess'));
        setMessageType('success');
      } else {
        setMessage(`${t('voicePage.saveFailedPrefix')} [${res.status}]: ${data.error || t('voicePage.unknownError')}`);
        setMessageType('error');
      }
    } catch (err) {
      console.error(err);
      setMessage(t('voicePage.saveFailed'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary p-6 font-mono selection:bg-brand/20">
      <SettingsPageContainer>
        <header className="mb-8 border-b border-border-default pb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-brand">{t('voicePage.title')}</h1>
            <HelpText className="mt-1">
              {t('voicePage.subtitle')}
            </HelpText>
          </div>
          {hasLoaded && <ConfiguredBadge configured={isConfigured} />}
        </header>

        <Card className="flex flex-col gap-6">
          <div>
            <label className="text-sm text-text-secondary block mb-1">{t('common.activeContext')}</label>
            <div className="w-full bg-bg-elevated border border-border-default text-base text-text-primary px-3 py-2 rounded font-bold select-none">
              {guildName || (guildId ? `${t('common.guildLabel')} ${guildId}` : t('common.loading'))}
            </div>
          </div>

          <div className="bg-bg-elevated border border-border-default rounded-lg p-3 text-[11px] text-text-secondary leading-relaxed">
            {t('voicePage.explainer')}
          </div>

          <div>
            <label className="text-sm text-text-secondary block mb-1">{t('voicePage.triggerChannelLabel')}</label>
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
            <div
              className={`text-sm text-center p-3 rounded border break-all whitespace-pre-wrap ${
                messageType === 'success'
                  ? 'bg-success/10 border-success/20 text-success'
                  : 'bg-danger/10 border-danger/20 text-danger'
              }`}
            >
              {message}
            </div>
          )}

          <Button type="button" variant="primary" onClick={handleSave} disabled={loading} className="w-full text-base">
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </Card>
      </SettingsPageContainer>
    </div>
  );
}
