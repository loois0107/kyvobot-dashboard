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
    fetch('/api/leaderboard')
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

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white p-4 sm:p-6 font-mono selection:bg-[#2A1F40]">
      <div className="max-w-2xl mx-auto">
        
        {/* 헤더 섹션 */}
        <header className="mb-8 border-b border-[#2A1F40] pb-4 flex justify-between items-end gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-blue-400 tracking-tight">KYVO NETWORKS // RANKINGS</h1>
            <p className="text-[10px] sm:text-xs text-[#57576F] mt-1">Top matrix users sorted by network points.</p>
          </div>
          <Link href="/" className="text-[11px] sm:text-xs text-gray-400 hover:text-white border border-[#2A1F40] px-2.5 py-1 rounded bg-[#161626] shrink-0">
            ◀ TERMINAL
          </Link>
        </header>

        {/* 랭킹 보드 판넬 */}
        <div className="bg-[#161626] border border-[#2A1F40] rounded-xl shadow-2xl overflow-hidden">
          
          {/* ★ 퍼센트 분할 레이아웃 적용 (순위 15% / 이름 40% / 레벨 15% / 포인트 30%) */}
          <div className="flex items-center bg-[#0F0F1A] p-4 text-[10px] sm:text-xs font-bold text-[#57576F] border-b border-[#2A1F40]">
            <div className="w-[15%] text-center">RANK</div>
            <div className="w-[40%] text-left pl-2">IDENTITY</div>
            <div className="w-[15%] text-center">LVL</div>
            <div className="w-[30%] text-right">POINTS</div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs sm:text-sm text-blue-400 animate-pulse tracking-widest">
              DECRYPTING USER RANKINGS DATA...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#57576F]">
              No active network sector data available in Supabase.
            </div>
          ) : (
            <div className="divide-y divide-[#2A1F40]/40">
              {leaderboard.map((user, index) => {
                const rank = index + 1;
                const rankColor = 
                  rank === 1 ? 'text-[#FFD700]' : 
                  rank === 2 ? 'text-gray-300' : 
                  rank === 3 ? 'text-[#CD7F32]' : 'text-[#57576F]';

                return (
                  // ★ w-[%] 독점 가로 구역을 지정하여 글자 겹침을 원천 차단
                  <div key={user.user_id} className="flex items-center p-4 text-xs sm:text-sm hover:bg-[#202036]/30 transition-all">
                    
                    {/* 순위 (15% 구역) */}
                    <div className={`w-[15%] text-center font-extrabold ${rankColor}`}>
                      {rank === 1 ? '👑' : rank < 10 ? `0${rank}` : rank}
                    </div>

                    {/* 유저 이름 및 아바타 (40% 구역) */}
                    <div className="w-[40%] flex items-center gap-2 min-w-0 pl-2">
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt="avatar" 
                          className="w-5 h-5 rounded-full border border-[#2A1F40] shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-[#0F0F1A] border border-[#2A1F40] flex items-center justify-center text-[8px] text-gray-500 font-bold shrink-0">
                          ?
                        </div>
                      )}
                      <span className="font-bold text-gray-300 truncate">{user.username}</span>
                    </div>

                    {/* 레벨 (15% 구역) */}
                    <div className="w-[15%] text-center text-blue-400 font-bold">
                      {user.level}
                    </div>

                    {/* 포인트 (30% 구역 - 오른쪽 정렬로 마감처리) */}
                    <div className="w-[30%] text-right text-green-400 font-bold tracking-tight truncate">
                      {user.points.toLocaleString()}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
