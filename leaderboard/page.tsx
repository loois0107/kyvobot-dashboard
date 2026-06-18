'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface LeaderboardUser {
  user_id: string;
  username: string;
  avatar_url?: string;
  xp: number;
  level: number;
  points: number;
}

export default function LeaderboardTerminal() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real-time ranks directly from your FastAPI database sync router
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to pull global rank matrix:', err);
        setLoading(false);
      });
  }, []);

  // Compact Number Formatter (e.g., 125400 -> 125.4K)
  const formatMetric = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toString();
  };

  // Dynamic Rank Badge Matrix Builder
  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: // 1st Place (Gold Matrix)
        return {
          bg: 'bg-[#FFD700]/10 border-[#FFD700]/40 hover:shadow-[0_0_25px_rgba(255,215,0,0.2)]',
          badge: '🥇',
          text: 'text-[#FFD700] font-black',
        };
      case 1: // 2nd Place (Silver Matrix)
        return {
          bg: 'bg-[#C0C0C0]/10 border-[#C0C0C0]/30 hover:shadow-[0_0_25px_rgba(192,192,192,0.15)]',
          badge: '🥈',
          text: 'text-[#C0C0C0] font-bold',
        };
      case 2: // 3rd Place (Bronze Matrix)
        return {
          bg: 'bg-[#CD7F32]/10 border-[#CD7F32]/30 hover:shadow-[0_0_25px_rgba(205,127,50,0.15)]',
          badge: '🥉',
          text: 'text-[#CD7F32] font-bold',
        };
      default: // Standard Operational Nodes
        return {
          bg: 'bg-[#161626] border-[#2A1F40] hover:border-[#5865F2]/40 hover:shadow-[0_0_20px_rgba(88,101,242,0.1)]',
          badge: `#${index + 1}`,
          text: 'text-[#57576F] font-mono',
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white font-mono p-4 md:p-6 selection:bg-[#2A1F40]">
      <div className="max-w-4xl mx-auto mt-4 md:mt-10 space-y-6">
        
        {/* Navigation Breadcrumb Core */}
        <div className="flex justify-between items-center border-b border-[#2A1F40] pb-4">
          <Link 
            href="/" 
            className="text-xs text-[#57576F] hover:text-[#FFD700] transition-colors flex items-center gap-2 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">◀</span> RETURN_TO_CORE_TERMINAL
          </Link>
          <span className="text-[10px] bg-[#2A1F40] text-[#FFD700] px-3 py-1 rounded font-black tracking-widest">
            ALL PREMIUM BYPASS ACTIVE
          </span>
        </div>

        {/* Section Title Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-wider text-white">
            GLOBAL STANDINGS MATRIX
          </h1>
          <p className="text-xs text-[#57576F] mt-1 tracking-wide">
            Real-time experience indexing logs synced via Supabase secure cluster nodes.
          </p>
        </div>

        {/* Real-time Leaderboard Stream Container */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-20 border border-[#2A1F40] bg-[#161626] rounded-xl animate-pulse">
              <p className="text-sm text-[#FFD700] tracking-widest">▶ INTERROGATING DATABASE STANDINGS MATRIX...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20 border border-[#2A1F40] bg-[#161626] rounded-xl">
              <p className="text-sm text-red-400 tracking-wider">❌ NO OPERATOR PROFILE STAMPS DETECTED IN GUILD DESK.</p>
            </div>
          ) : (
            users.map((user, index) => {
              const style = getRankStyle(index);
              const maxXp = 5 * (user.level ** 2) + 50 * user.level + 100;
              const progress = Math.min(user.xp / maxXp, 1);

              return (
                <div
                  key={user.user_id}
                  className={`
                    border p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4
                    /* ✨ MEE6-KILLER SMOOTH MICRO-INTERACTION LAYER */
                    transform transition-all duration-300 ease-out cursor-pointer
                    hover:scale-[1.01] active:scale-[0.99]
                    ${style.bg}
                  `}
                >
                  {/* Left Side: Identity Metadata */}
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <span className={`text-sm md:text-base w-10 text-center ${style.text}`}>
                      {style.badge}
                    </span>
                    
                    {/* Circle Avatar Frame */}
                    <div className="h-12 w-12 rounded-full bg-[#383A40] overflow-hidden flex-shrink-0 border-2 border-[#2A1F40]">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-[#2A1F40] flex items-center justify-center text-xs font-black text-gray-400">
                          KYVO
                        </div>
                      )}
                    </div>

                    <div className="truncate">
                      <h3 className="text-sm md:text-base font-bold text-white truncate">
                        {user.username}
                      </h3>
                      <p className="text-[11px] text-[#57576F] font-mono mt-0.5">
                        ID // {user.user_id}
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Operational Stats Graph */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-8 w-full sm:w-auto justify-end">
                    
                    {/* XP Progress Slider Frame */}
                    <div className="flex flex-col gap-1 w-full sm:w-44">
                      <div className="flex justify-between text-[10px] font-bold text-gray-400 tracking-tighter">
                        <span>{formatMetric(user.xp)} / {formatMetric(maxXp)} XP</span>
                        <span className="text-blue-400">{Math.round(progress * 100)}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#383A40] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#5865F2] transition-all duration-500 ease-out" 
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Final Metric Summaries Grid */}
                    <div className="flex justify-between sm:justify-end gap-6 text-right font-mono">
                      <div>
                        <div className="text-[10px] text-[#57576F] tracking-wider">LEVEL</div>
                        <div className="text-sm md:text-base font-black text-white">{user.level}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#57576F] tracking-wider">POINTS</div>
                        <div className="text-sm md:text-base font-black text-[#FFD700]">{formatMetric(user.points)}P</div>
                      </div>
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
