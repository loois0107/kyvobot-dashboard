"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface AuditLog {
  id: number;
  action_type: string;
  user_name: string;
  user_id: string;
  moderator_name: string;
  reason: string;
  created_at: string;
}

function LogsContent() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild_id");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      const res = await fetch(`https://kyvobot.onrender.com/api/logs?guild_id=${guildId}`);
      const result = await res.json();
      
      if (result.status === "success") {
        setLogs(result.data);
      } else {
        setError(result.message || "Failed to retrieve tracking datasets.");
      }
    } catch (err: any) {
      setError(err.message || "Network compilation fault.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [guildId]);

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "BAN": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "KICK": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "WARN": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "AUTOMOD": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default: return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-zinc-200">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Live Security Audit Logs</h1>
          <p className="text-sm text-zinc-400 mt-1">Real-time terminal tracking for internal judicial enforcement events.</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium rounded-lg border border-zinc-700 transition-colors"
        >
          Refresh Logs
        </button>
      </div>

      {loading && logs.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm">Syncing live server database...</div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm">No enforcement instances logged inside this perimeter grid.</div>
      ) : (
        <div className="overflow-x-auto border border-zinc-800 rounded-xl bg-zinc-950/50 backdrop-blur">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 font-medium">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Action</th>
                <th className="p-4">Target User</th>
                <th className="p-4">Executor</th>
                <th className="p-4">Reason / Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="p-4 text-zinc-500 font-mono text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded border ${getBadgeColor(log.action_type)}`}>
                      {log.action_type}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-zinc-300">{log.user_name}</div>
                    <div className="text-xs text-zinc-600 font-mono">{log.user_id}</div>
                  </td>
                  <td className="p-4 text-zinc-400 font-medium">{log.moderator_name}</td>
                  <td className="p-4 text-zinc-400 max-w-md truncate" title={log.reason}>
                    {log.reason || "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-zinc-500 text-sm">Loading telemetry grid...</div>}>
      <LogsContent />
    </Suspense>
  );
}
