'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import { useGuildName } from '@/components/GuildsContext';

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!guildId || guildId === '[guildId]') return;
    setLoading(true);
    fetch(`/api/settings/${guildId}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.ok && data.settings) {
          setLanguage(data.settings.language || 'en');
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

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white p-6 font-mono selection:bg-[#2A1F40]">
      <SettingsPageContainer>
        <header className="mb-8 border-b border-[#2A1F40] pb-4">
          <h1 className="text-2xl font-extrabold text-purple-400">{t('generalSettingsPage.title')}</h1>
          <HelpText className="mt-1">{t('generalSettingsPage.subtitle')}</HelpText>
        </header>

        <div className="flex flex-col gap-6 bg-[#161626] border border-[#2A1F40] p-6 rounded-xl shadow-xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm text-gray-400 block mb-1">{t('common.activeContext')}</label>
              <div className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-base text-purple-400 px-3 py-2 rounded font-bold select-none">
                {guildName || (guildId ? `${t('common.guildLabel')} ${guildId}` : t('common.loading'))}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">{t('generalSettingsPage.serverLanguageLabel')}</label>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={loading}
                className="w-full bg-[#0F0F1A] border border-[#2A1F40] text-base text-white px-3 py-2 rounded focus:border-purple-500 outline-none cursor-pointer font-bold disabled:opacity-50"
              >
                <option value="en">🇺🇸 English (EN)</option>
                <option value="ko">🇰🇷 한국어 (KO)</option>
              </select>
              <HelpText className="mt-1">{t('generalSettingsPage.serverLanguageHelp')}</HelpText>
            </div>
          </div>
        </div>
      </SettingsPageContainer>
    </div>
  );
}
