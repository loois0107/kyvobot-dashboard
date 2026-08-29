'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface ServerActivity {
  id: string;
  name: string;
  active7d: boolean;
  active30d: boolean;
  lastActiveAt: string | null;
}

type LoadStatus = 'loading' | 'loaded' | 'forbidden' | 'error';

// 🛡️ 개발자 본인 전용 콘솔 - 다른 서버 관리자에게 노출될 일이 없어서(Sidebar에 링크도 안
// 걸어뒀다), 이 페이지 하나를 위해 lib/i18n에 새 섹션을 만들지 않고 텍스트를 그대로 둔다.
export default function AdminServersPage() {
  const { status: sessionStatus } = useSession();

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');
  const [servers, setServers] = useState<ServerActivity[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    try {
      const res = await fetch('/api/admin/server-activity');
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
      setServers(data.servers || []);
      setLoadStatus('loaded');
    } catch (err) {
      console.error(err);
      setLoadErrorMsg('A network error occurred while loading server activity.');
      setLoadStatus('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && loadStatus === 'loading')) {
    return <div className="min-h-[50vh] flex items-center justify-center text-text-secondary text-base">Loading...</div>;
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="text-center space-y-4 border border-border-default bg-bg-surface p-8 rounded-2xl shadow-2xl max-w-md w-full">
          <h1 className="text-xl font-black text-warning">Login Required</h1>
          <a
            href="/api/auth/signin?callbackUrl=%2Fadmin%2Fservers"
            className="inline-block bg-brand hover:bg-brand-hover text-white text-sm font-black px-6 py-3 rounded-xl shadow-lg tracking-widest transition-all"
          >
            Login with Discord
          </a>
        </div>
      </div>
    );
  }

  if (loadStatus === 'forbidden' || loadStatus === 'error') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="text-center space-y-3 border border-border-default bg-bg-surface p-8 rounded-2xl shadow-2xl max-w-md w-full">
          <h1 className="text-xl font-black text-danger">{loadStatus === 'forbidden' ? '🔒 Owner Access Only' : '⚠️ Failed to Load'}</h1>
          <p className="text-sm text-text-secondary">
            {loadStatus === 'forbidden' ? "This console is restricted to the bot's developer." : loadErrorMsg}
          </p>
        </div>
      </div>
    );
  }

  const formatLastActive = (iso: string | null) => {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleString();
  };

  return (
    <SettingsPageContainer className="pb-16">
      <header className="border-b border-border-default pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-brand">🖥️ Server Usage</h1>
          <HelpText className="mt-1 tracking-widest uppercase">
            {servers.length} server{servers.length === 1 ? '' : 's'} - based on automod, party recruitment, and inquiry activity
          </HelpText>
        </div>
        <Button type="button" variant="primary" onClick={() => loadData(true)} disabled={isRefreshing} className="w-full sm:w-auto">
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </header>

      <div className="space-y-2">
        {servers.length === 0 ? (
          <Card className="!py-8 text-center text-text-muted text-sm">No servers found.</Card>
        ) : (
          servers.map((server) => (
            <Card key={server.id} elevated className="!p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-text-primary truncate">{server.name}</p>
                <p className="text-xs text-text-muted font-mono">{server.id}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={server.active7d ? 'success' : 'neutral'}>7d {server.active7d ? 'active' : 'quiet'}</Badge>
                <Badge variant={server.active30d ? 'success' : 'danger'}>30d {server.active30d ? 'active' : 'inactive'}</Badge>
              </div>
              <p className="text-xs text-text-secondary shrink-0 sm:w-48 sm:text-right">
                Last activity: {formatLastActive(server.lastActiveAt)}
              </p>
            </Card>
          ))
        )}
      </div>
    </SettingsPageContainer>
  );
}
