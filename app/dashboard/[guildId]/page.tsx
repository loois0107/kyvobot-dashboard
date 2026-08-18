'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useT } from '@/lib/i18n/LanguageContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Sparkles, Inbox, Ticket, Terminal, BookOpen, ShieldCheck, History } from 'lucide-react';

interface LogLine {
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARN' | 'SYSTEM';
  message: string;
}

interface TelemetryData {
  customCommands: number;
  ragSynapses: number;
  activeTickets: number;
  automodLogs: number;
}

interface OnboardingState {
  show_banner: boolean;
  items: { automod: boolean; welcome: boolean; presets: boolean };
}

function ChecklistRow({ done, label, href }: { done: boolean; label: string; href: string }) {
  const t = useT();
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
        done ? 'border-success/20 bg-success/5' : 'border-border-default bg-bg-elevated hover:border-brand/40'
      }`}
    >
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-sm shrink-0 ${
        done ? 'bg-success text-white' : 'border border-border-default text-transparent'
      }`}>
        {done ? '✓' : ''}
      </span>
      <span className={`text-sm font-bold flex-1 ${done ? 'text-success line-through decoration-2' : 'text-text-primary'}`}>
        {label}
      </span>
      {!done && <span className="text-[10px] text-brand font-bold shrink-0">{t('dashboardHome.setUpArrow')}</span>}
    </Link>
  );
}

