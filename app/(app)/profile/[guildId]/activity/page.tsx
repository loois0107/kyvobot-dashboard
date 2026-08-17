'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const HISTORY_PREVIEW_COUNT = 5;

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

export default function ProfileActivityPage() {
  const params = useParams();
  const { status } = useSession();
  const { showToast } = useToast();
  const t = useT();

  // 🛡️ Badge는 success/warning/danger/neutral 4단계뿐이라 "모집중"(브랜드 블루)엔 대응하는
  // variant가 없다 - 억지로 neutral에 욱여넣으면 모집중/종료/만료가 전부 같은 회색이 되어 색으로
  // 구분하던 의미가 사라진다. 그래서 모집중만 Badge의 시각 레시피(text-[10px] font-mono px-2 py-0.5
  // rounded font-black uppercase)를 그대로 재현한 별도 span으로 렌더링한다(렌더 지점 참고).
  const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'neutral' | 'brand' }> = {
    recruiting: { label: t('profileCardPage.statusRecruiting'), variant: 'brand' },
    full: { label: t('profileCardPage.statusFull'), variant: 'success' },
    closed: { label: t('profileCardPage.statusClosed'), variant: 'neutral' },
    expired: { label: t('profileCardPage.statusExpired'), variant: 'neutral' },
  };

  const rawGuildId = params?.guildId as string | undefined;
  // 🛡️ page.tsx/layout.tsx에도 있는 동일한 가드 - 하이드레이션 완료 전 리터럴 "[guildId]"
  // 플레이스홀더가 잠깐 넘어올 수 있다.
  const guildId = rawGuildId && rawGuildId !== '[guildId]' && !rawGuildId.includes('%5B') ? rawGuildId : '';

  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [history, setHistory] = useState<PartyHistoryEntry[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const [shopLoading, setShopLoading] = useState(true);
  const [shopError, setShopError] = useState('');
  const [points, setPoints] = useState(0);
  const [currencyName, setCurrencyName] = useState('Points');
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [purchasingItem, setPurchasingItem] = useState('');

  const [favoriteGameLoading, setFavoriteGameLoading] = useState(true);
  const [favoriteGameError, setFavoriteGameError] = useState('');
  const [favoriteGame, setFavoriteGame] = useState<string | null>(null);
  const [gamePresets, setGamePresets] = useState<string[]>([]);
  const [selectedGameDraft, setSelectedGameDraft] = useState('');
  const [isSavingFavoriteGame, setIsSavingFavoriteGame] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || !guildId) return;
    loadHistory();
    loadShop();
    loadFavoriteGame();
  }, [status, guildId]);

  // API가 { error: "..." } / { status, message } 어느 모양으로 응답하든 사람이 읽을 문구를 뽑아낸다.
  // "Failed to save. Please try again." 같은 뭉뚱그린 메시지 대신 실제 원인(401/403/500 + 서버 메시지)을
  // 유저에게 그대로 보여줘야 DevTools 없이도 뭐가 문제인지 알 수 있다.
  const extractErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data = await res.json();
      return data.message || data.error || t('common.requestFailed', { status: res.status });
    } catch {
      return t('common.requestFailed', { status: res.status });
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    setShowAllHistory(false);
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
      setHistoryError(t('profileCardPage.historyNetworkError'));
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
      setShopError(t('profileCardPage.shopNetworkError'));
    } finally {
      setShopLoading(false);
    }
  };

  // 🛡️ 구매 처리는 봇의 buy_item 커맨드와 동일한 내부 웹훅으로 위임된다(cogs/economy.py의
  // _process_purchase) - 대시보드는 포인트/인벤토리를 직접 건드리지 않는다. active_transactions
  // 락 덕분에 이 버튼을 더블클릭해도, 또는 같은 유저가 동시에 /shop buy 커맨드를 쳐도 하나만
  // 통과한다(나머지는 "locked" 사유로 거부됨).
  // 🛡️ 실제 재화가 즉시 차감되는 유일한 동작이라 confirm()을 fetch 전(가드 바로 다음)에 둔다 -
  // 취소하면 네트워크 요청 자체가 안 나간다. itemName만 받던 이전 시그니처는 확인 문구에 필요한
  // 가격/화폐명이 없어서 item 전체를 받도록 바꿨다(호출부가 이미 item을 들고 있어 조회 불필요).
  const handleBuy = async (item: ShopItem) => {
    if (purchasingItem) return;
    if (!confirm(t('profileCardPage.confirmPurchase', { item: item.name, price: item.price?.toLocaleString() || '0', currency: currencyName }))) return;
    setPurchasingItem(item.name);
    try {
      const res = await fetch(`/api/profile/${guildId}/shop/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_name: item.name }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(t('profileCardPage.purchasedSuccess', { item: data.item_name, price: data.price?.toLocaleString() || '0', currency: data.currency_name }), 'success');
        setPoints(data.remaining_points ?? points);
      } else {
        showToast(data.message || t('profileCardPage.purchaseFailed', { status: res.status }), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('profileCardPage.purchaseNetworkError'), 'error');
    } finally {
      setPurchasingItem('');
    }
  };

  const loadFavoriteGame = async () => {
    setFavoriteGameLoading(true);
    setFavoriteGameError('');
    try {
      const res = await fetch(`/api/profile/${guildId}/favorite-game`);
      if (res.ok) {
        const data = await res.json();
        setFavoriteGame(data.favorite_game_name || null);
        setGamePresets(data.presets || []);
        setSelectedGameDraft(data.favorite_game_name || '');
      } else {
        setFavoriteGameError(await extractErrorMessage(res));
      }
    } catch (err) {
      console.error(err);
      setFavoriteGameError(t('profileCardPage.favoriteGameLoadNetworkError'));
    } finally {
      setFavoriteGameLoading(false);
    }
  };

  // 🛡️ /party_recruit이 game 파라미터를 생략했을 때 여기서 저장한 값을 자동으로 대신 쓴다
  // (cogs/party.py의 resolve_effective_game) - Discord 슬래시 커맨드는 유저별 기본값을 UI
  // 레벨에서 지원하지 않아서, 이게 실질적인 "기본값 자동 채움" 구현이다.
  const handleSaveFavoriteGame = async () => {
    if (!selectedGameDraft) return;
    setIsSavingFavoriteGame(true);
    try {
      const res = await fetch(`/api/profile/${guildId}/favorite-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_name: selectedGameDraft }),
      });
      if (res.ok) {
        setFavoriteGame(selectedGameDraft);
        showToast(t('profileCardPage.favoriteGameSetSuccess', { game: selectedGameDraft }), 'success');
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('profileCardPage.favoriteGameSaveNetworkError'), 'error');
    } finally {
      setIsSavingFavoriteGame(false);
    }
  };

  const handleClearFavoriteGame = async () => {
    setIsSavingFavoriteGame(true);
    try {
      const res = await fetch(`/api/profile/${guildId}/favorite-game`, { method: 'DELETE' });
      if (res.ok) {
        setFavoriteGame(null);
        setSelectedGameDraft('');
        showToast(t('profileCardPage.favoriteGameClearedSuccess'), 'success');
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('profileCardPage.favoriteGameClearNetworkError'), 'error');
    } finally {
      setIsSavingFavoriteGame(false);
    }
  };

  if (status === 'loading') return <div className="min-h-screen bg-bg-base" />;

  const visibleHistory = showAllHistory ? history : history.slice(0, HISTORY_PREVIEW_COUNT);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary p-2 sm:p-4 md:p-6 space-y-4">
      <SettingsPageContainer>
        <div className="space-y-4 bg-bg-surface border border-border-default rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-border-default pb-2">
            <h3 className="text-xs font-black tracking-widest text-text-secondary uppercase">
              {t('profileCardPage.shopTitle')}
            </h3>
            {!shopLoading && !shopError && (
              <span className="text-xs font-bold text-brand">🪙 {points.toLocaleString()} {currencyName}</span>
            )}
          </div>

          {shopLoading ? (
            <p className="text-sm text-text-secondary py-4">{t('profileCardPage.loadingShop')}</p>
          ) : shopError ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-danger">⚠️ {shopError}</p>
              <button type="button" onClick={loadShop} className="text-xs font-bold text-brand hover:underline">
                {t('common.retry')}
              </button>
            </div>
          ) : shopItems.length === 0 ? (
            <p className="text-sm text-text-secondary py-4">{t('profileCardPage.shopEmpty')}</p>
          ) : (
            <div className="space-y-2">
              {shopItems.map((item) => {
                const affordable = item.price !== null && points >= item.price;
                const isPurchasing = purchasingItem === item.name;
                return (
                  <div key={item.name} className="flex items-center justify-between gap-3 bg-bg-base rounded-lg px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">{item.name}</p>
                      {item.description && <HelpText className="truncate">{item.description}</HelpText>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-brand">
                        {item.price !== null ? `${item.price.toLocaleString()} ${currencyName}` : 'N/A'}
                      </span>
                      <Button
                        type="button"
                        variant="success"
                        onClick={() => handleBuy(item)}
                        disabled={item.price === null || !affordable || Boolean(purchasingItem)}
                        className="!text-[10px] !px-3 !py-1.5"
                      >
                        {isPurchasing ? t('profileCardPage.buying') : item.price === null ? t('profileCardPage.unavailable') : affordable ? t('profileCardPage.buy') : t('profileCardPage.notEnough')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4 bg-bg-surface border border-border-default rounded-2xl p-4 sm:p-6 shadow-xl">
          <h3 className="text-xs font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
            {t('profileCardPage.favoriteGameTitle')}
          </h3>
          <HelpText>
            {t('profileCardPage.favoriteGameDesc')}
          </HelpText>

          {favoriteGameLoading ? (
            <p className="text-sm text-text-secondary py-2">{t('profileCardPage.loadingShort')}</p>
          ) : favoriteGameError ? (
            <div className="py-2 space-y-2">
              <p className="text-sm text-danger">⚠️ {favoriteGameError}</p>
              <button type="button" onClick={loadFavoriteGame} className="text-xs font-bold text-brand hover:underline">
                {t('common.retry')}
              </button>
            </div>
          ) : gamePresets.length === 0 ? (
            <p className="text-sm text-text-secondary py-2">{t('profileCardPage.noPresetsYet')}</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedGameDraft}
                onChange={(e) => setSelectedGameDraft(e.target.value)}
                className="flex-1 bg-bg-base border border-border-default rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-brand"
              >
                <option value="" disabled>{t('profileCardPage.selectGamePlaceholder')}</option>
                {gamePresets.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <Button type="button" variant="primary" onClick={handleSaveFavoriteGame} disabled={isSavingFavoriteGame || !selectedGameDraft || selectedGameDraft === favoriteGame} className="!text-xs">
                {isSavingFavoriteGame ? t('common.saving') : t('common.save')}
              </Button>
              {favoriteGame && (
                <Button type="button" variant="secondary" onClick={handleClearFavoriteGame} disabled={isSavingFavoriteGame} className="!text-xs">
                  {t('profileCardPage.clear')}
                </Button>
              )}
            </div>
          )}
          {favoriteGame && !favoriteGameLoading && (
            <p className="text-[10px] text-success">{t('profileCardPage.currentlySetTo', { game: favoriteGame })}</p>
          )}
        </div>

        <div className="space-y-4 bg-bg-surface border border-border-default rounded-2xl p-4 sm:p-6 shadow-xl">
          <h3 className="text-xs font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
            {t('profileCardPage.partyHistoryTitle')}
          </h3>

          {historyLoading ? (
            <p className="text-sm text-text-secondary py-4">{t('profileCardPage.loadingHistory')}</p>
          ) : historyError ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-danger">⚠️ {historyError}</p>
              <button type="button" onClick={loadHistory} className="text-xs font-bold text-brand hover:underline">
                {t('common.retry')}
              </button>
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-text-secondary py-4">{t('profileCardPage.noHistoryYet')}</p>
          ) : (
            <div className="space-y-2">
              {visibleHistory.map((entry) => {
                const badge = STATUS_BADGE[entry.status] || { label: entry.status, variant: 'neutral' as const };
                return (
                  <div key={entry.id} className="flex items-center justify-between gap-3 bg-bg-base rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] shrink-0" title={entry.role === 'leader' ? t('profileCardPage.ledRecruitment') : t('profileCardPage.joinedRecruitment')}>
                        {entry.role === 'leader' ? '👑' : '🙋'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-primary truncate">
                          {entry.selected_game || entry.queue_type}
                          {entry.lanes && <span className="text-text-secondary font-normal"> · {entry.lanes}</span>}
                        </p>
                        <HelpText>{new Date(entry.created_at).toLocaleString()}</HelpText>
                      </div>
                    </div>
                    {badge.variant === 'brand' ? (
                      <span className="bg-brand/10 text-brand border-brand/20 border text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase shrink-0">
                        {badge.label}
                      </span>
                    ) : (
                      <Badge variant={badge.variant} className="shrink-0">{badge.label}</Badge>
                    )}
                  </div>
                );
              })}
              {!showAllHistory && history.length > HISTORY_PREVIEW_COUNT && (
                <button
                  type="button"
                  onClick={() => setShowAllHistory(true)}
                  className="w-full text-center text-xs font-bold text-brand hover:underline py-2"
                >
                  {t('profileCardPage.showMoreHistory', { count: history.length - HISTORY_PREVIEW_COUNT })}
                </button>
              )}
            </div>
          )}
        </div>
      </SettingsPageContainer>
    </div>
  );
}
