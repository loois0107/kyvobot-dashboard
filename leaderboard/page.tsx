"use client";

import { useEffect, useState } from "react";

interface LeaderboardUser {
  user_id: string;
  username: string;
  avatar_url: string;
  points: number;
  level: number;
  xp: number;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("https://kyvobot.onrender.com/api/leaderboard");
      const result = await res.json();
      if (result.status === "success") {
        setUsers(result.data);
      } else {
        setError(result.message || "Failed to load ranking metrics.");
      }
    } catch (err: any) {
      setError(err.message || "Network compilation fault.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0: return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40 text-base font-bold";
      case 1: return "bg-zinc-300/20 text-zinc-300 border-zinc-300/40 text-sm font-semibold";
      case 2: return "bg-amber-700/20 text-amber-500 border-amber-700/40 text-sm font-semibold";
      default: return "bg-zinc-900 border-zinc-800 text-zinc-500 text-xs";
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-zinc-200">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Global Net-Worth Standings</h1>
          <p className="text-sm text-zinc-400 mt-1">Real-time leaderboard indexing top active capital holders across the network.</p>
        </div>
        <button 
          onClick={fetchLeaderboard}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-sm font-medium rounded-lg border border-zinc-800 transition-colors"
        >
          Refresh Matrix
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-600 text-sm font-mono">Fetching economy node registry...</div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-mono">{error}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-zinc-600 text-sm">No recorded fiscal footprints active within database.</div>
      ) : (
        <div className="border border-zinc-800 rounded-xl bg-zinc-950/40 overflow-hidden shadow-2xl">
          <div className="divide-y divide-zinc-900">
            {users.map((user, index) => (
              <div key={user.user_id} className="p-4 flex items-center justify-between hover:bg-zinc-900/10 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-mono ${getRankBadge(index)}`}>
                    {index + 1}
                  </div>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full border border-zinc-800" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-500">
                      N/A
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold text-zinc-200">{user.username}</div>
                    <div className="text-xs text-zinc-600 font-mono tracking-tighter">ID: {user.user_id}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-8 text-right">
                  <div className="hidden sm:block">
                    <div className="text-xs text-zinc-500">Progression</div>
                    <div className="text-xs font-semibold text-zinc-400 font-mono">LV. {user.level} ({user.xp} XP)</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Accumulated Points</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono">
                      {user.points.toLocaleString()} <span className="text-xs text-emerald-600 font-normal">P</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
