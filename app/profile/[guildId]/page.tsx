'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast';

const COLOR_PRESETS = ['#5865F2', '#23A55A', '#FEE75C', '#EB459E', '#ED4245', '#9B59B6', '#00D2D3', '#54A0FF', '#FF6B6B', '#FFFFFF'];
const BG_COLOR_PRESETS = ['#1E1F22', '#2B2D31', '#313338', '#111214', '#0F0F1A', '#161626'];

interface PartyHistoryEntry {
  id: number;
  queue_type: string;
  lanes: string | null;
  selected_game: string | null;
  status: string;
  created_at: string;
  role: 'leader' | 'participant';
}

interface ShopItem {
  name: string;
  price: number | null;
  description: string;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  recruiting: { label: 'Recruiting', className: 'border-[#5865F2] text-[#5865F2] bg-[#5865F2]/10' },
  full: { label: 'Full', className: 'border-[#23A55A] text-[#23A55A] bg-[#23A55A]/10' },
  closed: { label: 'Closed', className: 'border-[#949ba4] text-[#949ba4] bg-[#949ba4]/10' },
  expired: { label: 'Expired', className: 'border-[#949ba4] text-[#949ba4] bg-[#949ba4]/10' },
};

export default function PersonalCardSettings() {
  const params = useParams();
  const { status } = useSession();
  const { showToast } = useToast();

  const rawGuildId = params?.guildId as string | undefined;
  // 🛡️ Next.js가 하이드레이션 완료 전 잠깐 리터럴 "[guildId]" 플레이스홀더를 그대로 넘길 때가
  // 있다 (leveling/welcome/ticket-settings 페이지에도 있는 동일한 방어 - dashboard/[guildId]는
  // layout.tsx가 이걸 중앙에서 막아주지만, /profile/[guildId]는 그 레이아웃 밖이라 각자 막아야
  // 한다). 이걸 막지 않으면 "%5BguildId%5D"가 그대로 API에 실려가 정크 행을 만든다.
  const guildId = rawGuildId && rawGuildId !== '[guildId]' && !rawGuildId.includes('%5B') ? rawGuildId : '';

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);

  const [cardColor, setCardColor] = useState('#5865F2');
  const [cardBgColor, setCardBgColor] = useState('#1E1F22');
  const [overlayOpacity, setOverlayOpacity] = useState(0.6);
  const [backgroundUrl, setBackgroundUrl] = useState('');

  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [history, setHistory] = useState<PartyHistoryEntry[]>([]);

  const [shopLoading, setShopLoading] = useState(true);
  const [shopError, setShopError] = useState('');
  const [points, setPoints] = useState(0);
  const [currencyName, setCurrencyName] = useState('Points');
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [purchasingItem, setPurchasingItem] = useState('');

  useEffect(() => {
    if (status !== 'authenticated' || !guildId) return;
    loadSettings();
    loadHistory();
    loadShop();
  }, [status, guildId]);

  // API가 { error: "..." } / { status, message } 어느 모양으로 응답하든 사람이 읽을 문구를 뽑아낸다.
  // "Failed to save. Please try again." 같은 뭉뚱그린 메시지 대신 실제 원인(401/403/500 + 서버 메시지)을
  // 유저에게 그대로 보여줘야 DevTools 없이도 뭐가 문제인지 알 수 있다.
  const extractErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data = await res.json();
      return data.message || data.error || `Request failed (${res.status})`;
    } catch {
      return `Request failed (${res.status})`;
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await fetch(`/api/profile/${guildId}/party-history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      } else {
        setHistoryError(await extractErrorMessage(res));
      }
    } catch (err) {
      console.error(err);
      setHistoryError('Network error while loading your party history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadShop = async () => {
    setShopLoading(true);
    setShopError('');
    try {
      const res = await fetch(`/api/profile/${guildId}/shop`);
      if (res.ok) {
        const data = await res.json();
        setPoints(data.points ?? 0);
        setCurrencyName(data.currency_name || 'Points');
        setShopItems(data.shop_items || []);
      } else {
        setShopError(await extractErrorMessage(res));
      }
    } catch (err) {
      console.error(err);
      setShopError('Network error while loading the shop.');
    } finally {
      setShopLoading(false);
    }
  };

  // 🛡️ 구매 처리는 봇의 buy_item 커맨드와 동일한 내부 웹훅으로 위임된다(cogs/economy.py의
  // _process_purchase) - 대시보드는 포인트/인벤토리를 직접 건드리지 않는다. active_transactions
  // 락 덕분에 이 버튼을 더블클릭해도, 또는 같은 유저가 동시에 /shop buy 커맨드를 쳐도 하나만
  // 통과한다(나머지는 "locked" 사유로 거부됨).
  const handleBuy = async (itemName: string) => {
    if (purchasingItem) return;
    setPurchasingItem(itemName);
    try {
      const res = await fetch(`/api/profile/${guildId}/shop/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_name: itemName }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(`Purchased ${data.item_name} for ${data.price?.toLocaleString()} ${data.currency_name}!`, 'success');
        setPoints(data.remaining_points ?? points);
      } else {
        showToast(data.message || `Purchase failed (${res.status})`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while purchasing.', 'error');
    } finally {
      setPurchasingItem('');
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile/${guildId}/card`);
      if (res.ok) {
        const data = await res.json();
        const effective = data.user_override
          ? { ...data.guild_defaults, ...data.user_override }
          : data.guild_defaults;
        setCardColor(effective.card_color);
        setCardBgColor(effective.card_bg_color);
        setOverlayOpacity(Number(effective.overlay_opacity));
        setBackgroundUrl(effective.background_url || '');
        setHasOverride(Boolean(data.user_override));
        setIsDirty(false);
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while loading your card settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!guildId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/profile/${guildId}/card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_color: cardColor,
          card_bg_color: cardBgColor,
          overlay_opacity: overlayOpacity,
          background_url: backgroundUrl,
        }),
      });
      if (res.ok) {
        showToast('Your rank card has been updated!', 'success');
        setIsDirty(false);
        setHasOverride(true);
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while saving.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!guildId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/profile/${guildId}/card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_color: null, card_bg_color: null, overlay_opacity: null, background_url: null }),
      });
      if (res.ok) {
        showToast('Reset to server default.', 'success');
        await loadSettings();
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while resetting.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading' || loading) return <div className="min-h-screen bg-[#111214]" />;

  return (
    <div className="min-h-screen bg-[#111214] text-[#dbdee1] p-2 sm:p-4 md:p-6 pb-28">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="border-b border-[#2b2d31] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">🎨 My Rank Card</h1>
            <p className="text-[10px] text-[#57576F] mt-1 tracking-widest uppercase">
              {hasOverride ? 'Personal style active for this server' : 'Currently using this server\'s default style'}
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {hasOverride && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="flex-1 sm:flex-none bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-black px-4 py-3 rounded-xl transition-all"
              >
                Reset to Default
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black px-6 py-3 rounded-xl shadow-lg tracking-widest transition-all"
            >
              {isSaving ? 'SAVING...' : 'SAVE MY CARD'}
            </button>
          </div>
        </header>

        <div className="space-y-4 bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 shadow-xl">
          <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
            /level Preview
          </h3>

          <div
            className="w-full aspect-[920/240] rounded-xl relative bg-cover bg-center overflow-hidden border border-[#232428]"
            style={{
              backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none',
              backgroundColor: backgroundUrl ? 'transparent' : cardBgColor,
            }}
          >
            <div
              className="absolute inset-[16px] rounded-xl flex items-center justify-between px-8"
              style={{ backgroundColor: `rgba(15, 15, 26, ${overlayOpacity})` }}
            >
              <div className="flex items-center gap-6 w-full h-full relative">
                <div
                  className="w-[150px] h-[150px] rounded-full bg-[#313338] border-[3px] flex-shrink-0 flex items-center justify-center relative overflow-hidden"
                  style={{ borderColor: cardColor }}
                >
                  <div className="w-[144px] h-[144px] rounded-full bg-gradient-to-tr from-gray-700 to-gray-500" />
                </div>
                <div className="flex-1 flex flex-col justify-start h-[150px] pt-2 font-mono">
                  <span className="text-2xl font-black text-white tracking-wide">You</span>
                  <div className="w-full h-[24px] bg-[#2b2d31] rounded-xl mt-6 border border-[#232428] overflow-hidden">
                    <div className="h-full rounded-xl" style={{ width: '65%', backgroundColor: cardColor }} />
                  </div>
                  <span className="text-xs font-bold text-[#b5bac1] mt-2 ml-1 font-sans">485,172 / 1,500 XP</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#b5bac1]">Accent Color</label>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setCardColor(p); setIsDirty(true); }}
                      className={`w-5 h-5 rounded-full border ${cardColor.toLowerCase() === p.toLowerCase() ? 'border-white scale-110' : 'border-transparent opacity-60'}`}
                      style={{ backgroundColor: p }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#b5bac1]">Background Color</label>
                <div className="flex flex-wrap gap-1.5">
                  {BG_COLOR_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setCardBgColor(p); setIsDirty(true); }}
                      className={`w-5 h-5 rounded-full border ${cardBgColor.toLowerCase() === p.toLowerCase() ? 'border-white scale-110' : 'border-transparent opacity-60'}`}
                      style={{ backgroundColor: p }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-[#b5bac1]">
                Overlay Opacity: <span className="text-[#5865F2] font-mono">{Math.round(overlayOpacity * 100)}%</span>
              </label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => { setOverlayOpacity(parseFloat(e.target.value)); setIsDirty(true); }}
                className="w-full h-1 bg-[#232428] rounded-lg cursor-pointer accent-[#5865F2]"
              />
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-[#b5bac1]">Background Image URL (optional)</label>
              <input
                type="text"
                value={backgroundUrl}
                onChange={(e) => { setBackgroundUrl(e.target.value); setIsDirty(true); }}
                placeholder="Paste a direct image link..."
                className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-[10px] text-white focus:outline-none focus:border-[#5865F2]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2b2d31] pb-2">
            <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase">
              🛒 Point Shop
            </h3>
            {!shopLoading && !shopError && (
              <span className="text-xs font-bold text-[#FFD700]">🪙 {points.toLocaleString()} {currencyName}</span>
            )}
          </div>

          {shopLoading ? (
            <p className="text-sm text-[#949ba4] py-4">Loading the shop...</p>
          ) : shopError ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-red-400">⚠️ {shopError}</p>
              <button type="button" onClick={loadShop} className="text-xs font-bold text-[#5865F2] hover:underline">
                Retry
              </button>
            </div>
          ) : shopItems.length === 0 ? (
            <p className="text-sm text-[#949ba4] py-4">🛒 The shop is currently empty. Staff hasn't added any items yet.</p>
          ) : (
            <div className="space-y-2">
              {shopItems.map((item) => {
                const affordable = item.price !== null && points >= item.price;
                const isPurchasing = purchasingItem === item.name;
                return (
                  <div key={item.name} className="flex items-center justify-between gap-3 bg-[#111214] rounded-lg px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.name}</p>
                      {item.description && <p className="text-[10px] text-[#57576F] truncate">{item.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-[#FFD700]">
                        {item.price !== null ? `${item.price.toLocaleString()} ${currencyName}` : 'N/A'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleBuy(item.name)}
                        disabled={item.price === null || !affordable || Boolean(purchasingItem)}
                        className="bg-[#23A55A] hover:bg-[#1a7f43] disabled:bg-[#2b2d31] disabled:text-[#57576F] disabled:cursor-not-allowed text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
                      >
                        {isPurchasing ? 'BUYING...' : item.price === null ? 'UNAVAILABLE' : affordable ? 'BUY' : 'NOT ENOUGH'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4 bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 shadow-xl">
          <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
            🎮 My Party History
          </h3>

          {historyLoading ? (
            <p className="text-sm text-[#949ba4] py-4">Loading your history...</p>
          ) : historyError ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-red-400">⚠️ {historyError}</p>
              <button type="button" onClick={loadHistory} className="text-xs font-bold text-[#5865F2] hover:underline">
                Retry
              </button>
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-[#949ba4] py-4">📭 No party recruitments yet in this server - join one or start your own with /party_recruit.</p>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => {
                const badge = STATUS_BADGE[entry.status] || { label: entry.status, className: 'border-[#949ba4] text-[#949ba4] bg-[#949ba4]/10' };
                return (
                  <div key={entry.id} className="flex items-center justify-between gap-3 bg-[#111214] rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] shrink-0" title={entry.role === 'leader' ? 'You led this recruitment' : 'You joined this recruitment'}>
                        {entry.role === 'leader' ? '👑' : '🙋'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {entry.selected_game || entry.queue_type}
                          {entry.lanes && <span className="text-[#949ba4] font-normal"> · {entry.lanes}</span>}
                        </p>
                        <p className="text-[10px] text-[#57576F]">{new Date(entry.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1e1f22]/95 border border-[#FFD700]/50 px-6 py-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-8 backdrop-blur-md w-[90%] max-w-xl">
          <span className="text-xs font-bold text-gray-200">⚠️ You have unsaved changes</span>
          <div className="flex gap-3">
            <button type="button" onClick={loadSettings} className="text-xs font-bold text-gray-400 hover:text-white transition">
              Discard
            </button>
            <button type="button" onClick={handleSave} className="bg-[#23A55A] hover:bg-[#1a7f43] text-white text-xs font-black px-5 py-2 rounded-lg">
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
