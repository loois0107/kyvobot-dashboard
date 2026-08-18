'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useT, useLanguage } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge, { type BadgeVariant } from '@/components/ui/Badge';

interface AuditLog {
  id: string;
  user_id: string;
  username: string | null;
  action: string;
  reason: string;
  created_at: string;
}

// 브라우저의 타임존은 그대로 두고(실제 가리키는 시각은 안 바뀜) 로케일만 대시보드 언어 설정에
// 맞춘다 - toLocaleString()을 인자 없이 쓰면 관리자 시스템 로케일을 따라가서 형식이 대시보드
// 언어 토글과 안 맞을 수 있었다.
function formatLogTimestamp(iso: string, lang: 'ko' | 'en'): string {
  return new Date(iso).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US');
}

type LoadStatus = 'loading' | 'loaded' | 'error';

function actionBadgeVariant(action: string): BadgeVariant {
  const a = action.toLowerCase();
  if (a.includes('timeout') || a.includes('ban') || a.includes('kick')) return 'danger';
  if (a.includes('bad_word') || a.includes('warn') || a.includes('spam') || a.includes('delete')) return 'warning';
  return 'neutral';
}

export default function AuditLogsPage() {
  const params = useParams();
  const t = useT();
  const { lang } = useLanguage();
  const guildId = (params?.guildId as string) || '';

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
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

  const loadData = async (isRefresh: boolean) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoadStatus('loading');
    setLoadErrorMsg('');
    try {
      const res = await fetch(`/api/audit-logs/${guildId}`);
      if (!res.ok) {
        setLoadErrorMsg(await extractErrorMessage(res));
        setLoadStatus('error');
        return;
      }
      const data = await res.json();
      setLogs(data.logs || []);
      setLoadStatus('loaded');
    } catch (err) {
      console.error(err);
      setLoadErrorMsg(t('auditLogsPage.networkError'));
      setLoadStatus('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-text-secondary text-base">
        {t('auditLogsPage.loadingLogs')}
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-danger font-bold">{t('auditLogsPage.loadFailed')}</p>
        <p className="text-base text-text-secondary">{loadErrorMsg}</p>
        <Button type="button" variant="primary" onClick={() => loadData(false)}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <SettingsPageContainer className="pb-16">
      <header className="border-b border-border-default pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-brand">{t('auditLogsPage.title')}</h1>
          <HelpText className="mt-1 tracking-widest uppercase">
            {t('auditLogsPage.subtitle')}
          </HelpText>
        </div>
        <Button type="button" variant="primary" onClick={() => loadData(true)} disabled={isRefreshing} className="w-full sm:w-auto">
          {isRefreshing ? t('auditLogsPage.refreshing') : t('auditLogsPage.refreshNow')}
        </Button>
      </header>

      <Card className="space-y-3">
        {logs.length === 0 ? (
          <p className="text-base text-text-secondary py-4">{t('auditLogsPage.noLogsYet')}</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <Card elevated key={log.id} className="!px-3 !py-2.5 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant={actionBadgeVariant(log.action)} className="shrink-0">
                      {log.action}
                    </Badge>
                    <span className="text-sm text-text-secondary truncate">
                      {t('auditLogsPage.targetLabel')} <code className="text-text-primary">{log.username || log.user_id}</code>
                    </span>
                  </div>
                  <span className="text-sm text-text-muted shrink-0">
                    {formatLogTimestamp(log.created_at, lang)}
                  </span>
                </div>
                {log.reason && <p className="text-sm text-text-secondary">{log.reason}</p>}
              </Card>
            ))}
          </div>
        )}
      </Card>
    </SettingsPageContainer>
  );
}
