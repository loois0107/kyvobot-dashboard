'use client';

import { useEffect, useState } from 'react';

interface AuditLog {
  id: string;
  action_type: string;
  user_name: string;
  user_id: string;
  moderator_name: string;
  reason: string;
  created_at: string;
}

interface ManagedGuild {
  id: string;
  name: string;
}

export default function LogsPage() {
  const [guilds, setGuilds] = useState<ManagedGuild[]>([]);
  const [guildsLoading, setGuildsLoading] = useState(true);
  const [selectedGuildId, setSelectedGuildId] = useState('');

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🛡️ [길드 선택 추가] /api/logs가 guild_id를 요구하도록 바뀌어서, 이 페이지도 대시보드의
  // 다른 페이지들처럼 관리 중인 서버 목록을 불러와 드롭다운으로 골라야 로그를 받아올 수 있다.
  useEffect(() => {
    fetch('/api/guilds')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error: Status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setGuilds(data);
          if (data.length > 0) {
            setSelectedGuildId(data[0].id);
          }
        }
      })
      .catch((err) => console.error('Failed to load managed guilds:', err))
      .finally(() => setGuildsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedGuildId) return;

    setLoading(true);
    setError(null);
    fetch(`/api/logs?guild_id=${selectedGuildId}&t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP Error: Status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setLogs(data);
        } else if (data && Array.isArray(data.data)) {
          setLogs(data.data);
        } else {
          throw new Error('Data package payload is not a valid array structure.');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to capture audit logs:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [selectedGuildId]);

  if (guildsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F0F1A] text-[#FFD700] font-mono">
        <div className="text-xl font-bold tracking-widest animate-pulse">
          LOADING MANAGED SERVERS...
        </div>
      </div>
    );
  }

  if (guilds.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F0F1A] p-6 font-mono text-gray-400">
        <div className="max-w-md w-full border border-[#2A1F40] bg-[#161626] p-6 rounded-xl text-center shadow-lg">
          <h2 className="text-xl font-bold mb-2 tracking-wider text-[#FFD700]">NO MANAGED SERVERS</h2>
          <p className="text-sm">No Discord servers found where you have management permissions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white p-6 font-mono selection:bg-[#2A1F40]">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 border-b border-[#2A1F40] pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#FFD700]">
              KYVO NETWORKS // SECURITY AUDIT LOGS
            </h1>
            <p className="text-sm text-[#57576F] mt-2">
              Real-time tracking of server moderation actions and automated systems.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-[#57576F] uppercase tracking-wider">Target Server</label>
            <select
              value={selectedGuildId}
              onChange={(e) => setSelectedGuildId(e.target.value)}
              className="bg-[#161626] border border-[#2A1F40] text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-[#FFD700] cursor-pointer"
            >
              {guilds.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </header>

        {loading ? (
          <div className="border border-[#2A1F40] bg-[#161626] p-10 rounded-xl text-center text-[#FFD700] text-sm animate-pulse">
            INTERCEPTING SECURE LOG FEEDS...
          </div>
        ) : error ? (
          <div className="border border-red-900 bg-[#161626] p-6 rounded-xl text-center shadow-lg">
            <h2 className="text-xl font-bold mb-2 tracking-wider text-red-500">LOG RECOVERY FAILURE</h2>
            <p className="text-sm text-gray-400 mb-4">{error}</p>
            <p className="text-xs text-[#57576F]">Verify backend runtime connection parameters or CORS configurations.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {logs.length === 0 ? (
              <div className="border border-[#2A1F40] bg-[#161626] p-10 rounded-xl text-center text-[#57576F] text-sm">
                No security infractions or logs registered in this matrix.
              </div>
            ) : (
              logs.map((log) => {
                // Map enforcement penalty action nodes into optimized colored matrix badges
                const isAutomod = log.action_type === 'AUTOMOD' || ['TIMEOUT_10M', 'DELETE_ONLY'].includes(log.action_type);
                const isSevere = ['BAN', 'KICK'].includes(log.action_type);

                let badgeColor = 'border-blue-500 text-blue-400 bg-blue-950/30';
                if (isAutomod) badgeColor = 'border-purple-500 text-purple-400 bg-purple-950/30';
                if (isSevere) badgeColor = 'border-red-500 text-red-400 bg-red-950/30';
                if (log.action_type === 'WARN') badgeColor = 'border-orange-500 text-orange-400 bg-orange-950/30';

                return (
                  <div
                    key={log.id}
                    className="border border-[#2A1F40] bg-[#161626] p-5 rounded-xl flex flex-col gap-3 hover:border-[#57576F] transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded border ${badgeColor}`}>
                          {log.action_type}
                        </span>
                        <span className="text-sm font-bold text-gray-200">
                          Target Username: {log.user_name}
                        </span>
                        <span className="text-[11px] text-[#57576F]">
                          (ID: {log.user_id})
                        </span>
                      </div>

                      {/* 🔑 FIXED: Forced standard en-US locale configuration to wipe out localized text strings */}
                      <span className="text-xs text-[#57576F]">
                        {log.created_at ? new Date(log.created_at).toLocaleString('en-US', {
                          timeZone: 'Asia/Seoul',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true
                        }) : 'UNKNOWN_TIME'}
                      </span>
                    </div>

                    <div className="text-sm text-gray-400 border-l-2 border-[#2A1F40] pl-3 py-1 bg-[#0A0A14]/50 rounded-r">
                      {log.reason}
                    </div>

                    <div className="text-[11px] text-[#57576F] flex items-center gap-1">
                      <span>Authorized By:</span>
                      <span className="text-gray-400 font-semibold">{log.moderator_name}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
