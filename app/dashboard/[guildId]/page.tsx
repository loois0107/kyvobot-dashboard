'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useT } from '@/lib/i18n/LanguageContext';

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
        done ? 'border-[#23A55A]/20 bg-[#23A55A]/5' : 'border-[#232428] bg-[#111214] hover:border-[#5865F2]/40'
      }`}
    >
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
        done ? 'bg-[#23A55A] text-white' : 'border border-[#4e5058] text-transparent'
      }`}>
        {done ? '✓' : ''}
      </span>
      <span className={`text-xs font-bold flex-1 ${done ? 'text-[#23A55A] line-through decoration-2' : 'text-[#dbdee1]'}`}>
        {label}
      </span>
      {!done && <span className="text-[10px] text-[#5865F2] font-bold shrink-0">{t('dashboardHome.setUpArrow')}</span>}
    </Link>
  );
}

export default function DashboardHome() {
  const params = useParams();
  const { data: session, status } = useSession();
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
      <div className="flex min-h-[400px] items-center justify-center bg-[#111214] text-red-400 font-mono p-8 text-center border border-red-500/20 rounded-2xl">
        {t('dashboardHome.invalidAccess')}
      </div>
    );
  }

  const filteredLogs = logFilter === 'ALL' ? logs : logs.filter(log => log.type === logFilter);

  if (status === 'loading') return null;

  return (
    <div className="max-w-[1300px] mx-auto w-full space-y-10 p-2 md:p-4 animate-in fade-in duration-300">

      {onboarding?.show_banner && (
        <div className="bg-[#1e1f22] border border-[#5865F2]/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white">{t('dashboardHome.quickStartTitle')}</h3>
              <p className="text-[10px] text-[#949ba4] mt-1">{t('dashboardHome.quickStartSubtitle')}</p>
            </div>
            <button
              type="button"
              onClick={handleDismissOnboarding}
              className="text-gray-400 hover:text-white text-lg leading-none px-2"
              aria-label={t('dashboardHome.dismissChecklist')}
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            <ChecklistRow done={onboarding.items.automod} label={t('dashboardHome.checklistAutomod')} href={`/dashboard/${guildId}/automod`} />
            <ChecklistRow done={onboarding.items.welcome} label={t('dashboardHome.checklistWelcome')} href={`/dashboard/${guildId}/welcome`} />
            <ChecklistRow done={onboarding.items.presets} label={t('dashboardHome.checklistPresets')} href={`/dashboard/${guildId}/party-presets`} />
          </div>
        </div>
      )}

      {/* ==========================================
          [SECTION 1: STATUS OVERVIEW ROW]
         ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col justify-between lg:col-span-2 min-h-[160px] relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-[#2b2d31]">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnectionFailed ? 'bg-red-500 animate-ping' : isDataEmpty ? 'bg-gray-500' : 'bg-[#23a55a] animate-pulse'}`}></span>
              <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase">{t('dashboardHome.systemStatus')}</h3>
            </div>

            {isConnectionFailed && (
              <span className="bg-red-950/50 text-red-400 border border-red-500/30 text-[10px] font-black px-2.5 py-1 rounded font-mono animate-pulse">
                {t('dashboardHome.statsUnreachable')}
              </span>
            )}
            {isDataEmpty && (
              <span className="bg-gray-800/50 text-gray-400 border border-gray-500/30 text-[10px] font-black px-2.5 py-1 rounded font-mono">
                {t('dashboardHome.noDataYet')}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-6 pt-6 font-mono text-sm">
            <div className="space-y-1"><span className="text-gray-500 block text-xs">{t('dashboardHome.coreAlias')}</span><strong className="text-white text-base tracking-wide">KYVOBOT AI</strong></div>
            <div className="space-y-1"><span className="text-gray-500 block text-xs">{t('dashboardHome.matrixVer')}</span><strong className="text-yellow-400 text-base tracking-wide">v2.4.0-pro</strong></div>
            <div className="space-y-1">
              <span className="text-gray-500 block text-xs">{t('dashboardHome.activeContext')}</span>
              <strong className="text-[#5865F2] text-base tracking-wide truncate max-w-[180px]">
                {t('dashboardHome.activeContextValue', { id: guildId.slice(0, 6) })}
              </strong>
            </div>
            <div className="space-y-1"><span className="text-gray-500 block text-xs">{t('dashboardHome.latencyTick')}</span><strong className="text-[#23a55a] text-base tracking-wide">{t('dashboardHome.latencyValue')}</strong></div>
          </div>
        </div>

        <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col justify-between lg:col-span-1 min-h-[160px]">
          <div className="flex items-center gap-2 pb-4 border-b border-[#2b2d31]"><h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase">{t('dashboardHome.discordAccountLink')}</h3></div>
          <div className="pt-4 space-y-2">
            <p className="text-sm text-gray-200 font-medium">{t('dashboardHome.welcomeLabel')} <strong className="text-[#5865F2] font-mono text-base">{session?.user?.name || t('dashboardHome.defaultMemberName')}</strong></p>
            <p className="text-xs text-gray-500 leading-relaxed">{t('dashboardHome.handshakeDesc')}</p>
          </div>
          <div className="pt-4">
            <div className={`text-center py-2 rounded text-xs font-black tracking-widest uppercase ${
              isConnectionFailed ? 'bg-red-950/20 text-red-400 border border-red-500/10' :
              isDataEmpty ? 'bg-gray-800/20 text-gray-400 border border-gray-500/10' :
              'bg-green-950/30 text-[#23a55a] border border-green-500/10'
            }`}>
              {isConnectionFailed ? t('dashboardHome.pipelineStalled') :
               isDataEmpty ? t('dashboardHome.noActiveStream') :
               t('dashboardHome.matrixSyncActive')}
            </div>
          </div>
        </div>

      </div>

      {/* ==========================================
          [SECTION 2: 📊 REALTIME TELEMETRY MATRIX]
         ========================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 🌐 [교체 완료] 단순 div에서 클릭 시 설정창(/settings)으로 바로 연동되는 Link 컴포넌트로 인터페이스 업그레이드! */}
        <Link
          href={`/dashboard/${guildId}/settings`}
          className="bg-[#111214] border border-[#232428] hover:border-[#5865F2]/40 rounded-xl py-8 px-6 shadow-inner space-y-2 flex flex-col justify-center transition-all duration-200 group"
        >
          <span className="text-xs font-black text-gray-500 uppercase tracking-wider block">{t('dashboardHome.customCommandsLabel')}</span>
          <span className={`text-3xl font-black font-mono tracking-wide ${telemetry.customCommands === 0 ? 'text-gray-600' : 'text-[#5865F2]'}`}>
            {isLoadingStats ? '...' : telemetry.customCommands.toLocaleString()}
            <span className="text-xs text-[#5865F2]/60 font-sans ml-1">{t('dashboardHome.customCommandsUnit')}</span>
          </span>
          <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase pt-1 group-hover:text-[#5865F2] transition-colors text-left">
            {t('dashboardHome.manageArrow')}
          </span>
        </Link>

        <div className="bg-[#111214] border border-[#232428] rounded-xl py-8 px-6 shadow-inner space-y-2 flex flex-col justify-center">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wider block">{t('dashboardHome.ragVectorsLabel')}</span>
          <span className={`text-3xl font-black font-mono tracking-wide ${telemetry.ragSynapses === 0 ? 'text-gray-600' : 'text-purple-400'}`}>
            {isLoadingStats ? '...' : telemetry.ragSynapses.toLocaleString()}
            <span className="text-xs text-purple-600 font-sans ml-1">{t('dashboardHome.ragVectorsUnit')}</span>
          </span>
        </div>
        <div className="bg-[#111214] border border-[#232428] rounded-xl py-8 px-6 shadow-inner space-y-2 flex flex-col justify-center">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wider block">{t('dashboardHome.activeTicketsLabel')}</span>
          <span className={`text-3xl font-black font-mono tracking-wide ${telemetry.activeTickets === 0 ? 'text-gray-600' : 'text-yellow-500'}`}>
            {isLoadingStats ? '...' : telemetry.activeTickets}
            <span className="text-xs text-yellow-600 font-sans ml-1">{t('dashboardHome.activeTicketsUnit')}</span>
          </span>
        </div>
        <div className="bg-[#111214] border border-[#232428] rounded-xl py-8 px-6 shadow-inner space-y-2 flex flex-col justify-center">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wider block">{t('dashboardHome.automodLogsLabel')}</span>
          <span className={`text-3xl font-black font-mono tracking-wide ${telemetry.automodLogs === 0 ? 'text-gray-600' : 'text-white'}`}>
            {isLoadingStats ? '...' : telemetry.automodLogs.toLocaleString()}
            <span className="text-xs text-red-600 font-sans ml-1">{t('dashboardHome.automodLogsUnit')}</span>
          </span>
        </div>
      </div>

      {/* ==========================================
          [SECTION 3: ⚡ CORE MODULE QUICK DISPATCH]
         ========================================== */}
      <div className="space-y-4">
        <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase px-1">{t('dashboardHome.quickDispatchTitle')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href={`/dashboard/${guildId}/leveling`} className="bg-[#1e1f22] hover:bg-[#232428] border border-[#2b2d31] hover:border-[#5865F2]/40 rounded-2xl p-8 shadow-md transition-all duration-200 group cursor-pointer text-left flex flex-col justify-between min-h-[210px]">
            <div><span className="text-3xl block mb-3">✨</span><h4 className="text-sm font-black text-white group-hover:text-[#5865F2] uppercase tracking-wider">{t('dashboardHome.levelingEcoTitle')}</h4><p className="text-xs text-gray-400 mt-2 leading-relaxed">{t('dashboardHome.levelingEcoDesc')}</p></div>
            <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-4 block group-hover:text-white transition-colors">{t('dashboardHome.dispatchArrow')}</span>
          </Link>
          <Link href={`/dashboard/${guildId}/welcome`} className="bg-[#1e1f22] hover:bg-[#232428] border border-[#2b2d31] hover:border-green-500/40 rounded-2xl p-8 shadow-md transition-all duration-200 group cursor-pointer text-left flex flex-col justify-between min-h-[210px]">
            <div><span className="text-3xl block mb-3">📥</span><h4 className="text-sm font-black text-white group-hover:text-green-400 uppercase tracking-wider">{t('dashboardHome.welcomeTitle')}</h4><p className="text-xs text-gray-400 mt-2 leading-relaxed">{t('dashboardHome.welcomeDesc')}</p></div>
            <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-4 block group-hover:text-white transition-colors">{t('dashboardHome.dispatchArrow')}</span>
          </Link>
          <Link href={`/dashboard/${guildId}/ticket-settings`} className="bg-[#1e1f22] hover:bg-[#232428] border border-[#2b2d31] hover:border-purple-500/40 rounded-2xl p-8 shadow-md transition-all duration-200 group cursor-pointer text-left flex flex-col justify-between min-h-[210px]">
            <div><span className="text-3xl block mb-3">🎫</span><h4 className="text-sm font-black text-white group-hover:text-purple-400 uppercase tracking-wider">{t('dashboardHome.ticketTitle')}</h4><p className="text-xs text-gray-400 mt-2 leading-relaxed">{t('dashboardHome.ticketDesc')}</p></div>
            <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-4 block group-hover:text-white transition-colors">{t('dashboardHome.dispatchArrow')}</span>
          </Link>
        </div>
      </div>

      {/* ==========================================
          [SECTION 4: 💻 LIVE CORE TERMINAL STREAM]
         ========================================== */}
      <div className="bg-[#111214] border border-[#232428] rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#232428] pb-4 gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-xs font-black font-mono text-gray-500 tracking-widest uppercase ml-2">{t('dashboardHome.terminalHeader')}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value as any)}
              className="bg-[#1e1f22] border border-[#2b2d31] text-[#b5bac1] font-mono text-[10px] font-black px-3 py-1.5 rounded cursor-pointer uppercase focus:outline-none focus:border-[#5865F2]"
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
              className={`font-mono text-[10px] font-black px-4 py-1.5 rounded uppercase tracking-wider transition-all duration-150 ${
                isPaused
                  ? 'bg-yellow-500 text-black border border-yellow-400 font-bold'
                  : 'bg-[#2b2d31] text-white hover:bg-[#35373c] border border-[#4e5058]/20'
              }`}
            >
              {isPaused ? t('dashboardHome.resumeStream') : t('dashboardHome.pauseStream')}
            </button>
          </div>
        </div>

        <div className="font-mono text-xs sm:text-sm p-2 space-y-2.5 min-h-[380px] max-h-[450px] overflow-y-auto select-text scrollbar-thin scrollbar-thumb-gray-800">
          {isLoadingLogs ? (
            <div className="text-center py-20 text-gray-500 text-xs font-semibold">{t('dashboardHome.syncingLogs')}</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-gray-600 text-xs font-semibold">{t('dashboardHome.noLogsMatch')}</div>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={`${log.timestamp}-${log.type}-${log.message}-${i}`} className="flex gap-4 items-start leading-relaxed animate-in fade-in slide-in-from-left-1 duration-150">
                <span className="text-gray-600">[{log.timestamp}]</span>
                <span className={`font-black tracking-wider text-center w-16 flex-shrink-0 text-xs ${
                  log.type === 'SYSTEM' ? 'text-purple-400' :
                  log.type === 'SUCCESS' ? 'text-green-400' :
                  log.type === 'WARN' ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {log.type}
                </span>
                <span className="text-gray-300 break-all tracking-wide">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}