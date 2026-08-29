'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { scoreToTierLabel } from '@/lib/tierRoles';

type Team = 'red' | 'blue' | null;

interface Participant {
  user_id: string;
  position: string | null;
  team: Team;
  mmr_score: number | null;
  username: string;
  avatar_url: string | null;
  is_leader: boolean;
}

interface RecruitmentInfo {
  id: string;
  guild_id: string;
  queue_type: string;
  lanes: string | null;
  needed_count: number;
  status: string;
}

type LoadStatus = 'loading' | 'loaded' | 'not_found' | 'forbidden' | 'error';

// 대시보드 홈의 실시간 통계/로그 폴링과 동일한 방식(setInterval + AbortController) - 이 페이지는
// 그것보다 더 짧은 세션(리더가 모집 마감 직후 잠깐 켜놓고 바로 배정하는 화면)이라 4초로 더
// 촘촘하게 잡는다.
const POLL_INTERVAL_MS = 4000;

function ParticipantAvatar({ participant, className }: { participant: Participant; className: string }) {
  return participant.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={participant.avatar_url} alt="" className={`${className} rounded-full shrink-0`} />
  ) : (
    <div className={`${className} rounded-full bg-bg-elevated flex items-center justify-center font-bold text-text-secondary shrink-0`}>
      {participant.username.slice(0, 2).toUpperCase()}
    </div>
  );
}

