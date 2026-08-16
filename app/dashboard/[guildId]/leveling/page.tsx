'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import RoleSelect from '@/components/RoleSelect';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { SHOP_ITEM_PRICE_MAX, SHOP_ITEM_NAME_MAX_LENGTH, SHOP_ITEM_DESCRIPTION_MAX_LENGTH } from '@/lib/levelingEconomySettings';

// 🛡️ cogs/economy.py의 /shop add·/shop view·/shop buy는 전부 item['name']을 읽는다 - 예전엔
// 여기서 'title'로 저장해서 봇이 KeyError로 죽는 실제 크래시가 있었다(대시보드로 만든 아이템은
// 명령어 쪽에서 아예 인식 못 함). 봇 쪽이 더 널리 쓰이는 컨벤션이라 그쪽 이름에 맞춘다.
interface ShopItem {
  name: string;
  price: number;
  description: string;
}

interface RoleOption {
  id: string;
  name: string;
  color: number;
}

export default function LevelingEconomySettings() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const t = useT();

  const [guildId, setGuildId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // 🏆 Leveling System States
  const [xpRate, setXpRate] = useState(1);
  const [roleRewards, setRoleRewards] = useState<{ [key: string]: string }>({});
  const [roles, setRoles] = useState<RoleOption[]>([]);
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

  // RoleSelect fetches its own copy of this list internally to render the dropdown - fetched again
  // here (separately) so the milestone list below can resolve role IDs to names for display.
  useEffect(() => {
    if (!guildId) return;
    let cancelled = false;
    fetch(`/api/guilds/${guildId}/roles`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setRoles(data);
      })
      .catch((err) => console.error('[LEVELING] Failed to load role list:', err));
    return () => {
      cancelled = true;
    };
  }, [guildId]);

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
    if (!newLvl.trim() || !newRoleId.trim()) {
      showToast(t('levelingPage.missingMilestoneFields'), 'error'); return;
    }
    if (!/^\d+$/.test(newRoleId) || newRoleId.length < 17) {
      showToast(t('levelingPage.invalidRoleId'), 'error'); return;
    }
    setRoleRewards(prev => ({ ...prev, [newLvl.trim()]: newRoleId.trim() }));
    setNewLvl(''); setNewRoleId(''); setIsDirty(true);
  };

  const removeMilestone = (lvlKey: string) => {
    setRoleRewards(prev => { const updated = { ...prev }; delete updated[lvlKey]; return updated; });
    setIsDirty(true);
  };

  // cogs/economy.py shop_add()의 4개 규칙을 그대로 재현 - "전체 저장" 버튼을 눌러야 비로소
  // level-eco-setting POST의 서버 검증(같은 규칙, authoritative)에 걸리는 게 아니라, /shop add
  // 명령어처럼 이 버튼을 누르는 즉시 에러가 뜨게 한다. 서버 검증은 이 클라이언트 체크를 우회한
  // 요청까지 막는 최후 방어선으로 남겨둔다.
  const injectShopItem = () => {
    if (!newItemTitle.trim()) {
      showToast(t('levelingPage.missingItemTitle'), 'error'); return;
    }
    const price = Number(newItemPrice);
    if (!Number.isFinite(price) || price <= 0) {
      showToast(t('levelingPage.itemErrInvalidPrice'), 'error'); return;
    }
    if (price > SHOP_ITEM_PRICE_MAX) {
      showToast(t('levelingPage.itemErrPriceTooHigh'), 'error'); return;
    }
    const computedName = newItemTitle.trim().replace(/\s+/g, '_');
    const description = newItemDescription.trim();
    if (computedName.length > SHOP_ITEM_NAME_MAX_LENGTH || description.length > SHOP_ITEM_DESCRIPTION_MAX_LENGTH) {
      showToast(t('levelingPage.itemErrBoundsOverflow'), 'error'); return;
    }
    if (shopItems.some((item) => item.name.toLowerCase() === computedName.toLowerCase())) {
      showToast(t('levelingPage.itemErrDuplicate'), 'error'); return;
    }
    const newItem: ShopItem = { name: computedName, price, description };
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
        showToast(t('common.saveSuccess'), 'success');
        setIsDirty(false);
      } else {
        const errBody = await res.json().catch(() => null);
        showToast(errBody?.error || t('common.networkError'), 'error');
      }
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  if (status === 'loading') return null;

  return (
    <div className="min-h-screen bg-bg-base text-text-primary p-2 sm:p-4 md:p-6 pb-28">
      <SettingsPageContainer>

        {/* ==========================================
            [SECTION 0: HEADER PROTOCOL]
           ========================================== */}
        <header className="border-b border-border-default pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wider text-brand">{t('levelingPage.title')}</h1>
            <HelpText className="mt-1 tracking-widest uppercase">{t('levelingPage.subtitle')}</HelpText>
          </div>
          <Button type="button" variant="primary" onClick={handleSaveAll} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? t('levelingPage.committing') : t('levelingPage.saveButton')}
          </Button>
        </header>

        <Card>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            {t('levelingPage.intro')}
          </p>
        </Card>

        {/* ==========================================
            [SECTION 1: VISUAL DESIGN CLUSTER] -> 성격 맞는 애들끼리 최상단에 묶음!
           ========================================== */}
        <Card className="space-y-4">
          <h3 className="text-sm font-black tracking-widest text-text-secondary border-b border-border-default pb-2">{t('levelingPage.cardPreviewTitle')}</h3>

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
                  <span className="text-sm font-bold text-[#b5bac1] mt-2 ml-1 font-sans">485,172 / 1,500 XP</span>
                </div>
                <div className="absolute right-0 top-2 flex items-baseline gap-4 font-black">
                  <div className="flex items-baseline gap-1 font-sans text-sm text-[#b5bac1]"><span>RANK</span><span className="text-2xl font-black text-white font-mono">#1</span></div>
                  <div className="flex items-baseline gap-1 font-sans text-sm text-[#b5bac1]"><span>LEVEL</span><span className="text-3xl font-black font-mono" style={{ color: cardColor }}>15</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Graphical Modifiers Panel (바로 붙여서 스크롤 낭비 차단) */}
          <div className="pt-4 space-y-4">
            <h2 className="text-sm font-semibold tracking-widest text-text-primary uppercase border-b border-border-default pb-2">{t('levelingPage.graphicalModifiers')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-text-secondary">{t('levelingPage.accentColorLabel')}</label>
                <div className="flex flex-wrap gap-1.5">{colorPresets.map((p) => (<button key={p} type="button" onClick={() => { setCardColor(p); setIsDirty(true); }} className={`w-5 h-5 rounded-full border ${cardColor.toLowerCase() === p.toLowerCase() ? 'border-white scale-110' : 'border-transparent opacity-60'}`} style={{ backgroundColor: p }} />))}</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-text-secondary">{t('levelingPage.solidBgLabel')}</label>
                <div className="flex flex-wrap gap-1.5">{bgColorPresets.map((p) => (<button key={p} type="button" onClick={() => { setCardBgColor(p); setIsDirty(true); }} className={`w-5 h-5 rounded-full border ${cardBgColor.toLowerCase() === p.toLowerCase() ? 'border-white scale-110' : 'border-transparent opacity-60'}`} style={{ backgroundColor: p }} />))}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-text-secondary">{t('levelingPage.overlayOpacityLabel')} <span className="text-brand font-mono">{Math.round(overlayOpacity*100)}%</span></label>
                <input type="range" min="0.0" max="1.0" step="0.05" value={overlayOpacity} onChange={(e) => { setOverlayOpacity(parseFloat(e.target.value)); setIsDirty(true); }} className="w-full h-1 bg-bg-elevated rounded-lg cursor-pointer accent-brand" />
                <HelpText>{t('levelingPage.overlayOpacityHelp')}</HelpText>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-text-secondary">
                  {t('levelingPage.fontLabel')} <span className="text-amber-400 font-normal">{t('levelingPage.comingSoon')}</span>
                </label>
                <select value={fontPreference} disabled className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-gray-500 cursor-not-allowed opacity-50 focus:outline-none">
                  <option value="font-mono">👾 Cyber Monospace (Default)</option>
                  <option value="font-sans">📱 Clean Sans-Serif</option>
                  <option value="font-serif">🏛️ Elegant Serif</option>
                </select>
                <HelpText>{t('levelingPage.fontHelp')}</HelpText>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <label className="text-sm font-bold text-text-secondary">{t('levelingPage.wallpaperLabel')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {premiumPresets.map((preset, i) => (
                  <div key={i} onClick={() => { setBackgroundUrl(preset.url); setIsDirty(true); }} className={`aspect-[2.6/1] rounded-xl bg-cover bg-center cursor-pointer border relative group transition-all ${backgroundUrl === preset.url ? 'border-brand scale-105 shadow-md' : 'border-border-default opacity-40 hover:opacity-80'}`} style={{ backgroundImage: `url(${preset.url})` }}><div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[9px] text-white font-black uppercase tracking-wider">{preset.name}</span></div></div>
                ))}
              </div>
              <input type="text" value={backgroundUrl} onChange={(e) => { setBackgroundUrl(e.target.value); setIsDirty(true); }} placeholder={t('levelingPage.wallpaperUrlPlaceholder')} className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-[10px] text-text-primary focus:outline-none focus:border-brand" />
            </div>
          </div>
        </Card>

        {/* ==========================================
            [SECTION 2: CORE SYSTEM MATRIX GRID] -> 하단으로 전면 이동
           ========================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEVELING PROTOCOL SETTINGS */}
          <Card className="space-y-5">
            <h2 className="text-sm font-semibold tracking-widest text-text-primary uppercase border-b border-border-default pb-2">{t('levelingPage.levelingSectionTitle')}</h2>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-text-secondary tracking-wider uppercase">{t('levelingPage.xpRateLabel')}</label>
              <input type="number" min="0.1" max="10" step="0.1" value={xpRate} onChange={(e) => { setXpRate(parseFloat(e.target.value)); setIsDirty(true); }} className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-brand" />
              <HelpText>{t('levelingPage.xpRateHelp')}</HelpText>
            </div>
            <div className="space-y-3 pt-2">
              <label className="text-[11px] font-black text-text-secondary tracking-wider uppercase block">{t('levelingPage.milestoneLabel')}</label>
              <HelpText>{t('levelingPage.milestoneHelp')}</HelpText>
              <div className="flex gap-2">
                <input type="number" placeholder={t('levelingPage.levelPlaceholder')} value={newLvl} onChange={(e) => setNewLvl(e.target.value)} className="w-1/4 bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none" />
                <div className="w-3/4">
                  <RoleSelect guildId={guildId} value={newRoleId} onChange={setNewRoleId} />
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={appendMilestone} className="w-full !py-2 text-[11px] tracking-widest">{t('levelingPage.appendMilestone')}</Button>
              {Object.keys(roleRewards).length > 0 && (
                <Card elevated className="mt-2 !p-3 space-y-2 max-h-32 overflow-y-auto">
                  {Object.entries(roleRewards).map(([lvl, rId]) => {
                    const roleName = roles.find((r) => r.id === rId)?.name || rId;
                    return (
                      <div key={lvl} className="flex justify-between items-center text-sm font-mono bg-bg-surface p-2 rounded border border-border-default"><span>{t('levelingPage.milestoneRowLabel', { level: lvl, roleName })}</span><Button type="button" variant="danger" onClick={() => removeMilestone(lvl)} className="!px-2 !py-1 text-xs">✕</Button></div>
                    );
                  })}
                </Card>
              )}
            </div>
          </Card>

          {/* SERVER CURRENCY MATRIX */}
          <Card className="space-y-5">
            <h2 className="text-sm font-semibold tracking-widest text-text-primary uppercase border-b border-border-default pb-2">{t('levelingPage.currencySectionTitle')}</h2>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-text-secondary tracking-wider uppercase">{t('levelingPage.currencyNameLabel')}</label>
              <input type="text" value={currencyName} onChange={(e) => { setCurrencyName(e.target.value); setIsDirty(true); }} className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-green-500" />
              <HelpText>{t('levelingPage.currencyNameHelp')}</HelpText>
            </div>
            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-black text-text-secondary tracking-wider uppercase">{t('levelingPage.minBetLabel')}</label>
              <input type="number" min="1" max="5000" value={minBet} onChange={(e) => { setMinBet(parseInt(e.target.value) || 0); setIsDirty(true); }} className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-green-500" />
              <HelpText>{t('levelingPage.minBetHelp')}</HelpText>
            </div>
          </Card>
        </div>

        {/* ==========================================
            [SECTION 3: AUTOMATED COMMERCE REGISTRY]
           ========================================== */}
        <Card className="space-y-5">
          <h2 className="text-sm font-semibold tracking-wider text-text-primary uppercase border-b border-border-default pb-2">{t('levelingPage.shopSectionTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary">{t('levelingPage.itemTitleLabel')}</label>
              <input type="text" placeholder="e.g. VIP_Pass" value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-yellow-500" />
              <HelpText>{t('levelingPage.itemTitleHelp')}</HelpText>
            </div>
            <div className="space-y-1"><label className="text-[10px] font-bold text-text-secondary">{t('levelingPage.itemPriceLabel')}</label><input type="number" min="0" value={newItemPrice} onChange={(e) => setNewItemPrice(parseInt(e.target.value) || 0)} className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-yellow-500" /></div>
            <div className="space-y-1"><label className="text-[10px] font-bold text-text-secondary">{t('levelingPage.itemDescLabel')}</label><input type="text" placeholder={t('levelingPage.itemDescPlaceholder')} value={newItemDescription} onChange={(e) => setNewItemDescription(e.target.value)} className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-yellow-500" /></div>
          </div>
          <Button type="button" variant="secondary" onClick={injectShopItem} className="w-full !py-3 tracking-widest">{t('levelingPage.injectItem')}</Button>
          <div className="pt-4 border-t border-border-default space-y-3">
            <h3 className="text-[11px] font-black text-text-secondary tracking-widest uppercase">{t('levelingPage.activeItemsLabel', { count: shopItems.length })}</h3>
            {shopItems.length === 0 ? (
              <Card elevated className="text-center !py-6 border-dashed"><p className="text-sm text-gray-500">{t('levelingPage.noItemsYet')}</p></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {shopItems.map((item, idx) => (
                  <Card elevated key={idx} className="flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start"><h4 className="text-sm font-black text-text-primary font-mono truncate max-w-[65%]">📦 {item.name}</h4><span className="text-[10px] font-bold text-green-400 bg-green-950/40 border border-green-500/20 px-2 py-0.5 rounded-full">{item.price.toLocaleString()} {currencyName}</span></div>
                      <p className="text-[11px] text-gray-400 line-clamp-2">{item.description}</p>
                    </div>
                    <Button type="button" variant="danger" onClick={() => purgeShopItem(idx)} className="w-full !py-1.5 text-[10px]">{t('levelingPage.purgeItem')}</Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>

      </SettingsPageContainer>

      {/* Floating Status Warning Alert */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-bg-surface/95 border border-brand/50 px-6 py-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-8 backdrop-blur-md w-[90%] max-w-xl">
          <span className="text-sm font-bold text-gray-200">{t('levelingPage.unsavedWarning')}</span>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={() => { loadSettings(guildId); setIsDirty(false); }} className="!px-0">{t('common.discard')}</Button>
            <Button type="button" variant="success" onClick={handleSaveAll}>{t('levelingPage.commitAll')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
