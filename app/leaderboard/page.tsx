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
    <div className="min-h-screen bg-[#0F0F1A] text-white p-6 font-mono selection:bg-[#2A1F40]">
      <div className="max-w-2xl mx-auto">
        
        {/* 헤더 섹션 */}
        <header className="mb-8 border-b border-[#2A1F40] pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-extrabold text-blue-400">KYVO NETWORKS // CAPITAL LEADERBOARD</h1>
            <p className="text-xs text-[#57576F] mt-1">Top matrix users sorted by network infrastructure points.</p>
          </div>
          <Link href="/" className="text-xs text-gray-400 hover:text-white border border-[#2A1F40] px-3 py-1 rounded bg-[#161626]">
            ◀ TERMINAL
          </Link>
        </header>

        {/* 랭킹 보드 판넬 */}
        <div className="bg-[#161626] border border-[#2A1F40] rounded-xl shadow-2xl overflow-hidden">
          
          {/* 테이블 인덱스 헤더 */}
          <div className="grid grid-cols-12 gap-2 bg-[#0F0F1A] p-4 text-xs font-bold text-[#57576F] border-b border-[#2A1F40]">
            <div className="col-span-2 text-center">RANK</div>
            <div className="col-span-6">IDENTITY MATRIX</div>
            <div className="col-span-2 text-center">LVL</div>
            <div className="col-span-2 text-right">POINTS</div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-sm text-blue-400 animate-pulse tracking-widest">
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
                // 상위 3명에게만 특별한 네온 컬러 부여
                const rankColor = 
                  rank === 1 ? 'text-[#FFD700]' : 
                  rank === 2 ? 'text-gray-300' : 
                  rank === 3 ? 'text-[#CD7F32]' : 'text-[#57576F]';

                return (
                  <div key={user.user_id} className="grid grid-cols-12 gap-2 p-4 items-center text-sm hover:bg-[#202036]/30 transition-all">
                    
                    {/* 순위 마크 */}
                    <div className={`col-span-2 text-center font-extrabold ${rankColor}`}>
                      {rank === 1 ? '👑 01' : rank < 10 ? `0${rank}` : rank}
                    </div>

                    {/* 유저 프로필 (아바타 이미지 + 닉네임) */}
                    <div className="col-span-6 flex items-center gap-3">
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt="avatar" 
                          className="w-6 h-6 rounded-full border border-[#2A1F40] shadow-md"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#0F0F1A] border border-[#2A1F40] flex items-center justify-center text-[9px] text-gray-500 font-bold">
                          ?
                        </div>
                      )}
                      <span className="font-bold text-gray-200 truncate">{user.username}</span>
                    </div>

                    {/* 레벨 */}
                    <div className="col-span-2 text-center text-blue-400 font-bold">
                      {user.level}
                    </div>

                    {/* 포인트 */}
                    <div className="col-span-2 text-right text-green-400 font-bold tracking-wide">
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
