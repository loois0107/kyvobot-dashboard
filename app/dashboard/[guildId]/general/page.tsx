'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import { useGuildName } from '@/components/GuildsContext';
import Card from '@/components/ui/Card';

// 서버 언어 설정 전용 페이지 - 예전엔 settings/page.tsx(커스텀 매크로 페이지)에 매크로 관리와
// 한 화면에 섞여 있었다. 둘 다 /api/settings/{guildId}의 같은 GET/POST를 쓰지만, POST의
// sanitizeBody가 요청에 실제로 실린 필드만 반영하므로(language/custom_commands 독립), 이
// 페이지는 language만 보내면 되고 백엔드 변경은 필요 없다.
export default function GeneralSettingsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const t = useT();
  const guildId = params?.guildId as string | undefined;
  const guildName = useGuildName(guildId);

  const [language, setLanguage] = useState('en');
  const [inviterDmEnabled, setInviterDmEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!guildId || guildId === '[guildId]') return;
    setLoading(true);
    fetch(`/api/settings/${guildId}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.ok && data.settings) {
          setLanguage(data.settings.language || 'en');
          // 🛡️ settings jsonb에 이 키가 아예 없는 기존 서버도 안전하게 꺼진 상태로 뜨도록 - API가
          // 이미 ?? false로 병합해서 내려주지만, 여기서도 한 번 더 방어적으로 처리한다.
          setInviterDmEnabled(Boolean(data.settings.inviter_dm_enabled));
        } else {
          showToast(data.error || data.message || t('common.networkError'), 'error');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        showToast(t('common.networkError'), 'error');
        setLoading(false);
      });
  }, [guildId]);

  const handleLanguageChange = async (nextLang: string) => {
    if (!guildId || guildId === '[guildId]') return;
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: nextLang }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setLanguage(nextLang);
        showToast(t('common.saveSuccess'), 'success');
      } else {
        showToast(data.error || data.message || t('common.networkError'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('common.networkError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInviterDmToggle = async (checked: boolean) => {
    if (!guildId || guildId === '[guildId]') return;
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviter_dm_enabled: checked }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setInviterDmEnabled(checked);
        showToast(t('common.saveSuccess'), 'success');
      } else {
        showToast(data.error || data.message || t('common.networkError'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('common.networkError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary p-6 font-mono selection:bg-brand/20">
      <SettingsPageContainer>
        <header className="mb-8 border-b border-border-default pb-4">
          <h1 className="text-2xl font-extrabold text-brand">{t('generalSettingsPage.title')}</h1>
          <HelpText className="mt-1">{t('generalSettingsPage.subtitle')}</HelpText>
        </header>

        <Card className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm text-text-secondary block mb-1">{t('common.activeContext')}</label>
              <div className="w-full bg-bg-elevated border border-border-default text-base text-text-primary px-3 py-2 rounded font-bold select-none">
                {guildName || (guildId ? `${t('common.guildLabel')} ${guildId}` : t('common.loading'))}
              </div>
            </div>
            <div>
              <label className="text-sm text-text-secondary block mb-1">{t('generalSettingsPage.serverLanguageLabel')}</label>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={loading}
                className="w-full bg-bg-elevated border border-border-default text-base text-text-primary px-3 py-2 rounded focus:border-brand outline-none cursor-pointer font-bold disabled:opacity-50"
              >
                <option value="en">🇺🇸 English (EN)</option>
                <option value="ko">🇰🇷 한국어 (KO)</option>
              </select>
              <HelpText className="mt-1">{t('generalSettingsPage.serverLanguageHelp')}</HelpText>
            </div>
          </div>

          <div className="pt-2 border-t border-border-default">
            <div className="flex items-center gap-2">
              <input
                id="inviter-dm-toggle"
                type="checkbox"
                checked={inviterDmEnabled}
                onChange={(e) => handleInviterDmToggle(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 accent-brand cursor-pointer disabled:opacity-50"
              />
              <label htmlFor="inviter-dm-toggle" className="text-sm font-black text-text-primary cursor-pointer">
                {t('generalSettingsPage.inviterDmLabel')}
              </label>
            </div>
            <HelpText className="mt-1">{t('generalSettingsPage.inviterDmHelp')}</HelpText>
          </div>
        </Card>
      </SettingsPageContainer>
    </div>
  );
}
