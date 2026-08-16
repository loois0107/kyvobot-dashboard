'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { buildReplaceWinnerToastMessage, replaceWinnerToastType } from '@/lib/giveawayReplace';
import { GIVEAWAY_MIN_DURATION_MINUTES, GIVEAWAY_MAX_DURATION_MINUTES } from '@/lib/giveawaySettings';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import ChannelSelect from '@/components/ChannelSelect';
import RoleSelect from '@/components/RoleSelect';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { TranslationKey } from '@/lib/i18n';

// 봇의 /internal/giveaway/create 응답 status를 그대로 통과시킨 code -> 로컬라이즈된 문구 매핑.
// unreachable/server_config/discord_fetch_failed/role_not_found/message_id_save_failed/unknown 등은
// 여기 없는 게 의도적 - twitch 페이지와 동일한 관례로, 그런 케이스는 서버가 이미 사람이 읽을 영어
// message를 내려주고 raw로 그대로 보여준다.
const CREATE_ERROR_CODE_KEY: Record<string, TranslationKey> = {
  missing_fields: 'giveawaysPage.errMissingFields',
  prize_too_long: 'giveawaysPage.errPrizeTooLong',
  invalid_metrics: 'giveawaysPage.errInvalidMetrics',
  role_required: 'giveawaysPage.errRoleRequired',
  role_is_admin: 'giveawaysPage.errRoleIsAdmin',
  bot_missing_manage_roles: 'giveawaysPage.errBotMissingManageRoles',
  role_hierarchy_blocked: 'giveawaysPage.errRoleHierarchyBlocked',
  post_failed: 'giveawaysPage.errPostFailed',
  save_failed: 'giveawaysPage.errSaveFailed',
};

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

  const [prize, setPrize] = useState('');
  const [entryCost, setEntryCost] = useState('10');
  const [winnerCount, setWinnerCount] = useState('1');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [channelId, setChannelId] = useState('');
  const [prizeType, setPrizeType] = useState<'points' | 'role'>('points');
  const [prizeAmount, setPrizeAmount] = useState('100');
  const [prizeRoleId, setPrizeRoleId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createConfirmDialog, setCreateConfirmDialog] = useState<{ dangerous: string[] } | null>(null);

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

  const resetCreateForm = () => {
    setPrize('');
    setEntryCost('10');
    setWinnerCount('1');
    setDurationMinutes('60');
    setChannelId('');
    setPrizeType('points');
    setPrizeAmount('100');
    setPrizeRoleId('');
    setCreateConfirmDialog(null);
  };

  const extractCreateErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data = await res.json();
      if (data.code === 'duration_out_of_range') {
        return t('giveawaysPage.errDurationRange', { min: GIVEAWAY_MIN_DURATION_MINUTES, max: GIVEAWAY_MAX_DURATION_MINUTES });
      }
      const key = CREATE_ERROR_CODE_KEY[data.code];
      if (key) return t(key);
      return data.message || t('giveawaysPage.errGeneric');
    } catch {
      return t('giveawaysPage.errGeneric');
    }
  };

  const submitCreate = async (confirmedDangerous: boolean) => {
    setIsCreating(true);
    try {
      const res = await fetch(`/api/giveaways/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prize: prize.trim(),
          channel_id: channelId,
          entry_cost: Number(entryCost),
          winner_count: Number(winnerCount),
          duration_minutes: Number(durationMinutes),
          prize_type: prizeType,
          prize_amount: prizeType === 'points' ? Number(prizeAmount) : null,
          prize_role_id: prizeType === 'role' ? prizeRoleId : null,
          confirmedDangerous,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const time = data?.ends_at ? new Date(data.ends_at).toLocaleString() : '';
        showToast(t('giveawaysPage.createSuccess', { prize: prize.trim(), time }), 'success');
        resetCreateForm();
        return;
      }
      if (res.status === 409) {
        const data = await res.json();
        setCreateConfirmDialog({ dangerous: data.dangerous_permissions || [] });
        return;
      }
      showToast(await extractCreateErrorMessage(res), 'error');
    } catch (err) {
      console.error(err);
      showToast(t('giveawaysPage.createNetworkError'), 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateClick = () => {
    submitCreate(false);
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
          buildReplaceWinnerToastMessage(t, !!data.role_note, data.payout_ok, roleLabel),
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
      <div className="min-h-[50vh] flex items-center justify-center text-[#949ba4] text-base">
        {t('giveawaysPage.loadingGiveaways')}
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-red-400 font-bold">{t('giveawaysPage.loadFailed')}</p>
        <p className="text-base text-[#949ba4]">{loadErrorMsg}</p>
        <Button type="button" variant="primary" onClick={loadGiveaways}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <SettingsPageContainer className="pb-16">
      <header className="border-b border-border-default pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-brand">{t('giveawaysPage.title')}</h1>
          <HelpText className="mt-1">
            {t('giveawaysPage.subtitle')}
          </HelpText>
        </div>
        <button type="button" onClick={loadGiveaways} className="text-sm font-bold text-brand hover:underline">
          {t('common.refresh')}
        </button>
      </header>

      <Card className="space-y-4">
        <h3 className="text-sm font-black tracking-widest text-text-secondary border-b border-border-default pb-2">
          {t('giveawaysPage.createSectionTitle')}
        </h3>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-text-secondary">{t('giveawaysPage.prizeLabel')}</label>
          <input
            type="text"
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            placeholder={t('giveawaysPage.prizePlaceholder')}
            className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand"
          />
          <HelpText>{t('giveawaysPage.prizeHelp')}</HelpText>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-text-secondary">{t('giveawaysPage.entryCostLabel')}</label>
            <input
              type="number" min="1" value={entryCost} onChange={(e) => setEntryCost(e.target.value)}
              className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand"
            />
            <HelpText>{t('giveawaysPage.entryCostHelp')}</HelpText>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-text-secondary">{t('giveawaysPage.winnerCountLabel')}</label>
            <input
              type="number" min="1" value={winnerCount} onChange={(e) => setWinnerCount(e.target.value)}
              className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand"
            />
            <HelpText>{t('giveawaysPage.winnerCountHelp')}</HelpText>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-text-secondary">{t('giveawaysPage.durationLabel')}</label>
            <input
              type="number" min={GIVEAWAY_MIN_DURATION_MINUTES} max={GIVEAWAY_MAX_DURATION_MINUTES}
              value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand"
            />
            <HelpText>{t('giveawaysPage.durationHelp', { min: GIVEAWAY_MIN_DURATION_MINUTES, max: GIVEAWAY_MAX_DURATION_MINUTES })}</HelpText>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-text-secondary">{t('giveawaysPage.channelLabel')}</label>
          <ChannelSelect guildId={guildId} value={channelId} onChange={setChannelId} />
          <HelpText>{t('giveawaysPage.channelHelp')}</HelpText>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-text-secondary">{t('giveawaysPage.prizeTypeLabel')}</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPrizeType('points')}
              className={`flex-1 text-sm font-bold py-2.5 rounded-lg border transition-all ${prizeType === 'points' ? 'bg-brand border-brand text-white' : 'bg-bg-elevated border-border-default text-text-secondary'}`}
            >
              {t('giveawaysPage.prizeTypePoints')}
            </button>
            <button
              type="button"
              onClick={() => setPrizeType('role')}
              className={`flex-1 text-sm font-bold py-2.5 rounded-lg border transition-all ${prizeType === 'role' ? 'bg-brand border-brand text-white' : 'bg-bg-elevated border-border-default text-text-secondary'}`}
            >
              {t('giveawaysPage.prizeTypeRole')}
            </button>
          </div>
        </div>

        {prizeType === 'points' ? (
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-text-secondary">{t('giveawaysPage.prizeAmountLabel')}</label>
            <input
              type="number" min="1" value={prizeAmount} onChange={(e) => setPrizeAmount(e.target.value)}
              className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-text-secondary">{t('giveawaysPage.prizeRoleLabel')}</label>
            <RoleSelect guildId={guildId} value={prizeRoleId} onChange={setPrizeRoleId} />
            <HelpText>{t('giveawaysPage.prizeRoleHelp')}</HelpText>
          </div>
        )}

        <Button
          type="button"
          variant="success"
          onClick={handleCreateClick}
          disabled={!prize.trim() || !channelId || (prizeType === 'role' && !prizeRoleId) || isCreating}
        >
          {isCreating ? t('giveawaysPage.creating') : t('giveawaysPage.createButton')}
        </Button>
      </Card>

      {createConfirmDialog && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="!border-warning-border hover:!border-warning-border max-w-md w-full space-y-4">
            <h3 className="text-warning font-black text-base">{t('giveawaysPage.dangerousPermTitle')}</h3>
            <p className="text-sm text-text-secondary">
              {t('giveawaysPage.dangerousPermBody', { perms: createConfirmDialog.dangerous.join(', ') })}
            </p>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="ghost" onClick={() => setCreateConfirmDialog(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => { setCreateConfirmDialog(null); submitCreate(true); }}
              >
                {t('common.confirm')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {giveaways.length === 0 ? (
        <Card>
          <p className="text-base text-text-secondary py-4">{t('giveawaysPage.noGiveawaysYet')}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {giveaways.map((g) => (
            <Card key={g.id} className="space-y-3">
              <div className="flex items-center justify-between border-b border-border-default pb-2">
                <h3 className="text-base font-black text-text-primary">🎁 {g.prize}</h3>
                <span className="text-sm text-text-secondary">{new Date(g.concluded_at).toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-text-secondary">
                {g.prize_type === 'points'
                  ? t('giveawaysPage.pointsPerWinner', { amount: g.prize_amount?.toLocaleString() || '0' })
                  : t('giveawaysPage.roleLabel', { role: g.prize_role_name || g.prize_role_id || '' })}
              </p>
              <div className="space-y-2">
                {g.winners.map((w) => (
                  <Card elevated key={w.user_id} className="!px-3 !py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {w.username || t('giveawaysPage.unknownUser', { id: w.user_id })}
                      </p>
                      {!w.in_server && <p className="text-[10px] text-danger">{t('giveawaysPage.noLongerInServer')}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => openReplaceDialog(g, w)}
                      className="shrink-0 bg-border-default/25 hover:bg-border-default/40 text-text-primary text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
                    >
                      {t('giveawaysPage.replaceButton')}
                    </button>
                  </Card>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {replaceTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="max-w-md w-full space-y-4">
            <h3 className="text-base font-black text-text-primary">
              {t('giveawaysPage.replaceWinnerForPrefix')} <span className="text-brand">{replaceTarget.giveaway.prize}</span>?
            </h3>
            <p className="text-sm text-text-secondary">
              {t('giveawaysPage.replaceWinnerBody', { winner: replaceTarget.winner.username || replaceTarget.winner.user_id })}
              {replaceTarget.giveaway.prize_type === 'points' && t('giveawaysPage.replaceWinnerPointsNote')}
            </p>
            {replaceTarget.giveaway.prize_type === 'role' && (
              <div className="bg-warning/10 border border-warning-border rounded-lg p-3 text-[11px] text-warning">
                {t('giveawaysPage.replaceWinnerRoleWarning', { role: replaceTarget.giveaway.prize_role_name || replaceTarget.giveaway.prize_role_id || '' })}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-text-secondary">{t('giveawaysPage.reasonLabel')}</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('giveawaysPage.reasonPlaceholder')}
                rows={2}
                className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReplaceTarget(null)}
                disabled={isReplacing}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmReplace}
                disabled={isReplacing || !reason.trim()}
              >
                {isReplacing ? t('giveawaysPage.replacing') : t('giveawaysPage.confirmReplace')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </SettingsPageContainer>
  );
}
