'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  reason: string;
  created_at: string;
}

type LoadStatus = 'loading' | 'loaded' | 'error';

function actionBadgeColor(action: string): string {
  const a = action.toLowerCase();
  if (a.includes('timeout') || a.includes('ban') || a.includes('kick')) return 'border-red-500 text-red-400 bg-red-950/30';
  if (a.includes('bad_word') || a.includes('warn')) return 'border-orange-500 text-orange-400 bg-orange-950/30';
  if (a.includes('spam') || a.includes('delete')) return 'border-purple-500 text-purple-400 bg-purple-950/30';
  return 'border-[#5865F2] text-[#5865F2] bg-[#5865F2]/10';
}

export default function AuditLogsPage() {
  const params = useParams();
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
      return data.message || `Request failed (${res.status})`;
    } catch {
      return `Request failed (${res.status})`;
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
      setLoadErrorMsg('Network error while loading audit logs.');
      setLoadStatus('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#949ba4] text-sm">
        Loading audit logs...
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-red-400 font-bold">⚠️ Failed to load audit logs</p>
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <header className="border-b border-[#2b2d31] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">🛡️ Audit Logs</h1>
          <p className="text-[10px] text-[#57576F] mt-1 tracking-widest uppercase">
            Most recent 25 automod actions - always bot-driven, there's no human moderator field
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

      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-3 shadow-xl">
        {logs.length === 0 ? (
          <p className="text-sm text-[#949ba4] py-4">📭 No automod actions recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="bg-[#111214] rounded-lg px-3 py-2.5 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${actionBadgeColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-[#b5bac1] truncate">
                      Target: <code className="text-white">{log.user_id}</code>
                    </span>
                  </div>
                  <span className="text-[10px] text-[#57576F] shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                {log.reason && <p className="text-xs text-[#949ba4]">{log.reason}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
