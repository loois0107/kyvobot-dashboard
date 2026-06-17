'use client';

import { useEffect, useState } from 'react';

interface LeaderboardUser {
  user_id: string;
  username?: string;
  points: number;
  level: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const BACKEND_URL = 'https://kyvobot.onrender.com';
    
    fetch(`${BACKEND_URL}/api/leaderboard`)
      .then((res) => res.json())
      .then((data) => {
        setLeaderboard(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to capture financial ledger:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F0F1A] text-[#FFD700]">
        <div className="text-xl font-bold tracking-widest animate-pulse">
          SYNCHRONIZING NETWORK LEDGER...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white p-6 font-mono selection:bg-[#2A1F40]">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 border-b border-[#2A1F40] pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#FFD700]">
            KYVO NETWORKS // CAPITAL LEADERBOARD
          </h1>
          <p className="text-sm text-[#57576F] mt-2">
            Real-time financial status tracking node across active servers.
          </p>
        </header>

        <div className="overflow-hidden rounded-xl border border-[#2A1F40] bg-[#161626]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2A1F40] bg-[#0A0A14] text-sm text-[#B8860B] tracking-wider uppercase">
                <th className="py-4 px-6 text-center w-20">Rank</th>
                <th className="py-4 px-6">Operator Node ID</th>
                <th className="py-4 px-6 text-center w-32">Level</th>
                <th className="py-4 px-6 text-right w-44">Asset Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A1F40]">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-[#57576F] text-sm">
                    No active assets registered in the database segment.
                  </td>
                </tr>
              ) : (
                leaderboard.map((user, index) => {
                  const rank = index + 1;
                  const isTopThree = rank <= 3;
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';

                  return (
                    <tr 
                      key={user.user_id} 
                      className="hover:bg-[#1E1E30] transition-colors duration-150"
                    >
                      <td className="py-4 px-6 text-center font-bold text-lg">
                        {isTopThree ? (
                          <span className="inline-block scale-110">{medal}</span>
                        ) : (
                          <span className="text-[#57576F]">{rank}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-semibold tracking-wide text-gray-200">
                        {user.username || `NODE_${user.user_id.slice(0, 6)}`}
                        <span className="text-[10px] text-[#57576F] block font-normal mt-0.5">
                          UID: {user.user_id}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-[#CBA6F7]">
                        LV.{user.level}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-[#89B4FA] tracking-wide">
                        {user.points.toLocaleString()} <span className="text-xs text-[#57576F] font-normal">P</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
