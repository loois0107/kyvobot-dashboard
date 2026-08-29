'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface GameFrequencyStat {
  game_name: string;
  count: number;
}

interface TierDistributionEntry {
  tier: string;
  count: number;
}

interface PartyStats {
  window_days: number;
  weekly_count: number;
  top_games: GameFrequencyStat[];
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
      <div className="min-h-[50vh] flex items-center justify-center text-text-secondary text-base">
        {t('partyStatsPage.loadingStats')}
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-danger font-bold">{t('partyStatsPage.loadFailed')}</p>
        <p className="text-base text-text-secondary">{loadErrorMsg}</p>
        <Button type="button" variant="primary" onClick={() => loadData(false)}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <SettingsPageContainer className="pb-16">
      <header className="border-b border-border-default pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-brand">{t('partyStatsPage.title')}</h1>
          <HelpText className="mt-1 tracking-widest uppercase">
            {t('partyStatsPage.subtitle', { days: stats.window_days, cacheState: stats.cached ? t('partyStatsPage.cachedSnapshot') : t('partyStatsPage.freshlyComputed') })}
          </HelpText>
        </div>
        <Button type="button" variant="primary" onClick={() => loadData(true)} disabled={isRefreshing} className="w-full sm:w-auto">
          {isRefreshing ? t('auditLogsPage.refreshing') : t('auditLogsPage.refreshNow')}
        </Button>
      </header>

      {/* 이번 주 결성 건수 */}
      <Card className="space-y-3">
        <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
          {t('partyStatsPage.recruitmentsTitle', { days: stats.window_days })}
        </h3>
        {stats.is_empty ? (
          <p className="text-base text-text-secondary py-4">
            {t('partyStatsPage.notEnoughDataDays', { days: stats.window_days })}
          </p>
        ) : (
          <div>
            <p className="text-4xl font-black text-text-primary">{stats.weekly_count}</p>
            {stats.is_sparse && (
              <HelpText className="mt-1">
                {t('partyStatsPage.smallSampleWarning')}
              </HelpText>
            )}
          </div>
        )}
      </Card>

      {/* 인기 게임 랭킹 */}
      <Card className="space-y-3">
        <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
          {t('partyStatsPage.popularGamesTitle')}
        </h3>
        {stats.top_games.length === 0 ? (
          <p className="text-base text-text-secondary py-4">{t('partyStatsPage.notEnoughData')}</p>
        ) : (
          <div className="space-y-2">
            {stats.top_games.map((game, i) => (
              <Card elevated key={`${game.game_name}-${i}`} className="flex items-center justify-between !px-3 !py-2">
                <span className="text-sm text-text-primary font-medium">{game.game_name}</span>
                <span className="text-sm font-black text-brand">{game.count}</span>
              </Card>
            ))}
          </div>
        )}
        {stats.is_sparse && stats.top_games.length > 0 && (
          <HelpText>{t('partyStatsPage.smallSampleWarning')}</HelpText>
        )}
      </Card>

      {/* 티어 분포 */}
      <Card className="space-y-3">
        <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
          {t('partyStatsPage.tierDistTitle')}
        </h3>
        <HelpText>
          {t('partyStatsPage.tierDistSubtitle', { count: stats.verified_user_count, plural: stats.verified_user_count === 1 ? '' : 's' })}
        </HelpText>
        {stats.tier_distribution.length === 0 ? (
          <p className="text-base text-text-secondary py-4">{t('partyStatsPage.noVerifiedYet')}</p>
        ) : (
          <div className="space-y-1.5">
            {(() => {
              const max = Math.max(...stats.tier_distribution.map((entry) => entry.count));
              return stats.tier_distribution.map((tier) => (
                <div key={tier.tier} className="flex items-center gap-3">
                  <span className="text-sm text-text-secondary w-28 shrink-0">{tier.tier}</span>
                  <div className="flex-1 bg-bg-elevated rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full"
                      style={{ width: `${Math.max((tier.count / max) * 100, 4)}%` }}
                    />
                  </div>
                  <span className="text-sm font-black text-text-primary w-6 text-right shrink-0">{tier.count}</span>
                </div>
              ));
            })()}
          </div>
        )}
      </Card>
    </SettingsPageContainer>
  );
}
