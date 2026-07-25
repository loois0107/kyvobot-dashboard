'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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
      return data.message || `Request failed (${res.status})`;
    } catch {
      return `Request failed (${res.status})`;
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
      setLoadErrorMsg('Network error while loading party stats.');
      setLoadStatus('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#949ba4] text-sm">
        Loading party stats...
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-red-400 font-bold">⚠️ Failed to load party stats</p>
        <p className="text-sm text-[#949ba4]">{loadErrorMsg}</p>
        <button
          type="button"
          onClick={() => loadData(false)}
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black px-6 py-3 rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <header className="border-b border-[#2b2d31] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">📊 Party Recruitment Stats</h1>
          <p className="text-[10px] text-[#57576F] mt-1 tracking-widest uppercase">
            Rolling {stats.window_days}-day window · {stats.cached ? 'Cached snapshot' : 'Freshly computed'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="w-full sm:w-auto bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black px-6 py-3 rounded-xl shadow-lg tracking-widest transition-all"
        >
          {isRefreshing ? 'REFRESHING...' : 'REFRESH NOW'}
        </button>
      </header>

      {/* 이번 주 결성 건수 */}
      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-3 shadow-xl">
        <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          Recruitments (last {stats.window_days} days)
        </h3>
        {stats.is_empty ? (
          <p className="text-sm text-[#949ba4] py-4">
            📭 Not enough data yet - no recruitment posts in the last {stats.window_days} days.
          </p>
        ) : (
          <div>
            <p className="text-4xl font-black text-white">{stats.weekly_count}</p>
            {stats.is_sparse && (
              <p className="text-[10px] text-[#57576F] mt-1">
                ⚠️ Small sample size - treat this as a rough signal, not a trend.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 인기 큐타입/라인 조합 */}
      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-3 shadow-xl">
        <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          Most Popular Queue / Lane Combos
        </h3>
        {stats.top_combos.length === 0 ? (
          <p className="text-sm text-[#949ba4] py-4">📭 Not enough data yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.top_combos.map((combo, i) => (
              <div key={`${combo.queue_type}-${combo.lanes}-${i}`} className="flex items-center justify-between bg-[#111214] rounded-lg px-3 py-2">
                <span className="text-xs text-white font-medium">
                  {combo.queue_type}
                  {combo.lanes && <span className="text-[#949ba4]"> · {combo.lanes}</span>}
                </span>
                <span className="text-xs font-black text-[#5865F2]">{combo.count}</span>
              </div>
            ))}
          </div>
        )}
        {stats.is_sparse && stats.top_combos.length > 0 && (
          <p className="text-[10px] text-[#57576F]">⚠️ Small sample size - treat this as a rough signal, not a trend.</p>
        )}
      </div>

      {/* 티어 분포 */}
      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-3 shadow-xl">
        <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          Verified Tier Distribution
        </h3>
        <p className="text-[10px] text-[#57576F]">
          Based on the latest /tier_verify result per member ({stats.verified_user_count} verified member{stats.verified_user_count === 1 ? '' : 's'}) - not live role membership.
        </p>
        {stats.tier_distribution.length === 0 ? (
          <p className="text-sm text-[#949ba4] py-4">📭 No members have run /tier_verify yet.</p>
        ) : (
          <div className="space-y-1.5">
            {(() => {
              const max = Math.max(...stats.tier_distribution.map((t) => t.count));
              return stats.tier_distribution.map((t) => (
                <div key={t.tier} className="flex items-center gap-3">
                  <span className="text-xs text-[#b5bac1] w-28 shrink-0">{t.tier}</span>
                  <div className="flex-1 bg-[#111214] rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-[#5865F2] rounded-full"
                      style={{ width: `${Math.max((t.count / max) * 100, 4)}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-white w-6 text-right shrink-0">{t.count}</span>
                </div>
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