export default function DashboardHome() {
  const params = useParams();
  const { status } = useSession();
  const t = useT();

  const guildId = params?.guildId as string | undefined;

  const [telemetry, setTelemetry] = useState<TelemetryData>({
    customCommands: 0,
    ragSynapses: 0,
    activeTickets: 0,
    automodLogs: 0
  });

  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [statsError, setStatsError] = useState(false);

  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'SUCCESS' | 'WARN' | 'SYSTEM'>('ALL');
  const [logs, setLogs] = useState<LogLine[]>([]);

  const isConnectionFailed = statsError && !isLoadingStats;
  const isDataEmpty = !statsError && !isLoadingStats &&
    telemetry.customCommands === 0 &&
    telemetry.ragSynapses === 0 &&
    telemetry.activeTickets === 0 &&
    telemetry.automodLogs === 0;

  const fetchRealtimeStats = async (targetId: string, signal?: AbortSignal) => {
    if (!targetId || targetId === '[guildId]') return;
    try {
      const res = await fetch(`/api/stats?guild_id=${targetId}`, { signal });
      if (!res.ok) {
        setStatsError(true);
        console.error('[TELEMETRY stats 응답 실패]:', res.status);
        return;
      }

      setStatsError(false);
      const data = await res.json();
      setTelemetry({
        customCommands: data.custom_commands ?? 0,
        ragSynapses: data.rag_synapses ?? 0,
        activeTickets: data.active_tickets ?? 0,
        automodLogs: data.automod_logs ?? 0
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setStatsError(true);
      console.error('[TELEMETRY SYNC FAULT]', err);
    } finally {
      if (!signal?.aborted) {
        setIsLoadingStats(false);
      }
    }
  };

  const fetchRealtimeLogs = async (targetId: string, signal?: AbortSignal) => {
    if (!targetId || targetId === '[guildId]') return;
    try {
      const res = await fetch(`/api/logs?guild_id=${targetId}`, { signal });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLogs(data);
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('[LOGS SYNC FAULT]', err);
    } finally {
      if (!signal?.aborted) {
        setIsLoadingLogs(false);
      }
    }
  };

  const fetchOnboardingStatus = async (targetId: string, signal?: AbortSignal) => {
    if (!targetId || targetId === '[guildId]') return;
    try {
      const res = await fetch(`/api/onboarding/${targetId}`, { signal });
      if (!res.ok) return;
      const data = await res.json();
      setOnboarding({ show_banner: !!data.show_banner, items: data.items });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('[ONBOARDING SYNC FAULT]', err);
    }
  };

  const handleDismissOnboarding = async () => {
    if (!guildId) return;
    setOnboarding((prev) => (prev ? { ...prev, show_banner: false } : prev)); // 즉시 닫히는 것처럼 보이게
    try {
      await fetch(`/api/onboarding/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      });
    } catch (err) {
      console.error('[ONBOARDING DISMISS FAULT]', err);
    }
  };

  useEffect(() => {
    if (!guildId || guildId === '[guildId]') return;

    const controller = new AbortController();
    setIsLoadingStats(true);
    setStatsError(false);
    fetchRealtimeStats(guildId, controller.signal);
    fetchOnboardingStatus(guildId, controller.signal);

    const statsInterval = setInterval(() => fetchRealtimeStats(guildId, controller.signal), 10000);
    return () => {
      controller.abort();
      clearInterval(statsInterval);
    };
  }, [guildId]);

  useEffect(() => {
    if (!guildId || guildId === '[guildId]' || isPaused) return;

    const controller = new AbortController();
    setIsLoadingLogs(true);
    fetchRealtimeLogs(guildId, controller.signal);

    const logsInterval = setInterval(() => fetchRealtimeLogs(guildId, controller.signal), 4000);
    return () => {
      controller.abort();
      clearInterval(logsInterval);
    };
  }, [guildId, isPaused]);

  if (!guildId || guildId === '[guildId]') {
    return (
      <Card elevated className="!p-8 !border-danger/20 hover:!border-danger/20 flex min-h-[400px] items-center justify-center font-mono text-center text-danger">
        {t('dashboardHome.invalidAccess')}
      </Card>
    );
  }

  const filteredLogs = logFilter === 'ALL' ? logs : logs.filter(log => log.type === logFilter);

  if (status === 'loading') return null;

  return (
    <div className="max-w-7xl mx-auto w-full space-y-10 p-2 md:p-4 animate-in fade-in duration-300">

      {onboarding?.show_banner && (
        <Card elevated className="!border-brand/30 hover:!border-brand/30 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-text-primary">{t('dashboardHome.quickStartTitle')}</h3>
              <p className="text-[10px] text-text-secondary mt-1">{t('dashboardHome.quickStartSubtitle')}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={handleDismissOnboarding}
              aria-label={t('dashboardHome.dismissChecklist')}
              className="!px-2 text-lg leading-none"
            >
              ✕
            </Button>
          </div>
          <div className="space-y-2">
            <ChecklistRow done={onboarding.items.automod} label={t('dashboardHome.checklistAutomod')} href={`/dashboard/${guildId}/automod`} />
            <ChecklistRow done={onboarding.items.welcome} label={t('dashboardHome.checklistWelcome')} href={`/dashboard/${guildId}/welcome`} />
            <ChecklistRow done={onboarding.items.presets} label={t('dashboardHome.checklistPresets')} href={`/dashboard/${guildId}/party/party-presets`} />
          </div>
        </Card>
      )}

      {/* ==========================================
          [SECTION 1: STATUS OVERVIEW ROW]
         ========================================== */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="!border-brand/30 hover:!border-brand/30 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-border-default">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnectionFailed ? 'bg-danger' : isDataEmpty ? 'bg-text-muted' : 'bg-success'}`}></span>
              <h3 className="text-sm font-black tracking-widest text-text-secondary">{t('dashboardHome.systemStatus')}</h3>
            </div>

            {isConnectionFailed && <Badge variant="danger">{t('dashboardHome.statsUnreachable')}</Badge>}
            {isDataEmpty && <Badge variant="neutral">{t('dashboardHome.noDataYet')}</Badge>}
          </div>
          {/* 🛡️ [정직성 정리] 예전엔 여기 "MATRIX VER: v2.4.0-pro"/"LATENCY TICK: 20ms Stable"처럼
              실제로 어디에서도 안 나오는 값을 하드코딩해서 마치 실시간 측정치인 것처럼 보여줬다 -
              진짜 값이 없으면 아예 안 보여주는 게 맞다(가짜 문구로 순화하지 않음). 실제 값을 가진
              두 항목(봇 이름, 이 서버 ID)만 남긴다. */}
          <div className="grid grid-cols-2 gap-6 pt-6 font-mono text-base">
            <div className="space-y-1"><span className="text-text-secondary block text-sm">{t('dashboardHome.coreAlias')}</span><strong className="text-text-primary text-base tracking-wide">Kyvo</strong></div>
            <div className="space-y-1">
              <span className="text-text-secondary block text-sm">{t('dashboardHome.activeContext')}</span>
              <strong className="text-brand text-base tracking-wide truncate max-w-[180px]">
                {t('dashboardHome.activeContextValue', { id: guildId.slice(0, 6) })}
              </strong>
            </div>
          </div>
        </Card>
      </div>

      {/* ==========================================
          [SECTION 2: 📊 REALTIME TELEMETRY MATRIX]
         ========================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 🛡️ [4개 전부 클릭 가능] 예전엔 Custom Commands만 Link였고 나머지 3개는 그냥 div였다 -
            /api/stats/route.ts를 직접 확인해서 각 숫자가 실제로 뭘 세는지 검증한 뒤(AI Knowledge
            Base/Active Tickets는 ticket-settings가 관리하는 guild_knowledge/guild_ticket_settings
            테이블, Automod Logs는 audit-logs 페이지가 보여주는 automod_logs 테이블), 전부 실제로
            갈 곳이 있다는 걸 확인하고 나머지도 동일한 Link 패턴으로 맞췄다. */}
        <Link href={`/dashboard/${guildId}/settings`}>
          <Card elevated className="!py-8 !px-6 space-y-2 flex flex-col justify-center">
            <span className="flex items-center gap-1.5 text-sm font-black text-text-secondary uppercase tracking-wider">
              <Terminal className="w-4 h-4 shrink-0" />
              {t('dashboardHome.customCommandsLabel')}
            </span>
            <span className={`text-4xl font-black font-mono tracking-wide ${telemetry.customCommands === 0 ? 'text-text-muted' : 'text-text-primary'}`}>
              {isLoadingStats ? '...' : telemetry.customCommands.toLocaleString()}
              <span className={`text-sm font-sans block mt-0.5 ${telemetry.customCommands === 0 ? 'text-text-muted' : 'text-text-primary'}`}>{t('dashboardHome.customCommandsUnit')}</span>
            </span>
            <span className="text-[10px] text-text-secondary font-bold tracking-widest pt-1 text-left">
              {t('dashboardHome.manageArrow')}
            </span>
          </Card>
        </Link>

        <Link href={`/dashboard/${guildId}/integrations/ticket-settings`}>
          <Card elevated className="!py-8 !px-6 space-y-2 flex flex-col justify-center">
            <span className="flex items-center gap-1.5 text-sm font-black text-text-secondary uppercase tracking-wider">
              <BookOpen className="w-4 h-4 shrink-0" />
              {t('dashboardHome.aiKnowledgeLabel')}
            </span>
            <span className={`text-4xl font-black font-mono tracking-wide ${telemetry.ragSynapses === 0 ? 'text-text-muted' : 'text-text-primary'}`}>
              {isLoadingStats ? '...' : telemetry.ragSynapses.toLocaleString()}
              <span className={`text-sm font-sans block mt-0.5 ${telemetry.ragSynapses === 0 ? 'text-text-muted' : 'text-text-primary'}`}>{t('dashboardHome.aiKnowledgeUnit')}</span>
            </span>
            <span className="text-[10px] text-text-secondary font-bold tracking-widest pt-1 text-left">
              {t('dashboardHome.manageArrow')}
            </span>
          </Card>
        </Link>
        <Link href={`/dashboard/${guildId}/integrations/ticket-settings`}>
          <Card elevated className="!py-8 !px-6 space-y-2 flex flex-col justify-center">
            <span className="flex items-center gap-1.5 text-sm font-black text-text-secondary uppercase tracking-wider">
              <Ticket className="w-4 h-4 shrink-0" />
              {t('dashboardHome.activeTicketsLabel')}
            </span>
            <span className={`text-4xl font-black font-mono tracking-wide ${telemetry.activeTickets === 0 ? 'text-text-muted' : 'text-text-primary'}`}>
              {isLoadingStats ? '...' : telemetry.activeTickets}
              <span className={`text-sm font-sans block mt-0.5 ${telemetry.activeTickets === 0 ? 'text-text-muted' : 'text-text-primary'}`}>{t('dashboardHome.activeTicketsUnit')}</span>
            </span>
            <span className="text-[10px] text-text-secondary font-bold tracking-widest pt-1 text-left">
              {t('dashboardHome.manageArrow')}
            </span>
          </Card>
        </Link>
        <Link href={`/dashboard/${guildId}/audit-logs`}>
          <Card elevated className="!py-8 !px-6 space-y-2 flex flex-col justify-center">
            <span className="flex items-center gap-1.5 text-sm font-black text-text-secondary uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {t('dashboardHome.automodLogsLabel')}
            </span>
            <span className={`text-4xl font-black font-mono tracking-wide ${telemetry.automodLogs === 0 ? 'text-text-muted' : 'text-text-primary'}`}>
              {isLoadingStats ? '...' : telemetry.automodLogs.toLocaleString()}
              <span className={`text-sm font-sans block mt-0.5 ${telemetry.automodLogs === 0 ? 'text-text-muted' : 'text-text-primary'}`}>{t('dashboardHome.automodLogsUnit')}</span>
            </span>
            <span className="text-[10px] text-text-secondary font-bold tracking-widest pt-1 text-left">
              {t('dashboardHome.manageArrow')}
            </span>
          </Card>
        </Link>
      </div>

      {/* ==========================================
          [SECTION 3: ⚡ CORE MODULE QUICK DISPATCH]
         ========================================== */}
      <div className="space-y-4">
        <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase px-1">{t('dashboardHome.quickLinksTitle')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href={`/dashboard/${guildId}/leveling`}>
            <Card className="!p-8 flex flex-col justify-between min-h-[210px]">
              <div><Sparkles className="w-8 h-8 mb-3 text-text-secondary" /><h4 className="text-base font-black text-text-primary uppercase tracking-wider">{t('dashboardHome.levelingEcoTitle')}</h4><p className="text-sm text-text-secondary mt-2 leading-relaxed">{t('dashboardHome.levelingEcoDesc')}</p></div>
              <span className="text-[10px] text-text-secondary font-bold tracking-widest mt-4 block">{t('dashboardHome.levelingCta')}</span>
            </Card>
          </Link>
          <Link href={`/dashboard/${guildId}/welcome`}>
            <Card className="!p-8 flex flex-col justify-between min-h-[210px]">
              <div><Inbox className="w-8 h-8 mb-3 text-text-secondary" /><h4 className="text-base font-black text-text-primary uppercase tracking-wider">{t('dashboardHome.welcomeTitle')}</h4><p className="text-sm text-text-secondary mt-2 leading-relaxed">{t('dashboardHome.welcomeDesc')}</p></div>
              <span className="text-[10px] text-text-secondary font-bold tracking-widest mt-4 block">{t('dashboardHome.welcomeCta')}</span>
            </Card>
          </Link>
          <Link href={`/dashboard/${guildId}/integrations/ticket-settings`}>
            <Card className="!p-8 flex flex-col justify-between min-h-[210px]">
              <div><Ticket className="w-8 h-8 mb-3 text-text-secondary" /><h4 className="text-base font-black text-text-primary uppercase tracking-wider">{t('dashboardHome.ticketTitle')}</h4><p className="text-sm text-text-secondary mt-2 leading-relaxed">{t('dashboardHome.ticketDesc')}</p></div>
              <span className="text-[10px] text-text-secondary font-bold tracking-widest mt-4 block">{t('dashboardHome.ticketCta')}</span>
            </Card>
          </Link>
        </div>
      </div>

      {/* ==========================================
          [SECTION 4: 💻 LIVE CORE TERMINAL STREAM]
         ========================================== */}
      <Card elevated className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border-default pb-4 gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-black font-mono text-text-secondary tracking-widest uppercase ml-2">{t('dashboardHome.activityLogHeader')}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value as any)}
              className="bg-bg-elevated border border-border-default text-text-primary font-mono text-[10px] font-black px-3 py-1.5 rounded cursor-pointer uppercase focus:outline-none focus:border-brand"
            >
              <option value="ALL">{t('dashboardHome.filterAll')}</option>
              <option value="INFO">{t('dashboardHome.filterInfo')}</option>
              <option value="SUCCESS">{t('dashboardHome.filterSuccess')}</option>
              <option value="WARN">{t('dashboardHome.filterWarn')}</option>
              <option value="SYSTEM">{t('dashboardHome.filterSystem')}</option>
            </select>

            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className={`font-mono text-[10px] font-black px-4 py-1.5 rounded uppercase tracking-wider transition-all duration-150 border ${
                isPaused
                  ? 'bg-warning/10 text-warning border-warning-border'
                  : 'bg-bg-elevated text-text-primary hover:bg-bg-elevated/70 border-border-default'
              }`}
            >
              {isPaused ? t('dashboardHome.resumeStream') : t('dashboardHome.pauseStream')}
            </button>
          </div>
        </div>

        <div className="font-mono text-sm sm:text-base p-2 space-y-2.5 min-h-[380px] max-h-[450px] overflow-y-auto select-text scrollbar-thin scrollbar-thumb-gray-800">
          {isLoadingLogs ? (
            <div className="text-center py-20 text-text-secondary text-sm font-semibold">{t('dashboardHome.syncingLogs')}</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-text-muted text-sm font-semibold">
              <History className="w-10 h-10 mx-auto mb-3 text-text-muted" />
              {t('dashboardHome.noLogsMatch')}
            </div>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={`${log.timestamp}-${log.type}-${log.message}-${i}`} className="flex gap-4 items-start leading-relaxed animate-in fade-in slide-in-from-left-1 duration-150">
                <span className="text-text-muted">[{log.timestamp}]</span>
                <span className={`font-black tracking-wider text-center w-16 flex-shrink-0 text-sm ${
                  log.type === 'SYSTEM' ? 'text-text-secondary' :
                  log.type === 'SUCCESS' ? 'text-success' :
                  log.type === 'WARN' ? 'text-warning' : 'text-text-muted'
                }`}>
                  {log.type}
                </span>
                <span className="text-text-primary break-all tracking-wide">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </Card>

    </div>
  );
}