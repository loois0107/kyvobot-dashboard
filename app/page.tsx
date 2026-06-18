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

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/logs')
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
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F0F1A] text-[#FFD700] font-mono">
        <div className="text-xl font-bold tracking-widest animate-pulse">
          INTERCEPTING SECURE LOG FEEDS...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F0F1A] p-6 font-mono text-red-500">
        <div className="max-w-md w-full border border-red-900 bg-[#161626] p-6 rounded-xl text-center shadow-lg">
          <h2 className="text-xl font-bold mb-2 tracking-wider">LOG RECOVERY FAILURE</h2>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <p className="text-xs text-[#57576F]">Verify backend runtime connection parameters or CORS configurations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white p-6 font-mono selection:bg-[#2A1F40]">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 border-b border-[#2A1F40] pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#FFD700]">
            KYVO NETWORKS // SECURITY AUDIT LOGS
          </h1>
          <p className="text-sm text-[#57576F] mt-2">
            Real-time tracking of server moderation actions and automated systems.
          </p>
        </header>

        <div className="flex flex-col gap-4">
          {logs.length === 0 ? (
            <div className="border border-[#2A1F40] bg-[#161626] p-10 rounded-xl text-center text-[#57576F] text-sm">
              No security infractions or logs registered in this matrix.
            </div>
          ) : (
            logs.map((log) => {
              const isAutomod = log.action_type === 'AUTOMOD';
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
                        Target: {log.user_name}
                      </span>
                      <span className="text-[11px] text-[#57576F]">
                        (ID: {log.user_id})
                      </span>
                    </div>
                    <span className="text-xs text-[#57576F]">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : 'UNKNOWN_TIME'}
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
      </div>
    </div>
  );
}
