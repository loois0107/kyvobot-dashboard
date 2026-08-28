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

type Team = 'red' | 'blue' | null;

interface Participant {
  user_id: string;
  position: string | null;
  team: Team;
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
  onAssign,
  t,
}: {
  participant: Participant;
  saving: boolean;
  onAssign: (team: Team) => void;
  t: ReturnType<typeof useT>;
}) {
  const isRed = participant.team === 'red';
  const isBlue = participant.team === 'blue';

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
          disabled={saving}
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
          disabled={saving}
          className={`!px-3 !py-1.5 text-xs ${
            isBlue ? '!bg-blue-600 !border-blue-600 !text-white' : '!border-blue-500/40 !text-blue-400 hover:!border-blue-500'
          }`}
        >
          {t('partyTeamPage.assignToBlueButton')}
        </Button>
        {(isRed || isBlue) && (
          <Button type="button" variant="ghost" onClick={() => onAssign(null)} disabled={saving} className="!px-2 text-xs">
            {t('partyTeamPage.unassignButton')}
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
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-bg-base text-text-primary p-4 sm:p-8">
      <SettingsPageContainer>
        <header className="border-b border-border-default pb-6">
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-brand">{t('partyTeamPage.title')}</h1>
          <HelpText className="mt-1">
            {t('partyTeamPage.subtitle', { queueType: recruitment.queue_type, needed: recruitment.needed_count })}
          </HelpText>
        </header>

        <Card className="space-y-4">
          <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
            {t('partyTeamPage.participantsTitle', { count: participants.length })}
          </h3>

          {participants.length === 0 ? (
            <p className="text-base text-text-muted py-4">{t('partyTeamPage.noParticipantsYet')}</p>
          ) : (
            <div className="space-y-2">
              {participants.map((p) => (
                <ParticipantRow key={p.user_id} participant={p} saving={savingUserId === p.user_id} onAssign={(team) => assignTeam(p.user_id, team)} t={t} />
              ))}
            </div>
          )}
        </Card>
      </SettingsPageContainer>
    </div>
  );
}