function ParticipantRow({
  participant,
  saving,
  readOnly,
  onAssign,
  onKick,
  t,
}: {
  participant: Participant;
  saving: boolean;
  readOnly: boolean;
  onAssign: (team: Team) => void;
  onKick: () => void;
  t: ReturnType<typeof useT>;
}) {
  const isRed = participant.team === 'red';
  const isBlue = participant.team === 'blue';
  const disabled = saving || readOnly;

  return (
    <Card elevated className="!p-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ParticipantAvatar participant={participant} className="w-10 h-10 text-sm" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-text-primary truncate">{participant.username}</span>
            {participant.is_leader && <Badge variant="neutral">{t('partyTeamPage.leaderBadge')}</Badge>}
          </div>
          <p className="text-xs text-text-muted">{participant.position || t('partyTeamPage.unassignedLabel')}</p>
        </div>
      </div>

      {/* 🛡️ red/blue는 success/danger 같은 앱 전역 상태 토큰이 아니라 팀 그 자체의 이름(데이터)이다
          - "레드 팀"이라는 라벨 자체가 이미 색이라 danger 토큰을 재사용하면 오히려 "위험한 액션"으로
          오해를 준다. Button.tsx는 그대로 쓰되(모양/패딩/비활성 상태 등) 색만 리터럴로 오버라이드한다. */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onAssign('red')}
          disabled={disabled}
          className={`!px-3 !py-1.5 text-xs ${
            isRed ? '!bg-red-600 !border-red-600 !text-white' : '!border-red-500/40 !text-red-400 hover:!border-red-500'
          }`}
        >
          {t('partyTeamPage.assignToRedButton')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onAssign('blue')}
          disabled={disabled}
          className={`!px-3 !py-1.5 text-xs ${
            isBlue ? '!bg-blue-600 !border-blue-600 !text-white' : '!border-blue-500/40 !text-blue-400 hover:!border-blue-500'
          }`}
        >
          {t('partyTeamPage.assignToBlueButton')}
        </Button>
        {(isRed || isBlue) && (
          <Button type="button" variant="ghost" onClick={() => onAssign(null)} disabled={disabled} className="!px-2 text-xs">
            {t('partyTeamPage.unassignButton')}
          </Button>
        )}
        {/* 🛡️ 리더는 강퇴 대상이 아니다(API도 동일하게 거부함) - 버튼 자체를 안 보여줘서
            눌러봤자 에러만 나는 상황을 UI 레벨에서 미리 막는다. */}
        {!participant.is_leader && (
          <Button
            type="button"
            variant="ghost"
            onClick={onKick}
            disabled={disabled}
            className="!px-2 text-xs !text-danger hover:!bg-danger/10"
          >
            {t('partyTeamPage.kickButton')}
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function PartyTeamPage() {
  const params = useParams();
  const { status: sessionStatus } = useSession();
  const { showToast } = useToast();
  const t = useT();

  // 🛡️ 하이드레이션 완료 전 리터럴 "[recruitmentId]" 플레이스홀더가 잠깐 넘어올 수 있다 -
  // /profile/[guildId] 등 이 그룹 밖 페이지들과 동일한 방어(이 페이지엔 layout.tsx가 따로 없어서
  // 직접 막아야 한다).
  const rawRecruitmentId = params?.recruitmentId as string | undefined;
  const recruitmentId =
    rawRecruitmentId && rawRecruitmentId !== '[recruitmentId]' && !rawRecruitmentId.includes('%5B') ? rawRecruitmentId : '';

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');
  const [recruitment, setRecruitment] = useState<RecruitmentInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [autoBalancing, setAutoBalancing] = useState(false);

  const extractErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data = await res.json();
      return data.message || t('common.requestFailed', { status: res.status });
    } catch {
      return t('common.requestFailed', { status: res.status });
    }
  };

  const loadData = async (signal?: AbortSignal) => {
    if (!recruitmentId) return;
    try {
      const res = await fetch(`/api/party/${recruitmentId}`, { signal });
      if (res.status === 404) {
        setLoadStatus('not_found');
        return;
      }
      if (res.status === 403) {
        setLoadStatus('forbidden');
        return;
      }
      if (!res.ok) {
        setLoadErrorMsg(await extractErrorMessage(res));
        setLoadStatus('error');
        return;
      }
      const data = await res.json();
      setRecruitment(data.recruitment);
      setParticipants(data.participants || []);
      setReadOnly(Boolean(data.readOnly));
      setLoadStatus('loaded');
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error(err);
      setLoadErrorMsg(t('partyTeamPage.loadNetworkError'));
      setLoadStatus('error');
    }
  };

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !recruitmentId) return;
    const controller = new AbortController();
    loadData(controller.signal);
    const interval = setInterval(() => loadData(controller.signal), POLL_INTERVAL_MS);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, recruitmentId]);

  const assignTeam = async (userId: string, team: Team) => {
    if (!recruitmentId) return;
    setSavingUserId(userId);
    try {
      const res = await fetch(`/api/party/${recruitmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, team }),
      });
      if (res.ok) {
        setParticipants((prev) => prev.map((p) => (p.user_id === userId ? { ...p, team } : p)));
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('partyTeamPage.assignNetworkError'), 'error');
    } finally {
      setSavingUserId(null);
    }
  };

  const kickParticipant = async (userId: string, username: string) => {
    if (!recruitmentId) return;
    // 🛡️ 되돌릴 수 없는 작업 - party-presets 페이지의 프리셋 삭제와 동일하게 window.confirm으로
    // 한 번 더 확인한다(이 코드베이스의 기존 "돌이킬 수 없는 삭제" 확인 관례 그대로).
    if (!window.confirm(t('partyTeamPage.confirmKick', { name: username }))) return;
    setSavingUserId(userId);
    try {
      const res = await fetch(`/api/party/${recruitmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kick', user_id: userId }),
      });
      if (res.ok) {
        setParticipants((prev) => prev.filter((p) => p.user_id !== userId));
        showToast(t('partyTeamPage.kickSuccess', { name: username }), 'success');
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('partyTeamPage.kickNetworkError'), 'error');
    } finally {
      setSavingUserId(null);
    }
  };

  const autoBalance = async () => {
    if (!recruitmentId) return;
    setAutoBalancing(true);
    try {
      const res = await fetch(`/api/party/${recruitmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_balance' }),
      });
      if (res.ok) {
        await loadData();
        showToast(t('partyTeamPage.autoBalanceSuccess'), 'success');
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('partyTeamPage.autoBalanceNetworkError'), 'error');
    } finally {
      setAutoBalancing(false);
    }
  };

  // 팀 평균 MMR을 "Diamond 3" 같은 라벨로 보여준다 - mmr_score가 없는 참가자(미인증/미신고)는
  // 평균 계산에서 제외한다(0점으로 섞으면 실제로는 정보가 없을 뿐인데 최하위 티어처럼 왜곡된다).
  const averageTierLabel = (team: Participant[]): string => {
    const scores = team.map((p) => p.mmr_score).filter((s): s is number => typeof s === 'number');
    if (scores.length === 0) return t('partyTeamPage.noMmrData');
    const avg = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
    return scoreToTierLabel(avg) || t('partyTeamPage.noMmrData');
  };

  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && loadStatus === 'loading')) {
    return <div className="min-h-screen bg-bg-base" />;
  }

  // 🛡️ /profile/[guildId]/layout.tsx의 미로그인 안내 화면과 동일한 패턴 - 이 페이지는 그 그룹
  // 레이아웃 밖(탭이 필요 없는 단일 페이지)이라 직접 구현한다.
  if (sessionStatus === 'unauthenticated') {
    const callbackUrl = recruitmentId ? `/party/${recruitmentId}` : '/party';
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <div className="text-center space-y-4 border border-border-default bg-bg-surface p-8 rounded-2xl shadow-2xl max-w-md w-full">
          <h1 className="text-xl font-black text-warning">{t('partyTeamPage.loginRequiredTitle')}</h1>
          <p className="text-sm text-text-secondary">{t('partyTeamPage.loginRequiredDesc')}</p>
          <a
            href={`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="inline-block bg-brand hover:bg-brand-hover text-white text-sm font-black px-6 py-3 rounded-xl shadow-lg tracking-widest transition-all"
          >
            {t('partyTeamPage.loginButton')}
          </a>
        </div>
      </div>
    );
  }

  if (loadStatus === 'not_found' || loadStatus === 'forbidden' || loadStatus === 'error') {
    const title =
      loadStatus === 'not_found'
        ? t('partyTeamPage.notFoundTitle')
        : loadStatus === 'forbidden'
          ? t('partyTeamPage.forbiddenTitle')
          : t('partyTeamPage.loadFailed');
    const desc = loadStatus === 'not_found' ? t('partyTeamPage.notFound') : loadStatus === 'forbidden' ? t('partyTeamPage.forbidden') : loadErrorMsg;
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <div className="text-center space-y-3 border border-border-default bg-bg-surface p-8 rounded-2xl shadow-2xl max-w-md w-full">
          <h1 className="text-xl font-black text-danger">{title}</h1>
          <p className="text-sm text-text-secondary">{desc}</p>
        </div>
      </div>
    );
  }

  if (!recruitment) return null;

  // 🛡️ [2단계 고도화] 레드/블루/미배정 3구역 분리 - ParticipantRow 자체는 그대로 재사용하고,
  // 여기서 team 값으로 그룹만 나눈다.
  const redTeam = participants.filter((p) => p.team === 'red');
  const blueTeam = participants.filter((p) => p.team === 'blue');
  const unassigned = participants.filter((p) => p.team === null);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary p-4 sm:p-8">
      <SettingsPageContainer>
        <header className="border-b border-border-default pb-6">
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-brand">{t('partyTeamPage.title')}</h1>
          <HelpText className="mt-1">
            {t('partyTeamPage.subtitle', { queueType: recruitment.queue_type, needed: recruitment.needed_count })}
          </HelpText>
        </header>

        {readOnly && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm font-bold text-warning">
            {t('partyTeamPage.recruitmentEndedBanner')}
          </div>
        )}

        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default pb-2">
            <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase">
              {t('partyTeamPage.participantsTitle', { count: participants.length })}
            </h3>
            <Button
              type="button"
              variant="secondary"
              onClick={autoBalance}
              disabled={autoBalancing || participants.length === 0 || readOnly}
              className="text-xs !py-1.5 w-full sm:w-auto"
            >
              {autoBalancing ? t('partyTeamPage.autoBalancing') : t('partyTeamPage.autoBalanceButton')}
            </Button>
          </div>

          {participants.length === 0 ? (
            <p className="text-base text-text-muted py-4">{t('partyTeamPage.noParticipantsYet')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-black tracking-widest text-red-400 uppercase">
                    {t('partyTeamPage.redTeamLabel')} ({redTeam.length})
                  </h4>
                  <span className="text-xs font-bold text-text-muted">{averageTierLabel(redTeam)}</span>
                </div>
                {redTeam.length === 0 ? (
                  <p className="text-xs text-text-muted px-1 py-2">{t('partyTeamPage.noParticipantsYet')}</p>
                ) : (
                  redTeam.map((p) => (
                    <ParticipantRow key={p.user_id} participant={p} saving={savingUserId === p.user_id} readOnly={readOnly} onAssign={(team) => assignTeam(p.user_id, team)} onKick={() => kickParticipant(p.user_id, p.username)} t={t} />
                  ))
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-black tracking-widest text-blue-400 uppercase">
                    {t('partyTeamPage.blueTeamLabel')} ({blueTeam.length})
                  </h4>
                  <span className="text-xs font-bold text-text-muted">{averageTierLabel(blueTeam)}</span>
                </div>
                {blueTeam.length === 0 ? (
                  <p className="text-xs text-text-muted px-1 py-2">{t('partyTeamPage.noParticipantsYet')}</p>
                ) : (
                  blueTeam.map((p) => (
                    <ParticipantRow key={p.user_id} participant={p} saving={savingUserId === p.user_id} readOnly={readOnly} onAssign={(team) => assignTeam(p.user_id, team)} onKick={() => kickParticipant(p.user_id, p.username)} t={t} />
                  ))
                )}
              </div>

              {unassigned.length > 0 && (
                <div className="md:col-span-2 space-y-2 pt-2 border-t border-border-default/60">
                  <h4 className="text-xs font-black tracking-widest text-text-muted uppercase px-1">
                    {t('partyTeamPage.unassignedSectionTitle')} ({unassigned.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {unassigned.map((p) => (
                      <ParticipantRow key={p.user_id} participant={p} saving={savingUserId === p.user_id} readOnly={readOnly} onAssign={(team) => assignTeam(p.user_id, team)} onKick={() => kickParticipant(p.user_id, p.username)} t={t} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </SettingsPageContainer>
    </div>
  );
}
