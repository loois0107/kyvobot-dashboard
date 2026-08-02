'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';

interface QueueComboStat {
  queue_type: string;
  lanes: string;
  count: number;
}

interface TierDistributionEntry {
  tier: string;
  count: number;
}

interface PartyStats {
  window_days: number;
  weekly_count: number;
  top_combos: QueueComboStat[];
  tier_distribution: TierDistributionEntry[];
  verified_user_count: number;
  is_empty: boolean;
  is_sparse: boolean;
  generated_at: string;
  cached: boolean;
}

type LoadStatus = 'loading' | 'loaded' | 'error';

export default function PartyStatsPage() {
  const params = useParams();
  const t = useT();
  const guildId = (params?.guildId as string) || '';

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');
  const [stats, setStats] = useState<PartyStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    loadData(false);
  }, [guildId]);

  const extractErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data = await res.json();
      return data.message || t('common.requestFailed', { status: res.status });
    } catch {
      return t('common.requestFailed', { status: res.status });
    }
  };

  const loadData = async (fresh: boolean) => {
    if (fresh) setIsRefreshing(true);
    else setLoadStatus('loading');
    setLoadErrorMsg('');
    try {
      const res = await fetch(`/api/party-stats/${guildId}${fresh ? '?fresh=1' : ''}`);
      if (!res.ok) {
        setLoadErrorMsg(await extractErrorMessage(res));
        setLoadStatus('error');
        return;
      }
      const data = await res.json();
      setStats(data);
      setLoadStatus('loaded');
    } catch (err) {
      console.error(err);
      setLoadErrorMsg(t('partyStatsPage.networkError'));
      setLoadStatus('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#949ba4] text-base">
        {t('partyStatsPage.loadingStats')}
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-red-400 font-bold">{t('partyStatsPage.loadFailed')}</p>
        <p className="text-base text-[#949ba4]">{loadErrorMsg}</p>
        <button
          type="button"
          onClick={() => loadData(false)}
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-black px-6 py-3 rounded-xl"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <SettingsPageContainer className="pb-16">
      <header className="border-b border-[#2b2d31] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">{t('partyStatsPage.title')}</h1>
          <HelpText className="mt-1 tracking-widest uppercase">
            {t('partyStatsPage.subtitle', { days: stats.window_days, cacheState: stats.cached ? t('partyStatsPage.cachedSnapshot') : t('partyStatsPage.freshlyComputed') })}
          </HelpText>
        </div>
        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="w-full sm:w-auto bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-black px-6 py-3 rounded-xl shadow-lg tracking-widest transition-all"
        >
          {isRefreshing ? t('auditLogsPage.refreshing') : t('auditLogsPage.refreshNow')}
        </button>
      </header>

      {/* 이번 주 결성 건수 */}
      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-3 shadow-xl">
        <h3 className="text-sm font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          {t('partyStatsPage.recruitmentsTitle', { days: stats.window_days })}
        </h3>
        {stats.is_empty ? (
          <p className="text-base text-[#949ba4] py-4">
            {t('partyStatsPage.notEnoughDataDays', { days: stats.window_days })}
          </p>
        ) : (
          <div>
            <p className="text-4xl font-black text-white">{stats.weekly_count}</p>
            {stats.is_sparse && (
              <HelpText className="mt-1">
                {t('partyStatsPage.smallSampleWarning')}
              </HelpText>
            )}
          </div>
        )}
      </div>

      {/* 인기 큐타입/라인 조합 */}
      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-3 shadow-xl">
        <h3 className="text-sm font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          {t('partyStatsPage.popularCombosTitle')}
        </h3>
        {stats.top_combos.length === 0 ? (
          <p className="text-base text-[#949ba4] py-4">{t('partyStatsPage.notEnoughData')}</p>
        ) : (
          <div className="space-y-2">
            {stats.top_combos.map((combo, i) => (
              <div key={`${combo.queue_type}-${combo.lanes}-${i}`} className="flex items-center justify-between bg-[#111214] rounded-lg px-3 py-2">
                <span className="text-sm text-white font-medium">
                  {combo.queue_type}
                  {combo.lanes && <span className="text-[#949ba4]"> · {combo.lanes}</span>}
                </span>
                <span className="text-sm font-black text-[#5865F2]">{combo.count}</span>
              </div>
            ))}
          </div>
        )}
        {stats.is_sparse && stats.top_combos.length > 0 && (
          <HelpText>{t('partyStatsPage.smallSampleWarning')}</HelpText>
        )}
      </div>

      {/* 티어 분포 */}
      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-3 shadow-xl">
        <h3 className="text-sm font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          {t('partyStatsPage.tierDistTitle')}
        </h3>
        <HelpText>
          {t('partyStatsPage.tierDistSubtitle', { count: stats.verified_user_count, plural: stats.verified_user_count === 1 ? '' : 's' })}
        </HelpText>
        {stats.tier_distribution.length === 0 ? (
          <p className="text-base text-[#949ba4] py-4">{t('partyStatsPage.noVerifiedYet')}</p>
        ) : (
          <div className="space-y-1.5">
            {(() => {
              const max = Math.max(...stats.tier_distribution.map((entry) => entry.count));
              return stats.tier_distribution.map((tier) => (
                <div key={tier.tier} className="flex items-center gap-3">
                  <span className="text-sm text-[#b5bac1] w-28 shrink-0">{tier.tier}</span>
                  <div className="flex-1 bg-[#111214] rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-[#5865F2] rounded-full"
                      style={{ width: `${Math.max((tier.count / max) * 100, 4)}%` }}
                    />
                  </div>
                  <span className="text-sm font-black text-white w-6 text-right shrink-0">{tier.count}</span>
                </div>
              ));
            })()}
          </div>
        )}
      </div>
    </SettingsPageContainer>
  );
}
