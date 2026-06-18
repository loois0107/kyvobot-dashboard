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
    // ?t=${Date.now()} 파라미터로 실시간 강제 새로고침 동기화 유지
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

  // 1, 2, 3등 명예의 전당 움직이는 아우라 클래스 배정
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: 'bg-[#FFD700]/5 border-[#FFD700]/30 animate-gold-aura',
          badge: '🥇',
          text: 'text-[#FFD700] font-black scale-110 drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]',
        };
      case 2:
        return {
          bg: 'bg-[#C0C0C0]/5 border-[#C0C0C0]/20 animate-silver-aura',
          badge: '🥈',
          text: 'text-[#C0C0C0] font-bold drop-shadow-[0_0_8px_rgba(192,192,192,0.5)]',
        };
      case 3:
        return {
          bg: 'bg-[#CD7F32]/5 border-[#CD7F32]/20 animate-bronze-aura',
          badge: '🥉',
          text: 'text-[#CD7F32] font-bold drop-shadow-[0_0_8px_rgba(205,127,50,0.5)]',
        };
      default:
        return {
          bg: 'bg-[#161626] border-[#2A1F40] hover:border-[#5865F2]/40 hover:shadow-[0_0_20px_rgba(88,101,242,0.15)]',
          badge: `#${rank}`,
          text: 'text-[#57576F] font-mono',
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white p-4 sm:p-6 font-mono selection:bg-[#2A1F40]">
      
      {/* 🔮 은은하게 넘실거리며 요동치는 사이버 네온 아우라 셰이더 */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes goldGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(255,215,0,0.15), inset 0 0 8px rgba(255,215,0,0.02); border-color: rgba(255,215,0,0.25); }
          50% { box-shadow: 0 0 35px rgba(255,215,0,0.45), inset 0 0 20px rgba(255,215,0,0.1); border-color: rgba(255,215,0,0.7); }
        }
        @keyframes silverGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(192,192,192,0.1), inset 0 0 8px rgba(192,192,192,0.02); border-color: rgba(192,192,192,0.2); }
          50% { box-shadow: 0 0 30px rgba(192,192,192,0.35), inset 0 0 15px rgba(192,192,192,0.08); border-color: rgba(192,192,192,0.55); }
        }
        @keyframes bronzeGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(205,127,50,0.1), inset 0 0 8px rgba(205,127,50,0.02); border-color: rgba(205,127,50,0.2); }
          50% { box-shadow: 0 0 30px rgba(205,127,50,0.35), inset 0 0 15px rgba(205,127,50,0.08); border-color: rgba(205,127,50,0.55); }
        }
        .animate-gold-aura { animation: goldGlow 3.5s infinite ease-in-out; }
        .animate-silver-aura { animation: silverGlow 3.5s infinite ease-in-out; }
        .animate-bronze-aura { animation: bronzeGlow 3.5s infinite ease-in-out; }
      `}} />

      <div className="max-w-4xl mx-auto">
        
        {/* 헤더 섹션 */}
        <header className="mb-8 border-b border-[#2A1F40] pb-4 flex justify-between items-end gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-blue-400 tracking-tight">GLOBAL STANDINGS MATRIX</h1>
            <p className="text-[10px] sm:text-xs text-[#57576F] mt-1">Real-time experience indexing logs synced via Supabase secure cluster nodes.</p>
          </div>
          <Link href="/" className="text-[11px] sm:text-xs text-gray-400 hover:text-white border border-[#2A1F40] px-2.5 py-1 rounded bg-[#161626] shrink-0">
            ◀ TERMINAL
          </Link>
        </header>

        {/* 랭킹 보드 리스트 (기존 압착 테이블 구조 타파 ➔ 독단적 고급 카드 정렬) */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-20 border border-[#2A1F40] bg-[#161626] rounded-xl animate-pulse text-xs sm:text-sm text-blue-400 tracking-widest">
              INTERROGATING DATABASE STANDINGS MATRIX...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-20 border border-[#2A1F40] bg-[#161626] rounded-xl text-xs text-[#57576F]">
              ❌ NO OPERATOR PROFILE STAMPS DETECTED IN GUILD DESK.
            </div>
          ) : (
            leaderboard.map((user, index) => {
              const rank = index + 1;
              const style = getRankStyle(rank);
              
              // MEE6 방식 유동적 최대 XP 연산 공식 동기화
              const maxXp = 5 * (user.level ** 2) + 50 * user.level + 100;
              const progress = Math.min(user.xp / maxXp, 1);

              return (
                <div
                  key={user.user_id}
                  className={`
                    border p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4
                    transform transition-all duration-300 ease-out cursor-pointer
                    hover:scale-[1.015] active:scale-[0.985]
                    ${style.bg}
                  `}
                >
                  {/* 왼쪽 구역: 등수 및 유저 인적사항 */}
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <span className={`text-base md:text-lg w-10 text-center ${style.text}`}>
                      {style.badge}
                    </span>
                    
                    <div className="h-12 w-12 rounded-full bg-[#0F0F1A] overflow-hidden flex-shrink-0 border-2 border-[#2A1F40]">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-[#2A1F40] flex items-center justify-center text-xs font-black text-gray-500">
                          ?
                        </div>
                      )}
                    </div>

                    <div className="truncate">
                      <h3 className="text-sm md:text-base font-bold text-white truncate">
                        {user.username}
                      </h3>
                      <p className="text-[10px] text-[#57576F] font-mono mt-0.5">
                        NODE_ID // {user.user_id}
                      </p>
                    </div>
                  </div>

                  {/* 오른쪽 구역: 게이지 바 및 상세 스탯 (글자 절대 안 겹침) */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-8 w-full sm:w-auto justify-end">
                    
                    {/* 실시간 경험치 진행도 바 트랙 */}
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

                    {/* 최종 레벨 & 포인트 박스 스탠드 */}
                    <div className="flex justify-between sm:justify-end gap-6 text-right font-mono min-w-[120px]">
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
