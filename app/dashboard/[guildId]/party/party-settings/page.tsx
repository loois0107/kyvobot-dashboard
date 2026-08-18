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
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import ChannelSelect from '@/components/ChannelSelect';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const COLOR_PRESETS = ['#5865F2', '#23A55A', '#FEE75C', '#EB459E', '#ED4245', '#9B59B6', '#00D2D3', '#54A0FF'];

type LoadStatus = 'loading' | 'loaded' | 'error';

export default function PartySettingsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const t = useT();
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

  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(false);
  const [weeklyReportChannelId, setWeeklyReportChannelId] = useState('');

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
      const [res, reportRes] = await Promise.all([
        fetch(`/api/party-settings/${guildId}`),
        fetch(`/api/weekly-report-settings/${guildId}`),
      ]);
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
      setCardThumbnailUrl(s.card_thumbnail_url || 'https://i.ibb.co/4wBTDHsz/R.jpg');

      if (reportRes.ok) {
        const reportData = await reportRes.json();
        const r = reportData.weekly_report_settings || {};
        setWeeklyReportEnabled(!!r.enabled);
        setWeeklyReportChannelId(r.channel_id ? String(r.channel_id) : '');
      }

      setIsDirty(false);
      setLoadStatus('loaded');
    } catch (err) {
      console.error(err);
      setLoadErrorMsg(t('partySettingsPage.loadNetworkError'));
      setLoadStatus('error');
    }
  };

  const handleSave = async () => {
    if (weeklyReportEnabled && !weeklyReportChannelId.trim()) {
      showToast(t('partySettingsPage.missingReportChannel'), 'error');
      return;
    }

    setIsSaving(true);
    try {
      const [res, reportRes] = await Promise.all([
        fetch(`/api/party-settings/${guildId}`, {
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
        }),
        fetch(`/api/weekly-report-settings/${guildId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: weeklyReportEnabled,
            channel_id: weeklyReportChannelId.trim(),
          }),
        }),
      ]);
      if (res.ok && reportRes.ok) {
        showToast(t('partySettingsPage.saveSuccess'), 'success');
        setIsDirty(false);
      } else {
        showToast(await extractErrorMessage(res.ok ? reportRes : res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('partySettingsPage.saveNetworkError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-text-secondary text-base">
        {t('partySettingsPage.loadingSettings')}
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-danger font-bold">{t('partySettingsPage.loadFailed')}</p>
        <p className="text-base text-text-secondary">{loadErrorMsg}</p>
        <Button type="button" variant="primary" onClick={loadData}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <SettingsPageContainer className="pb-28">
      <header className="border-b border-border-default pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-brand">{t('partySettingsPage.title')}</h1>
          <HelpText className="mt-1">
            {t('partySettingsPage.subtitle')}
          </HelpText>
        </div>
        <Button type="button" variant="primary" onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? t('common.saving') : t('common.save')}
        </Button>
      </header>

      <Card className="space-y-4">
        <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
          {t('partySettingsPage.previewTitle')}
        </h3>
        <div className="rounded-xl p-4 border-l-4 bg-bg-elevated flex items-start justify-between gap-4" style={{ borderColor: cardColor }}>
          <div className="min-w-0">
            {gameName && <p className="text-[10px] font-bold text-text-secondary mb-1">🎮 {gameName}</p>}
            <p className="text-base font-bold text-text-primary">{t('partySettingsPage.previewLine')}</p>
            {cardDescription && <p className="text-sm text-text-secondary mt-2 whitespace-pre-wrap">{cardDescription}</p>}
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
          <label className="text-sm font-bold text-text-secondary">{t('partySettingsPage.colorLabel')}</label>
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
              className="w-24 bg-bg-elevated border border-border-default rounded-lg px-2 text-[10px] text-text-primary font-mono focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-sm font-bold text-text-secondary">{t('partySettingsPage.descLabel')}</label>
          <textarea
            value={cardDescription}
            onChange={(e) => { setCardDescription(e.target.value); setIsDirty(true); }}
            rows={3}
            placeholder={t('partySettingsPage.descPlaceholder')}
            className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand"
          />
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-sm font-bold text-text-secondary">{t('partySettingsPage.gameNameLabel')}</label>
          <input
            type="text"
            value={gameName}
            onChange={(e) => { setGameName(e.target.value); setIsDirty(true); }}
            maxLength={256}
            placeholder={t('partySettingsPage.gameNamePlaceholder')}
            className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand"
          />
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-sm font-bold text-text-secondary">{t('partySettingsPage.thumbnailLabel')}</label>
          <input
            type="text"
            value={cardThumbnailUrl}
            onChange={(e) => { setCardThumbnailUrl(e.target.value); setIsDirty(true); }}
            placeholder="https://..."
            className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary font-mono focus:outline-none focus:border-brand"
          />
          <HelpText>{t('partySettingsPage.thumbnailHelp')}</HelpText>
        </div>
      </Card>

      <Card className="space-y-4">
        <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
          {t('partySettingsPage.timersTitle')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-text-secondary">
            {t('partySettingsPage.cardAutoCloseLabel', { min: PARTY_CARD_LIFETIME_MIN_MINUTES, max: PARTY_CARD_LIFETIME_MAX_MINUTES })}
          </label>
          <input
            type="number"
            min={PARTY_CARD_LIFETIME_MIN_MINUTES}
            max={PARTY_CARD_LIFETIME_MAX_MINUTES}
            value={cardLifetimeMinutes}
            onChange={(e) => { setCardLifetimeMinutes(parseInt(e.target.value) || 0); setIsDirty(true); }}
            className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-brand"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-text-secondary">
            {t('partySettingsPage.channelAutoDeleteLabel', { min: PARTY_CHANNEL_LIFETIME_MIN_HOURS, max: PARTY_CHANNEL_LIFETIME_MAX_HOURS })}
          </label>
          <input
            type="number"
            min={PARTY_CHANNEL_LIFETIME_MIN_HOURS}
            max={PARTY_CHANNEL_LIFETIME_MAX_HOURS}
            value={channelLifetimeHours}
            onChange={(e) => { setChannelLifetimeHours(parseInt(e.target.value) || 0); setIsDirty(true); }}
            className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-brand"
          />
        </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
          {t('partySettingsPage.weeklyReportTitle')}
        </h3>
        <HelpText>
          {t('partySettingsPage.weeklyReportDesc')}
        </HelpText>

        <div className="flex items-center justify-between">
          <label className="text-sm font-black text-text-primary cursor-pointer" htmlFor="weekly-report-toggle">{t('partySettingsPage.weeklyReportEnableLabel')}</label>
          <input
            id="weekly-report-toggle"
            type="checkbox"
            checked={weeklyReportEnabled}
            onChange={(e) => { setWeeklyReportEnabled(e.target.checked); setIsDirty(true); }}
            className="w-4 h-4 accent-brand cursor-pointer"
          />
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-sm font-bold text-text-secondary">{t('partySettingsPage.reportChannelLabel')}</label>
          <ChannelSelect
            guildId={guildId}
            value={weeklyReportChannelId}
            onChange={(id) => { setWeeklyReportChannelId(id); setIsDirty(true); }}
          />
        </div>
      </Card>

      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-bg-surface/95 border border-brand/50 px-6 py-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-8 backdrop-blur-md w-[90%] max-w-xl">
          <span className="text-sm font-bold text-text-primary">{t('common.unsavedChanges')}</span>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={loadData} className="!px-0">
              {t('common.discard')}
            </Button>
            <Button type="button" variant="success" onClick={handleSave}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      )}
    </SettingsPageContainer>
  );
}
