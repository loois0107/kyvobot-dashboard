'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast';

// 🛡️ cogs/economy.py의 /shop add·/shop view·/shop buy는 전부 item['name']을 읽는다 - 예전엔
// 여기서 'title'로 저장해서 봇이 KeyError로 죽는 실제 크래시가 있었다(대시보드로 만든 아이템은
// 명령어 쪽에서 아예 인식 못 함). 봇 쪽이 더 널리 쓰이는 컨벤션이라 그쪽 이름에 맞춘다.
interface ShopItem {
  name: string;
  price: number;
  description: string;
}

export default function LevelingEconomySettings() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  
  const [guildId, setGuildId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // 🏆 Leveling System States
  const [xpRate, setXpRate] = useState(1);
  const [roleRewards, setRoleRewards] = useState<{ [key: string]: string }>({});
  const [newLvl, setNewLvl] = useState('');
  const [newRoleId, setNewRoleId] = useState('');

  // 🪙 Economy System States
  const [currencyName, setCurrencyName] = useState('Points');
  const [minBet, setMinBet] = useState(10);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);

  // 🛒 New Merchandise Input Buffers
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(100);
  const [newItemDescription, setNewItemDescription] = useState('');

  // 🎨 Rank Card Design States
  const [cardColor, setCardColor] = useState('#5865F2');
  const [cardBgColor, setCardBgColor] = useState('#1E1F22');
  const [overlayOpacity, setOverlayOpacity] = useState(0.6);
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [fontPreference, setFontPreference] = useState('font-mono');

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
    const rawId = params?.guildId as string;
    if (rawId && rawId !== '[guildId]' && !rawId.includes('%5B')) {
      setGuildId(rawId);
      loadSettings(rawId);
    }
  }, [params?.guildId]);

 

  const loadSettings = async (id: string) => {
    try {
      const res = await fetch(`/api/level-eco-setting?guild_id=${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.leveling_settings) {
          const l = data.leveling_settings;
          setXpRate(l.xp_rate !== undefined ? Number(l.xp_rate) : 1);
          setRoleRewards(l.role_rewards || {});
          setCardColor(l.card_color || '#5865F2');
          setCardBgColor(l.card_bg_color || '#1E1F22');
          setOverlayOpacity(l.overlay_opacity !== undefined ? Number(l.overlay_opacity) : 0.6);
          setBackgroundUrl(l.background_url || '');
          setFontPreference(l.font_preference || 'font-mono');
        }
        if (data.economy_settings) {
          const e = data.economy_settings;
          setCurrencyName(e.currency_name || 'Points');
          setMinBet(e.min_bet !== undefined ? Number(e.min_bet) : 10);
          setShopItems(e.shop_items || []);
        }
        setIsDirty(false);
      }
    } catch (err) { console.error(err); }
  };

  const appendMilestone = () => {
    if (!newLvl.trim() || !newRoleId.trim()) return;
    if (!/^\d+$/.test(newRoleId) || newRoleId.length < 17) {
      showToast('Error: Invalid Discord Role ID.', 'error'); return;
    }
    setRoleRewards(prev => ({ ...prev, [newLvl.trim()]: newRoleId.trim() }));
    setNewLvl(''); setNewRoleId(''); setIsDirty(true);
  };

  const removeMilestone = (lvlKey: string) => {
    setRoleRewards(prev => { const updated = { ...prev }; delete updated[lvlKey]; return updated; });
    setIsDirty(true);
  };

  const injectShopItem = () => {
    if (!newItemTitle.trim()) return;
    const newItem: ShopItem = { name: newItemTitle.trim().replace(/\s+/g, '_'), price: Number(newItemPrice), description: newItemDescription.trim() };
    setShopItems(prev => [...prev, newItem]);
    setNewItemTitle(''); setNewItemPrice(100); setNewItemDescription(''); setIsDirty(true);
  };

  const purgeShopItem = (indexToPurge: number) => {
    setShopItems(prev => prev.filter((_, idx) => idx !== indexToPurge)); setIsDirty(true);
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!guildId || guildId === '[guildId]') return;
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
          welcome_settings: originalData.welcome_settings || {},
          leveling_settings: { xp_rate: Number(xpRate), role_rewards: roleRewards, card_color: cardColor, card_bg_color: cardBgColor, overlay_opacity: Number(overlayOpacity), background_url: backgroundUrl, font_preference: fontPreference },
          economy_settings: { currency_name: String(currencyName).trim(), min_bet: Number(minBet), shop_items: shopItems }
        }),
      });
      if (res.ok) {
        showToast('Synchronized successfully!', 'success');
        setIsDirty(false);
      } else {
        const errBody = await res.json().catch(() => null);
        showToast(errBody?.error || 'Failed to save - check your input values.', 'error');
      }
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  if (status === 'loading') return null;

  return (
    <div className="min-h-screen bg-[#111214] text-[#dbdee1] p-2 sm:p-4 md:p-6 pb-28">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* ==========================================
            [SECTION 0: HEADER PROTOCOL]
           ========================================== */}
        <header className="border-b border-[#2b2d31] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">🏆 LEVEL & ECONOMY // CONFIGURATOR</h1>
            <p className="text-[10px] text-[#57576F] mt-1 tracking-widest uppercase">TUNING RANK CARDS, SCALING MODIFIERS, AND COMMERCE ASSETS</p>
          </div>
          <button type="button" onClick={handleSaveAll} disabled={isSaving} className="w-full sm:w-auto bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black px-6 py-3 rounded-xl shadow-lg tracking-widest transition-all cursor-pointer">
            {isSaving ? 'COMMITTING...' : 'SAVE PROTOCOL CHANGES'}
          </button>
        </header>

        <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl px-4 sm:px-6 py-4">
          <p className="text-xs sm:text-sm text-[#b5bac1] leading-relaxed">
            멤버가 메시지를 보낼 때마다 XP를 얻고 레벨업합니다. 레벨업 시 특정 레벨에 역할을 자동 지급할 수 있고,
            서버 전용 화폐로 카지노 게임과 상점을 운영할 수 있어요.
          </p>
        </div>

        {/* ==========================================
            [SECTION 1: VISUAL DESIGN CLUSTER] -> 성격 맞는 애들끼리 최상단에 묶음!
           ========================================== */}
        <div className="space-y-4 bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 shadow-xl">
          <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">/level Command Card Render Preview</h3>
          
          {/* Card Preview Canvas */}
          <div 
            className="w-full aspect-[920/240] rounded-xl relative bg-cover bg-center overflow-hidden border border-[#232428]"
            style={{ backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none', backgroundColor: backgroundUrl ? 'transparent' : cardBgColor }}
          >
            <div className="absolute inset-[16px] rounded-xl flex items-center justify-between px-8" style={{ backgroundColor: `rgba(15, 15, 26, ${overlayOpacity})` }}>
              <div className="flex items-center gap-6 w-full h-full relative">
                <div className="w-[150px] h-[150px] rounded-full bg-[#313338] border-[3px] flex-shrink-0 flex items-center justify-center relative overflow-hidden" style={{ borderColor: cardColor }}>
                  <div className="w-[144px] h-[144px] rounded-full bg-gradient-to-tr from-gray-700 to-gray-500" />
                </div>
                <div className={`flex-1 flex flex-col justify-start h-[150px] pt-2 ${fontPreference}`}>
                  <span className="text-2xl font-black text-white tracking-wide">KyvoPlayer</span>
                  <div className="w-full h-[24px] bg-[#2b2d31] rounded-xl mt-6 border border-[#232428] overflow-hidden">
                    <div className="h-full rounded-xl transition-all duration-300" style={{ width: '65%', backgroundColor: cardColor }} />
                  </div>
                  <span className="text-xs font-bold text-[#b5bac1] mt-2 ml-1 font-sans">485,172 / 1,500 XP</span>
                </div>
                <div className="absolute right-0 top-2 flex items-baseline gap-4 font-black">
                  <div className="flex items-baseline gap-1 font-sans text-xs text-[#b5bac1]"><span>RANK</span><span className="text-2xl font-black text-white font-mono">#1</span></div>
                  <div className="flex items-baseline gap-1 font-sans text-xs text-[#b5bac1]"><span>LEVEL</span><span className="text-3xl font-black font-mono" style={{ color: cardColor }}>15</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Graphical Modifiers Panel (바로 붙여서 스크롤 낭비 차단) */}
          <div className="pt-4 space-y-4">
            <h2 className="text-xs font-black tracking-widest text-purple-400 uppercase border-b border-[#2b2d31] pb-2">🎨 RANK CARD GRAPHICAL MODIFIERS</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#b5bac1]">Card Accent Theme Color</label>
                <div className="flex flex-wrap gap-1.5">{colorPresets.map((p) => (<button key={p} type="button" onClick={() => { setCardColor(p); setIsDirty(true); }} className={`w-5 h-5 rounded-full border ${cardColor.toLowerCase() === p.toLowerCase() ? 'border-white scale-110' : 'border-transparent opacity-60'}`} style={{ backgroundColor: p }} />))}</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#b5bac1]">Solid Canvas BG</label>
                <div className="flex flex-wrap gap-1.5">{bgColorPresets.map((p) => (<button key={p} type="button" onClick={() => { setCardBgColor(p); setIsDirty(true); }} className={`w-5 h-5 rounded-full border ${cardBgColor.toLowerCase() === p.toLowerCase() ? 'border-white scale-110' : 'border-transparent opacity-60'}`} style={{ backgroundColor: p }} />))}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#b5bac1]">Vanguard Overlay Opacity: <span className="text-[#5865F2] font-mono">{Math.round(overlayOpacity*100)}%</span></label>
                <input type="range" min="0.0" max="1.0" step="0.05" value={overlayOpacity} onChange={(e) => { setOverlayOpacity(parseFloat(e.target.value)); setIsDirty(true); }} className="w-full h-1 bg-[#232428] rounded-lg cursor-pointer accent-[#5865F2]" />
                <p className="text-[10px] text-[#57576F]">배경 이미지 위에 깔리는 어두운 막의 농도예요 - 텍스트 가독성을 위해 있어요. 단색 배경(이미지 없음)일 땐 거의 티가 안 나요.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#b5bac1]">
                  Typography Font Layout <span className="text-amber-400 font-normal">(Coming Soon)</span>
                </label>
                <select value={fontPreference} disabled className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-gray-500 cursor-not-allowed opacity-50 focus:outline-none">
                  <option value="font-mono">👾 Cyber Monospace (Default)</option>
                  <option value="font-sans">📱 Clean Sans-Serif</option>
                  <option value="font-serif">🏛️ Elegant Serif</option>
                </select>
                <p className="text-[10px] text-[#57576F]">Only one font is currently bundled with the bot - alternate fonts aren't wired up to the actual rank card yet.</p>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-[#b5bac1]">Select Card Wallpaper Preset (Click to Apply Changes Directly)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {premiumPresets.map((preset, i) => (
                  <div key={i} onClick={() => { setBackgroundUrl(preset.url); setIsDirty(true); }} className={`aspect-[2.6/1] rounded-xl bg-cover bg-center cursor-pointer border relative group transition-all ${backgroundUrl === preset.url ? 'border-[#5865F2] scale-105 shadow-md' : 'border-[#2b2d31] opacity-40 hover:opacity-80'}`} style={{ backgroundImage: `url(${preset.url})` }}><div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[9px] text-white font-black uppercase tracking-wider">{preset.name}</span></div></div>
                ))}
              </div>
              <input type="text" value={backgroundUrl} onChange={(e) => { setBackgroundUrl(e.target.value); setIsDirty(true); }} placeholder="Or paste external custom direct image link here..." className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-[10px] text-white focus:outline-none focus:border-[#5865F2]" />
            </div>
          </div>
        </div>

        {/* ==========================================
            [SECTION 2: CORE SYSTEM MATRIX GRID] -> 하단으로 전면 이동
           ========================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEVELING PROTOCOL SETTINGS */}
          <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-5 shadow-xl">
            <h2 className="text-xs font-black tracking-widest text-[#5865F2] uppercase border-b border-[#2b2d31] pb-2">🎮 LEVELING PROTOCOL SETTINGS</h2>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-[#b5bac1] tracking-wider uppercase">Global XP Multiplier Rate</label>
              <input type="number" min="0.1" max="10" step="0.1" value={xpRate} onChange={(e) => { setXpRate(parseFloat(e.target.value)); setIsDirty(true); }} className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#5865F2]" />
              <p className="text-[10px] text-[#57576F]">메시지 1개당 기본 15~25 XP에 곱해지는 배율이에요. 1.0이 기본값, 2.0이면 레벨업 속도가 2배 빨라져요. (허용 범위: 0.1~10)</p>
            </div>
            <div className="space-y-3 pt-2">
              <label className="text-[11px] font-black text-[#b5bac1] tracking-wider uppercase block">🎖️ Milestone Role Rewards</label>
              <p className="text-[10px] text-[#57576F]">⚠️ 해당 레벨에 정확히 도달했을 때만 지급돼요(예: 10·20 둘 다 등록해놔도 15에서 25로 바로 뛰면 둘 다 못 받음). 봇의 역할이 지급할 역할보다 서버 역할 목록에서 위에 있어야 정상 작동해요.</p>
              <div className="flex gap-2">
                <input type="number" placeholder="Lvl" value={newLvl} onChange={(e) => setNewLvl(e.target.value)} className="w-1/4 bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white focus:outline-none" />
                <input type="text" placeholder="Role ID" value={newRoleId} onChange={(e) => setNewRoleId(e.target.value.replace(/[^0-9]/g, ''))} className="w-3/4 bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none" />
              </div>
              <button type="button" onClick={appendMilestone} className="w-full bg-[#2b2d31] hover:bg-[#35373c] border border-[#4e5058]/30 rounded-lg py-2 text-[11px] font-black tracking-widest text-white transition">+ APPEND MILESTONE MAPPING</button>
              {Object.keys(roleRewards).length > 0 && (
                <div className="mt-2 p-3 bg-[#111214] rounded-xl border border-[#232428] space-y-2 max-h-32 overflow-y-auto">
                  {Object.entries(roleRewards).map(([lvl, rId]) => (
                    <div key={lvl} className="flex justify-between items-center text-xs font-mono bg-[#1e1f22] p-2 rounded border border-[#2b2d31]"><span>Lvl <strong className="text-[#5865F2]">{lvl}</strong> ➔ ID: {rId}</span><button type="button" onClick={() => removeMilestone(lvl)} className="text-red-400 hover:text-red-600 font-bold px-1">✕</button></div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SERVER CURRENCY MATRIX */}
          <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-5 shadow-xl">
            <h2 className="text-xs font-black tracking-widest text-green-400 uppercase border-b border-[#2b2d31] pb-2">🪙 SERVER CURRENCY MATRIX</h2>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-[#b5bac1] tracking-wider uppercase">Currency Ticker Name</label>
              <input type="text" value={currencyName} onChange={(e) => { setCurrencyName(e.target.value); setIsDirty(true); }} className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-green-500" />
              <p className="text-[10px] text-[#57576F]">/balance, /shop, /inventory 등 화폐가 표시되는 모든 곳에서 이 이름이 쓰여요.</p>
            </div>
            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-black text-[#b5bac1] tracking-wider uppercase">Minimum Casino Bet Amount</label>
              <input type="number" min="1" max="5000" value={minBet} onChange={(e) => { setMinBet(parseInt(e.target.value) || 0); setIsDirty(true); }} className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-green-500" />
              <p className="text-[10px] text-[#57576F]">/bet, /blackjack, /mines, /roulette 전체에 적용되는 최소 배팅액이에요. ⚠️ 5,000을 넘기면 Mines/Roulette은 아예 플레이할 수 없게 돼요(그 두 게임의 자체 최대 배팅 한도가 5,000이라서). (허용 범위: 1~5,000)</p>
            </div>
          </div>
        </div>

        {/* ==========================================
            [SECTION 3: AUTOMATED COMMERCE REGISTRY]
           ========================================== */}
        <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 space-y-5 shadow-xl">
          <h2 className="text-xs font-black tracking-wider text-yellow-500 uppercase border-b border-[#2b2d31] pb-2">🛒 AUTOMATED COMMERCE MARKET REGISTRY (SHOP ITEMS)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400">ITEM ASSET TITLE</label>
              <input type="text" placeholder="e.g. VIP_Pass" value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-yellow-500" />
              <p className="text-[10px] text-[#57576F]">공백은 저장 시 자동으로 _로 바뀌어요(예: VIP Pass → VIP_Pass). /shop buy에서 이 이름으로 구매하며, 대소문자는 구분하지 않아요.</p>
            </div>
            <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400">COST PRICE</label><input type="number" min="0" value={newItemPrice} onChange={(e) => setNewItemPrice(parseInt(e.target.value) || 0)} className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-yellow-500" /></div>
            <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400">TELEMETRY DATA</label><input type="text" placeholder="Short Item Info" value={newItemDescription} onChange={(e) => setNewItemDescription(e.target.value)} className="w-full bg-[#111214] border border-[#232428] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-yellow-500" /></div>
          </div>
          <button type="button" onClick={injectShopItem} className="w-full bg-yellow-600/10 hover:bg-yellow-600 border border-yellow-500/20 text-yellow-400 hover:text-white text-xs font-black py-3 rounded-xl tracking-widest transition-all cursor-pointer">+ INJECT NEW MERCHANDISE NODE INTO MATRIX</button>
          <div className="pt-4 border-t border-[#2b2d31] space-y-3">
            <h3 className="text-[11px] font-black text-[#949ba4] tracking-widest uppercase">🌌 ACTIVE SERVERSIDE SHOP INVENTORY NODES ({shopItems.length})</h3>
            {shopItems.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-[#4e5058]/30 rounded-xl bg-[#111214]/50"><p className="text-xs text-gray-500">No items deployed in this grid yet.</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {shopItems.map((item, idx) => (
                  <div key={idx} className="bg-[#111214] border border-[#232428] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start"><h4 className="text-xs font-black text-white font-mono truncate max-w-[65%]">📦 {item.name}</h4><span className="text-[10px] font-bold text-green-400 bg-green-950/40 border border-green-500/20 px-2 py-0.5 rounded-full">{item.price.toLocaleString()} {currencyName}</span></div>
                      <p className="text-[11px] text-gray-400 line-clamp-2">{item.description}</p>
                    </div>
                    <button type="button" onClick={() => purgeShopItem(idx)} className="w-full bg-red-950/30 hover:bg-red-600 text-red-400 hover:text-white text-[10px] font-black py-1.5 rounded-lg border border-red-500/10 transition-all">🗑️ PURGE ITEM NODE</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Floating Status Warning Alert */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1e1f22]/95 border border-[#FFD700]/50 px-6 py-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-8 backdrop-blur-md w-[90%] max-w-xl">
          <span className="text-xs font-bold text-gray-200">⚠️ Status Matrix Warning: Uncommitted Changes Detected</span>
          <div className="flex gap-3"><button type="button" onClick={() => { loadSettings(guildId); setIsDirty(false); }} className="text-xs font-bold text-gray-400 hover:text-white transition">Discard</button><button type="button" onClick={handleSaveAll} className="bg-[#23A55A] hover:bg-[#1a7f43] text-white text-xs font-black px-5 py-2 rounded-lg">Commit All</button></div>
        </div>
      )}
    </div>
  );
}
