'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface LeaderboardUser {
  user_id: string;
  username: string;
  avatar_url: string;
  points: number;
  level: number;
  xp: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leaderboard?t=${Date.now()}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.status === 'success' && resData.data) {
          setLeaderboard(resData.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load matrix leaderboard:', err);
        setLoading(false);
      });
  }, []);

  const formatMetric = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white p-4 sm:p-6 font-mono">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 border-b border-[#2A1F40] pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-blue-400">GLOBAL STANDINGS MATRIX</h1>
          </div>
          <Link href="/" className="text-xs text-gray-400 border border-[#2A1F40] px-2.5 py-1 rounded bg-[#161626]">◀ TERMINAL</Link>
        </header>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-20 border border-[#2A1F40] bg-[#161626] rounded-xl animate-pulse text-blue-400 text-xs">LOADING DATABASE...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-20 border border-[#2A1F40] bg-[#161626] rounded-xl text-xs text-[#57576F]">❌ NO OPERATOR PROFILE STAMPS DETECTED.</div>
          ) : (
            leaderboard.map((user, index) => {
              const rank = index + 1;
              const maxXp = 5 * (user.level ** 2) + 50 * user.level + 100;
              const progress = Math.min(user.xp / maxXp, 1);

              return (
                <div key={user.user_id} className="border border-[#2A1F40] bg-[#161626] p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <span className="text-base w-10 text-center text-gray-400">#{rank}</span>
                    <div>
                      <h3 className="text-sm font-bold text-white">{user.username}</h3>
                      <p className="text-[10px] text-[#57576F]">NODE_ID // {user.user_id}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-end">
                    <div className="flex flex-col gap-1 w-full sm:w-44">
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>{formatMetric(user.xp)} / {formatMetric(maxXp)} XP</span>
                      </div>
                    </div>
                    <div className="flex gap-6 text-right font-mono">
                      <div><div className="text-[10px] text-[#57576F]">LEVEL</div><div className="text-sm font-black">{user.level}</div></div>
                      <div><div className="text-[10px] text-[#57576F]">POINTS</div><div className="text-sm font-black text-[#FFD700]">{formatMetric(user.points)}P</div></div>
                    </div>
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
