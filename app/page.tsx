'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface BotStats {
  status: string;
  bot_name: string;
  version: string;
  guilds_count: number;
  shards_count: number;
  ping_ms: number;
}

export default function HomeTerminal() {
  const [stats, setStats] = useState<BotStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'online') {
          setStats(data);
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load bot stats:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white font-mono p-6 selection:bg-[#2A1F40]">
      <div className="max-w-4xl mx-auto mt-10">
        
        {/* 대시보드 타이틀 헤더 */}
        <header className="mb-12 border-b border-[#2A1F40] pb-6 text-center md:text-left">
          <h1 className="text-4xl font-extrabold tracking-wider text-[#FFD700] animate-pulse">
            KYVO NETWORKS // CORE TERMINAL
          </h1>
          <p className="text-xs text-[#57576F] mt-2 tracking-widest">
            SECURE INTERACTION MATRIX & DISCORD COMMAND CENTER
          </p>
        </header>

        {/* 메인 콘텐츠 그리드 레이아웃 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* 왼쪽 사령탑: 봇 실시간 상태판 */}
          <div className="md:col-span-2 border border-[#2A1F40] bg-[#161626] p-6 rounded-xl shadow-2xl">
            <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2 border-b border-[#2A1F40] pb-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
              SYSTEM OPERATIONAL STATUS
            </h2>
            
            {loading ? (
              <p className="text-sm text-[#FFD700] animate-pulse">PINGING BACKEND CORE INFRAS...</p>
            ) : stats ? (
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                <div>CORE ALIAS: <span className="text-white font-bold">{stats.bot_name}</span></div>
                <div>MATRIX VER: <span className="text-[#FFD700]">{stats.version}</span></div>
                <div>CONNECTED SERVERS: <span className="text-blue-400 font-bold">{stats.guilds_count} Guilds</span></div>
                <div>LATENCY TICK: <span className="text-green-400">{stats.ping_ms}ms</span></div>
              </div>
            ) : (
              <p className="text-sm text-red-400">BACKEND MATRIX OFFLINE. VERIFY RUNTIME.</p>
            )}
          </div>

          {/* 오른쪽 사령탑: 디스코드 통합 계정 동기화 섹션 */}
          <div className="border border-[#2A1F40] bg-[#161626] p-6 rounded-xl flex flex-col justify-between shadow-2xl">
            <div>
              <h2 className="text-base font-bold text-gray-200 mb-2 border-b border-[#2A1F40] pb-2">DISCORD ACCOUNT</h2>
              <p className="text-xs text-[#57576F] leading-relaxed">Matrix sync requires authentication bypass via official Discord gateway protocols.</p>
            </div>
            <button 
              onClick={() => alert('Discord login integration pipeline active.')} 
              className="w-full mt-4 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold py-3 px-4 rounded-lg transition-all shadow-md tracking-wider"
            >
              CONNECT DISCORD
            </button>
          </div>

        </div>

        {/* 아래쪽 사령탑: 중앙 허브 제어 메뉴 (네비게이션 라우팅) */}
        <div className="border border-[#2A1F40] bg-[#161626] p-6 rounded-xl shadow-2xl">
          <h2 className="text-lg font-bold text-gray-200 mb-4 border-b border-[#2A1F40] pb-2">SYSTEM ARCHITECTURE DIRECTORY</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <Link href="/logs" className="border border-[#2A1F40] bg-[#0F0F1A] p-4 rounded-lg hover:border-[#FFD700] transition-all group">
              <div className="text-sm font-bold text-[#FFD700] group-hover:underline">// AUDIT LOGS</div>
              <p className="text-[11px] text-[#57576F] mt-1">Real-time automation actions feed.</p>
            </Link>

            <Link href="/leaderboard" className="border border-[#2A1F40] bg-[#0F0F1A] p-4 rounded-lg hover:border-blue-400 transition-all group">
              <div className="text-sm font-bold text-blue-400 group-hover:underline">// LEADERBOARD</div>
              <p className="text-[11px] text-[#57576F] mt-1">User Matrix XP/Point standings.</p>
            </Link>

            <Link href="/settings" className="border border-[#2A1F40] bg-[#0F0F1A] p-4 rounded-lg hover:border-purple-400 transition-all group">
              <div className="text-sm font-bold text-purple-400 group-hover:underline">// MANAGEMENT</div>
              <p className="text-[11px] text-[#57576F] mt-1">Server configurations matrix.</p>
            </Link>

          </div>
        </div>

      </div>
    </div>
  );
}
