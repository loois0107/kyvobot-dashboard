'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { buildReplaceWinnerToastMessage, replaceWinnerToastType } from '@/lib/giveawayReplace';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';

interface WinnerInfo {
  user_id: string;
  username: string | null;
  in_server: boolean;
}

interface Giveaway {
  id: number;
  prize: string;
  prize_type: 'points' | 'role';
  prize_amount: number | null;
  prize_role_id: string | null;
  prize_role_name: string | null;
  concluded_at: string;
  winners: WinnerInfo[];
}

type LoadStatus = 'loading' | 'loaded' | 'error';

export default function GiveawaysPage() {
  const params = useParams();
  const { showToast } = useToast();
  const t = useT();
  const guildId = (params?.guildId as string) || '';

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);

  const [replaceTarget, setReplaceTarget] = useState<{ giveaway: Giveaway; winner: WinnerInfo } | null>(null);
  const [reason, setReason] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    loadGiveaways();
  }, [guildId]);

  const extractErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data = await res.json();
      return data.message || t('common.requestFailed', { status: res.status });
    } catch {
      return t('common.requestFailed', { status: res.status });
    }
  };

  const loadGiveaways = async () => {
    setLoadStatus('loading');
    setLoadErrorMsg('');
    try {
      const res = await fetch(`/api/giveaways/${guildId}`);
      if (!res.ok) {
        setLoadErrorMsg(await extractErrorMessage(res));
        setLoadStatus('error');
        return;
      }
      const data = await res.json();
      setGiveaways(data.giveaways || []);
      setLoadStatus('loaded');
    } catch (err) {
      console.error(err);
      setLoadErrorMsg(t('giveawaysPage.loadNetworkError'));
      setLoadStatus('error');
    }
  };

  const openReplaceDialog = (giveaway: Giveaway, winner: WinnerInfo) => {
    setReplaceTarget({ giveaway, winner });
    setReason('');
  };

  // 🛡️ 실제 처리는 봇의 내부 웹훅으로 위임된다(cogs/giveaway.py의 _replace_winner) - 포인트
  // 회수/지급, 역할 지급, 공지 채널 정정 메시지, 감사 기록 전부 봇 쪽에서 처리한다. 역할 상품은
  // 원 당첨자 역할을 자동으로 회수하지 않으므로, 성공 후에도 그 사실을 다시 한번 알려준다.
  const handleConfirmReplace = async () => {
    if (!replaceTarget || !reason.trim()) return;
    setIsReplacing(true);
    try {
      const res = await fetch(`/api/giveaways/${guildId}/replace-winner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giveaway_id: replaceTarget.giveaway.id,
          original_winner_id: replaceTarget.winner.user_id,
          reason: reason.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const roleLabel = replaceTarget.giveaway.prize_role_name || replaceTarget.giveaway.prize_role_id;
        showToast(
          buildReplaceWinnerToastMessage(!!data.role_note, data.payout_ok, roleLabel),
          replaceWinnerToastType(data.payout_ok)
        );
        setReplaceTarget(null);
        await loadGiveaways();
      } else {
        showToast(data.message || t('common.requestFailed', { status: res.status }), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('giveawaysPage.replaceNetworkError'), 'error');
    } finally {
      setIsReplacing(false);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#949ba4] text-sm">
        {t('giveawaysPage.loadingGiveaways')}
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-red-400 font-bold">{t('giveawaysPage.loadFailed')}</p>
        <p className="text-sm text-[#949ba4]">{loadErrorMsg}</p>
        <button type="button" onClick={loadGiveaways} className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black px-6 py-3 rounded-xl">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <SettingsPageContainer className="pb-16">
      <header className="border-b border-[#2b2d31] pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">{t('giveawaysPage.title')}</h1>
          <HelpText className="mt-1">
            {t('giveawaysPage.subtitle')}
          </HelpText>
        </div>
        <button type="button" onClick={loadGiveaways} className="text-xs font-bold text-[#5865F2] hover:underline">
          {t('common.refresh')}
        </button>
      </header>

      {giveaways.length === 0 ? (
        <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-6 shadow-xl">
          <p className="text-sm text-[#949ba4] py-4">{t('giveawaysPage.noGiveawaysYet')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {giveaways.map((g) => (
            <div key={g.id} className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#2b2d31] pb-2">
                <h3 className="text-sm font-black text-white">🎁 {g.prize}</h3>
                <span className="text-xs text-[#8b8d98]">{new Date(g.concluded_at).toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-[#949ba4]">
                {g.prize_type === 'points'
                  ? t('giveawaysPage.pointsPerWinner', { amount: g.prize_amount?.toLocaleString() || '0' })
                  : t('giveawaysPage.roleLabel', { role: g.prize_role_name || g.prize_role_id || '' })}
              </p>
              <div className="space-y-2">
                {g.winners.map((w) => (
                  <div key={w.user_id} className="flex items-center justify-between gap-3 bg-[#111214] rounded-lg px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {w.username || t('giveawaysPage.unknownUser', { id: w.user_id })}
                      </p>
                      {!w.in_server && <p className="text-[10px] text-red-400">{t('giveawaysPage.noLongerInServer')}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => openReplaceDialog(g, w)}
                      className="shrink-0 bg-[#2b2d31] hover:bg-[#35373c] text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
                    >
                      {t('giveawaysPage.replaceButton')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {replaceTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-white">
              {t('giveawaysPage.replaceWinnerForPrefix')} <span className="text-[#FFD700]">{replaceTarget.giveaway.prize}</span>?
            </h3>
            <p className="text-xs text-[#b5bac1]">
              {t('giveawaysPage.replaceWinnerBody', { winner: replaceTarget.winner.username || replaceTarget.winner.user_id })}
              {replaceTarget.giveaway.prize_type === 'points' && t('giveawaysPage.replaceWinnerPointsNote')}
            </p>
            {replaceTarget.giveaway.prize_type === 'role' && (
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-3 text-[11px] text-amber-300">
                {t('giveawaysPage.replaceWinnerRoleWarning', { role: replaceTarget.giveaway.prize_role_name || replaceTarget.giveaway.prize_role_id || '' })}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#b5bac1]">{t('giveawaysPage.reasonLabel')}</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('giveawaysPage.reasonPlaceholder')}
                rows={2}
                className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#5865F2]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setReplaceTarget(null)}
                disabled={isReplacing}
                className="text-xs font-bold text-gray-400 hover:text-white transition px-4 py-2"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmReplace}
                disabled={isReplacing || !reason.trim()}
                className="bg-[#ED4245] hover:bg-[#c13537] disabled:opacity-50 text-white text-xs font-black px-5 py-2 rounded-lg"
              >
                {isReplacing ? t('giveawaysPage.replacing') : t('giveawaysPage.confirmReplace')}
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsPageContainer>
  );
}
