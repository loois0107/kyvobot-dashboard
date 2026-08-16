'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast';
import { useT } from '@/lib/i18n/LanguageContext';
import { dictionaries, type Lang } from '@/lib/i18n';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import ChannelSelect from '@/components/ChannelSelect';

export default function WelcomeSettings() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const t = useT();
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [guildId, setGuildId] = useState('');

  // 📥 Welcome System Core States
  const [enabled, setEnabled] = useState(false);
  const [channelId, setChannelId] = useState('');

  // 📤 👑 기능 불일치 해결: 퇴장 인사(Goodbye) 제어 상태 추가
  const [goodbyeEnabled, setGoodbyeEnabled] = useState(false);
  const [goodbyeChannelId, setGoodbyeChannelId] = useState('');
  const [goodbyeMessage, setGoodbyeMessage] = useState('');

  // 🎨 High-Performance Design Matrix States
  const [cardColor, setCardColor] = useState('#5865F2');
  const [cardBgColor, setCardBgColor] = useState('#1E1F22');
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);
  const [backgroundUrl, setBackgroundUrl] = useState('');

  // 🛡️ [미리보기 = 실제 봇 언어] 이 페이지의 나머지 UI(버튼/라벨)는 관리자 본인이 보고 있는
  // 대시보드 화면 언어(useT())를 따르지만, 카드 미리보기 안의 두 줄(welcomeToServer/memberNumber)만은
  // 그 서버의 실제 봇 언어(guild_settings.language)를 따라야 한다 - 이 둘은 서로 독립된 설정이라
  // 관리자가 영어로 대시보드를 보면서 서버 봇 언어는 한국어로 설정해둔 경우가 흔히 있을 수 있고,
  // 그때 미리보기가 화면 언어를 따르면 실제 신규 멤버가 받을 카드와 다른 걸 보여주게 된다.
  // 기본값 'en'은 봇 쪽 폴백 기본값과 동일하게 맞춘다.
  const [guildLanguage, setGuildLanguage] = useState<Lang>('en');

  const colorPresets = ['#5865F2', '#23A55A', '#FEE75C', '#EB459E', '#ED4245', '#9B59B6', '#00D2D3', '#54A0FF', '#FF6B6B', '#FFFFFF'];
  const bgColorPresets = ['#1E1F22', '#2B2D31', '#313338', '#111214', '#0F0F1A', '#161626'];
  const premiumPresets = [
    { name: '🌌 Cyber Neon', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=920&h=240&fit=crop' },
    { name: '🌆 Synthwave Dusk', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=920&h=240&fit=crop' },
    { name: '🎋 Anime Lounge', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=920&h=240&fit=crop' },
    { name: '🌠 Cosmic Nebula', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=920&h=240&fit=crop' },
    { name: '🏔️ Minimal Peak', url: 'https://images.unsplash.com/photo-1486873249359-2731bd6da57b?q=80&w=920&h=240&fit=crop' },
    { name: '🔮 Dark Magic', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=920&h=240&fit=crop' }
  ];

  useEffect(() => {
    const urlGuildId = params?.guildId as string;
    if (urlGuildId && urlGuildId !== '[guildId]' && !urlGuildId.includes('%5B')) {
      setGuildId(urlGuildId);
      loadSettings(urlGuildId);
    }
  }, [params?.guildId]);

  const loadSettings = async (id: string) => {
    try {
      const res = await fetch(`/api/level-eco-setting?guild_id=${id}`);
      if (res.ok) {
        const data = await res.json();

        if (data) {
          setGoodbyeEnabled(!!data.goodbye_enabled);
          setGoodbyeChannelId(data.goodbye_channel_id ? String(data.goodbye_channel_id) : '');
          setGoodbyeMessage(data.goodbye_message ? String(data.goodbye_message) : '');
        }

        if (data && data.welcome_settings) {
          const w = data.welcome_settings;
          setEnabled(!!w.enabled);
          setChannelId(w.channel_id ? String(w.channel_id) : '');
          setCardColor(w.card_color ? String(w.card_color) : '#5865F2');
          setCardBgColor(w.card_bg_color ? String(w.card_bg_color) : '#1E1F22');
          setOverlayOpacity(w.overlay_opacity !== undefined ? Number(w.overlay_opacity) : 0.4);
          setBackgroundUrl(w.background_url ?? '');
          setIsDirty(false);
        }
      }
    } catch (err) { console.error(err); }

    // 🛡️ level-eco-setting 응답엔 language가 없다(leveling/economy/welcome 전용 엔드포인트) -
    // General Settings 페이지가 쓰는 것과 같은 /api/settings/{guildId}를 별도로 한 번 더 불러
    // guild_settings.language만 꺼내 쓴다. 이 호출이 실패해도 위 welcome/goodbye 설정 로딩과는
    // 완전히 무관하니 별도 try/catch로 분리 - 실패 시 그냥 기본값 'en' 미리보기로 남는다.
    try {
      const langRes = await fetch(`/api/settings/${id}`);
      if (langRes.ok) {
        const langData = await langRes.json();
        const lang = langData?.settings?.language;
        if (lang === 'ko' || lang === 'en') setGuildLanguage(lang);
      }
    } catch (err) { console.error(err); }
  };

  const handleSave = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!guildId || guildId === '[guildId]') return;

    if (enabled && !channelId.trim()) {
      showToast(t('welcomePage.missingWelcomeChannel'), 'error');
      return;
    }
    if (goodbyeEnabled && !goodbyeChannelId.trim()) {
      showToast(t('welcomePage.missingGoodbyeChannel'), 'error');
      return;
    }

    setIsSaving(true);
    try {
      const sessionWithToken = session as any;
      const originalRes = await fetch(`/api/level-eco-setting?guild_id=${guildId}`);
      const originalData = originalRes.ok ? await originalRes.json() : {};

      const res = await fetch('/api/level-eco-setting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: guildId.trim(),
          accessToken: sessionWithToken?.accessToken || null,
          leveling_settings: originalData.leveling_settings || {},
          economy_settings: originalData.economy_settings || {},
          goodbye_enabled: Boolean(goodbyeEnabled),
          goodbye_channel_id: String(goodbyeChannelId).trim(),
          goodbye_message: String(goodbyeMessage).trim(),
          welcome_settings: {
            enabled: Boolean(enabled),
            channel_id: String(channelId).trim(),
            card_color: String(cardColor),
            card_bg_color: String(cardBgColor),
            overlay_opacity: Number(overlayOpacity),
            background_url: String(backgroundUrl).trim()
          }
        }),
      });

      if (res.ok) {
        showToast(t('welcomePage.saveSuccess'), 'success');
        setIsDirty(false);
      } else {
        const errorBody = await res.json().catch(() => null);
        console.error('[WELCOME SAVE ERROR] status:', res.status, 'body:', errorBody);
        showToast(t('welcomePage.saveFailed'), 'error');
      }
    } catch (err: any) { showToast(t('welcomePage.networkDrop', { message: err.message }), 'error'); }
    finally { setIsSaving(false); }
  };

  if (status === 'loading') return null;

  return (
    <div className="min-h-screen bg-bg-base text-[#dbdee1] p-2 sm:p-4 md:p-6 pb-28">
      <SettingsPageContainer>

        <header className="mb-8 border-b border-[#2b2d31] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">{t('welcomePage.title')}</h1>
            <p className="text-sm text-[#b5bac1] mt-1 tracking-wide font-medium">
              {t('welcomePage.subtitle')}
            </p>
          </div>
          <button type="submit" form="welcome-form" disabled={isSaving} className="w-full sm:w-auto bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-black px-6 py-3 rounded-xl shadow-lg tracking-widest transition-all cursor-pointer">
            {isSaving ? t('welcomePage.syncing') : t('welcomePage.saveButton')}
          </button>
        </header>

        <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-[#2b2d31] pb-3">
            <h3 className="text-sm font-black tracking-widest text-[#949ba4] uppercase">{t('welcomePage.previewTitle')}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded font-black ${enabled ? 'bg-green-950/40 text-green-400 border border-green-500/20' : 'bg-red-950/40 text-red-400 border border-red-500/20'}`}>
              {enabled ? t('welcomePage.cardActive') : t('welcomePage.cardOffline')}
            </span>
          </div>

          <HelpText className="normal-case">{t('welcomePage.previewLangNote')}</HelpText>

          <div className="w-full aspect-[920/240] rounded-xl relative flex items-center bg-cover bg-center overflow-hidden border border-[#232428]"
            style={{ backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none', backgroundColor: backgroundUrl ? 'transparent' : cardBgColor }}
          >
            <div className="absolute inset-[16px] rounded-xl flex items-center justify-between px-8" style={{ backgroundColor: `rgba(15, 15, 26, ${overlayOpacity})` }}>
              <div className="flex items-center gap-6 w-full">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#313338] border-[3px] flex-shrink-0" style={{ borderColor: cardColor }} />
                <div className="flex-1 font-mono">
                  {/* 🛡️ 이 두 줄만 관리자의 대시보드 화면 언어(t)가 아니라 서버의 실제 봇 언어
                      (guildLanguage)를 따른다 - 실제로 신규 멤버가 받는 카드와 미리보기가 어긋나지
                      않게 하기 위함. kyvobot/locales/{en,ko}.json의 welcome_card_title/
                      welcome_card_count와 문구가 반드시 같아야 한다 - 봇 쪽을 고치면 여기도 확인. */}
                  <span className="text-sm font-bold text-[#b5bac1] tracking-wider block">{dictionaries[guildLanguage].welcomePage.welcomeToServer}</span>
                  <span className="text-base sm:text-2xl font-black text-white block mt-0.5" style={{ color: cardColor }}>NewOperative#0001</span>
                  <span className="text-sm font-semibold text-gray-300 block mt-1">{dictionaries[guildLanguage].welcomePage.memberNumber}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form id="welcome-form" onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-5 shadow-xl md:col-span-2">
            <h2 className="text-sm font-black tracking-widest text-[#5865F2] uppercase border-b border-[#2b2d31] pb-2">{t('welcomePage.settingsSectionTitle')}</h2>

            <div className="space-y-3 p-3.5 bg-[#111214] rounded-xl border border-[#232428]">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black text-white cursor-pointer" htmlFor="enable-toggle">{t('welcomePage.enableWelcomeLabel')}</label>
                <input id="enable-toggle" type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); setIsDirty(true); }} className="w-4 h-4 accent-[#5865F2] cursor-pointer" />
              </div>
              <div className="space-y-1 pt-1 border-t border-[#2b2d31]/40">
                <label className="text-sm font-bold text-[#b5bac1] uppercase block">{t('welcomePage.welcomeChannelLabel')}</label>
                <ChannelSelect
                  guildId={guildId}
                  value={channelId}
                  onChange={(id) => { setChannelId(id); setIsDirty(true); }}
                  className="text-sm"
                />
                <HelpText className="normal-case">{t('welcomePage.welcomeChannelHelp')}</HelpText>
              </div>
            </div>

            <div className="space-y-3 p-3.5 bg-[#111214] rounded-xl border border-[#232428]">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black text-red-400 cursor-pointer" htmlFor="goodbye-toggle">{t('welcomePage.enableGoodbyeLabel')}</label>
                <input id="goodbye-toggle" type="checkbox" checked={goodbyeEnabled} onChange={(e) => { setGoodbyeEnabled(e.target.checked); setIsDirty(true); }} className="w-4 h-4 accent-red-500 cursor-pointer" />
              </div>
              <div className="space-y-1 pt-1 border-t border-[#2b2d31]/40">
                <label className="text-sm font-bold text-[#b5bac1] uppercase block">{t('welcomePage.goodbyeChannelLabel')}</label>
                <ChannelSelect
                  guildId={guildId}
                  value={goodbyeChannelId}
                  onChange={(id) => { setGoodbyeChannelId(id); setIsDirty(true); }}
                  className="text-sm"
                />
                <HelpText className="normal-case">{t('welcomePage.goodbyeChannelHelp')}</HelpText>
              </div>
              <div className="space-y-1 pt-1 border-t border-[#2b2d31]/40">
                <label className="text-sm font-bold text-[#b5bac1] uppercase block">{t('welcomePage.goodbyeMessageLabel')}</label>
                <textarea
                  value={goodbyeMessage}
                  onChange={(e) => { setGoodbyeMessage(e.target.value); setIsDirty(true); }}
                  rows={2}
                  placeholder={t('welcomePage.goodbyeMessagePlaceholder')}
                  className="w-full bg-[#1e1f22] border border-[#232428] rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
                <HelpText className="normal-case">
                  {t('welcomePage.goodbyeMessageHelp')}
                </HelpText>
              </div>
            </div>
          </div>

          <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-4 shadow-xl md:col-span-3">
            <h2 className="text-sm font-black tracking-widest text-green-400 uppercase border-b border-[#2b2d31] pb-2">{t('welcomePage.aestheticTitle')}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#b5bac1]">{t('welcomePage.accentColorLabel')}</label>
                <div className="flex flex-wrap gap-1.5">{colorPresets.map((p) => (<button key={p} type="button" onClick={() => { setCardColor(p); setIsDirty(true); }} className={`w-5 h-5 rounded-full border ${cardColor.toLowerCase() === p.toLowerCase() ? 'border-white scale-110' : 'border-transparent opacity-60'}`} style={{ backgroundColor: p }} />))}</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#b5bac1]">{t('welcomePage.solidBgLabel')}</label>
                <div className="flex flex-wrap gap-1.5">{bgColorPresets.map((p) => (<button key={p} type="button" onClick={() => { setCardBgColor(p); setIsDirty(true); }} className={`w-5 h-5 rounded-full border ${cardBgColor.toLowerCase() === p.toLowerCase() ? 'border-white scale-110' : 'border-transparent opacity-60'}`} style={{ backgroundColor: p }} />))}</div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-sm font-bold text-[#b5bac1] flex justify-between"><span>{t('welcomePage.overlayOpacityLabel')}</span><span className="text-[#5865F2] font-mono">{Math.round(overlayOpacity * 100)}%</span></label>
              <input type="range" min="0.0" max="1.0" step="0.05" value={overlayOpacity} onChange={(e) => { setOverlayOpacity(parseFloat(e.target.value)); setIsDirty(true); }} className="w-full h-1 bg-[#232428] rounded-lg appearance-none cursor-pointer accent-[#5865F2]" />
              <HelpText>{t('welcomePage.overlayOpacityHelp')}</HelpText>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-sm font-bold text-[#b5bac1] block">{t('welcomePage.wallpaperLabel')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {premiumPresets.map((preset, i) => (
                  <div key={i} onClick={() => { setBackgroundUrl(preset.url); setIsDirty(true); }}
                    className={`aspect-[2.6/1] rounded-xl bg-cover bg-center cursor-pointer border relative group transition-all duration-200 overflow-hidden ${backgroundUrl === preset.url ? 'border-[#5865F2] scale-102 shadow-md' : 'border-[#2b2d31] opacity-40 hover:opacity-80'}`}
                    style={{ backgroundImage: `url(${preset.url})` }}
                  >
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white font-black tracking-widest uppercase">{preset.name}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-1">
                <input type="text" value={backgroundUrl} onChange={(e) => { setBackgroundUrl(e.target.value); setIsDirty(true); }} placeholder={t('welcomePage.wallpaperUrlPlaceholder')} className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2]" />
                <HelpText className="pt-1">{t('welcomePage.wallpaperFallbackHelp')}</HelpText>
              </div>
            </div>

          </div>
        </form>

      </SettingsPageContainer>

      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1e1f22]/95 border border-[#5865F2]/60 px-6 py-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-8 backdrop-blur-md w-[90%] max-w-xl animate-in fade-in">
          <span className="text-sm font-bold text-gray-200">{t('welcomePage.unsavedWarning')}</span>
          <div className="flex gap-3">
            <button type="button" onClick={() => { loadSettings(guildId); setIsDirty(false); }} className="text-sm font-bold text-gray-400 hover:text-white transition">{t('welcomePage.reset')}</button>
            <button type="submit" form="welcome-form" disabled={isSaving} className="bg-[#23A55A] hover:bg-[#1a7f43] text-white text-sm font-black px-5 py-2 rounded-lg">{t('welcomePage.stickyBarSaveButton')}</button>
          </div>
        </div>
      )}

    </div>
  );
}
