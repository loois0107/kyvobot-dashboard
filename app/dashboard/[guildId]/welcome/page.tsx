'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast';

export default function WelcomeSettings() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  const [guildId, setGuildId] = useState('');
  
  // 📥 Welcome System Core States
  const [enabled, setEnabled] = useState(false);
  const [channelId, setChannelId] = useState('');

  // 📤 👑 기능 불일치 해결: 퇴장 인사(Goodbye) 제어 상태 추가
  const [goodbyeEnabled, setGoodbyeEnabled] = useState(false);
  const [goodbyeChannelId, setGoodbyeChannelId] = useState('');

  // 🎨 High-Performance Design Matrix States
  const [cardColor, setCardColor] = useState('#5865F2');
  const [cardBgColor, setCardBgColor] = useState('#1E1F22');
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);
  const [backgroundUrl, setBackgroundUrl] = useState('');

  const colorPresets = ['#5865F2', '#23A55A', '#FEE75C', '#EB459E', '#ED4245', '#9B59B6', '#00D2D3', '#54A0FF', '#FF6B6B', '#FFFFFF'];
  const bgColorPresets = ['#1E1F22', '#2B2D31', '#313338', '#111214', '#0F0F1A', '#161626'];
  const premiumPresets = [
    { name: '🌌 Cyber Neon', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=920&h=240&fit=crop' },
    { name: '🌆 Synthwave Dusk', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=920&h=240&fit=crop' },
    { name: '🎋 Anime Lounge', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e +q=80&w=920&h=240&fit=crop' },
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

  // 🛡️ [문지기 무력화 완료] 로컬 도커 환경 세션 검문소를 비활성화합니다.
  // useEffect(() => {
  //   if (status === 'unauthenticated') router.push('/');
  // }, [status, router]);

  const loadSettings = async (id: string) => {
    try {
      const res = await fetch(`/api/level-eco-setting?guild_id=${id}`);
      if (res.ok) {
        const data = await res.json();
        
        if (data) {
          setGoodbyeEnabled(!!data.goodbye_enabled);
          setGoodbyeChannelId(data.goodbye_channel_id ? String(data.goodbye_channel_id) : '');
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
  };

  const handleSave = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!guildId || guildId === '[guildId]') return;

    if (enabled && !channelId.trim()) {
      showToast('Validation Error: Welcome Target Channel ID is missing.', 'error');
      return;
    }
    if (goodbyeEnabled && !goodbyeChannelId.trim()) {
      showToast('Validation Error: Goodbye Target Channel ID is missing.', 'error');
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
        showToast('Welcome & Goodbye matrix protocols successfully synchronized!', 'success');
        setIsDirty(false);
      } else {
        showToast('Failed to save welcome protocol configs.', 'error');
      }
    } catch (err: any) { showToast(`Network Drop: ${err.message}`, 'error'); }
    finally { setIsSaving(false); }
  };

  if (status === 'loading') return null;

  return (
    <div className="min-h-screen bg-[#111214] text-[#dbdee1] p-2 sm:p-4 md:p-6 pb-28">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <header className="mb-8 border-b border-[#2b2d31] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">📥 INGRESS & EGRESS // CONFIGURATOR</h1>
            <p className="text-xs text-[#b5bac1] mt-1 tracking-wide font-medium">
              MANAGE USER LAYER ENTRY SIGNALS, LEAVE NOTIFICATIONS AND DYNAMIC WELCOME BANNERS
            </p>
          </div>
          <button type="submit" form="welcome-form" disabled={isSaving} className="w-full sm:w-auto bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black px-6 py-3 rounded-xl shadow-lg tracking-widest transition-all cursor-pointer">
            {isSaving ? 'SYNCING MATRIX...' : 'SAVE GATEWAY PROTOCOL'}
          </button>
        </header>

        <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-[#2b2d31] pb-3">
            <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase">Live Banner Render Preview</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded font-black ${enabled ? 'bg-green-950/40 text-green-400 border border-green-500/20' : 'bg-red-950/40 text-red-400 border border-red-500/20'}`}>
              {enabled ? 'GATEWAY CARD ACTIVE' : 'GATEWAY CARD OFFLINE'}
            </span>
          </div>

          <div className="w-full aspect-[920/240] rounded-xl relative flex items-center bg-cover bg-center overflow-hidden border border-[#232428]"
            style={{ backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none', backgroundColor: backgroundUrl ? 'transparent' : cardBgColor }}
          >
            <div className="absolute inset-[16px] rounded-xl flex items-center justify-between px-8" style={{ backgroundColor: `rgba(15, 15, 26, ${overlayOpacity})` }}>
              <div className="flex items-center gap-6 w-full">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#313338] border-[3px] flex-shrink-0" style={{ borderColor: cardColor }} />
                <div className="flex-1 font-mono">
                  <span className="text-xs font-bold text-[#b5bac1] tracking-wider block">WELCOME TO THE SERVER</span>
                  <span className="text-sm sm:text-2xl font-black text-white block mt-0.5" style={{ color: cardColor }}>NewOperative#0001</span>
                  <span className="text-xs font-semibold text-gray-300 block mt-1">Operative #1,234</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form id="welcome-form" onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-5 shadow-xl md:col-span-1">
            <h2 className="text-xs font-black tracking-widest text-[#5865F2] uppercase border-b border-[#2b2d31] pb-2">⚙️ GATEWAY PROTOCOLS</h2>
            
            <div className="space-y-3 p-3.5 bg-[#111214] rounded-xl border border-[#232428]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-white cursor-pointer" htmlFor="enable-toggle">1. Enable Welcome Card</label>
                <input id="enable-toggle" type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); setIsDirty(true); }} className="w-4 h-4 accent-[#5865F2] cursor-pointer" />
              </div>
              <div className="space-y-1 pt-1 border-t border-[#2b2d31]/40">
                <label className="text-[10px] font-bold text-[#b5bac1] uppercase block">🎯 Welcome Channel ID</label>
                <input type="text" placeholder="e.g. 115072034920..." value={channelId} 
                  onChange={(e) => { setChannelId(e.target.value.replace(/[^0-9]/g, '')); setIsDirty(true); }}
                  className="w-full bg-[#1e1f22] border border-[#232428] rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#5865F2]" 
                />
              </div>
            </div>

            <div className="space-y-3 p-3.5 bg-[#111214] rounded-xl border border-[#232428]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-red-400 cursor-pointer" htmlFor="goodbye-toggle">2. Enable Goodbye System</label>
                <input id="goodbye-toggle" type="checkbox" checked={goodbyeEnabled} onChange={(e) => { setGoodbyeEnabled(e.target.checked); setIsDirty(true); }} className="w-4 h-4 accent-red-500 cursor-pointer" />
              </div>
              <div className="space-y-1 pt-1 border-t border-[#2b2d31]/40">
                <label className="text-[10px] font-bold text-[#b5bac1] uppercase block">📡 Goodbye Channel ID</label>
                <input type="text" placeholder="e.g. 115072034920..." value={goodbyeChannelId} 
                  onChange={(e) => { setGoodbyeChannelId(e.target.value.replace(/[^0-9]/g, '')); setIsDirty(true); }}
                  className="w-full bg-[#1e1f22] border border-[#232428] rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500" 
                />
              </div>
            </div>
          </div>

          <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-4 shadow-xl md:col-span-2">
            <h2 className="text-xs font-black tracking-widest text-green-400 uppercase border-b border-[#2b2d31] pb-2">🎨 AESTHETIC ENGINEERING CANVAS</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#b5bac1]">Theme Accent Color</label>
                <div className="flex flex-wrap gap-1.5">{colorPresets.map((p) => (<button key={p} type="button" onClick={() => { setCardColor(p); setIsDirty(true); }} className={`w-5 h-5 rounded-full border ${cardColor.toLowerCase() === p.toLowerCase() ? 'border-white scale-110' : 'border-transparent opacity-60'}`} style={{ backgroundColor: p }} />))}</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#b5bac1]">Solid Canvas BG</label>
                <div className="flex flex-wrap gap-1.5">{bgColorPresets.map((p) => (<button key={p} type="button" onClick={() => { setCardBgColor(p); setIsDirty(true); }} className={`w-5 h-5 rounded-full border ${cardBgColor.toLowerCase() === p.toLowerCase() ? 'border-white scale-110' : 'border-transparent opacity-60'}`} style={{ backgroundColor: p }} />))}</div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-[#b5bac1] flex justify-between"><span>Vanguard Overlay Opacity Matrix</span><span className="text-[#5865F2] font-mono">{Math.round(overlayOpacity * 100)}%</span></label>
              <input type="range" min="0.0" max="1.0" step="0.05" value={overlayOpacity} onChange={(e) => { setOverlayOpacity(parseFloat(e.target.value)); setIsDirty(true); }} className="w-full h-1 bg-[#232428] rounded-lg appearance-none cursor-pointer accent-[#5865F2]" />
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-[#b5bac1] block">Select Premium Wallpaper Preset (Click to Apply Changes Directly)</label>
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
                <input type="text" value={backgroundUrl} onChange={(e) => { setBackgroundUrl(e.target.value); setIsDirty(true); }} placeholder="Paste external secure image direct link here..." className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#5865F2]" />
              </div>
            </div>

          </div>
        </form>

      </div>

      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1e1f22]/95 border border-[#5865F2]/60 px-6 py-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-8 backdrop-blur-md w-[90%] max-w-xl animate-in fade-in">
          <span className="text-xs font-bold text-gray-200">⚠️ Attention: Unsaved Gateway Protocol Changes Detected</span>
          <div className="flex gap-3">
            <button type="button" onClick={() => { loadSettings(guildId); setIsDirty(false); }} className="text-xs font-bold text-gray-400 hover:text-white transition">Reset</button>
            <button type="submit" form="welcome-form" disabled={isSaving} className="bg-[#23A55A] hover:bg-[#1a7f43] text-white text-xs font-black px-5 py-2 rounded-lg">Save Protocol</button>
          </div>
        </div>
      )}

    </div>
  );
}