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
  
  // ★ 로그인 상태를 기억할 감지 스위치 상태 지정
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 1. 백엔드 로봇 상태 가져오기
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

    // 2. ★ 대기실(callback)이 브라우저 주머니에 넣어둔 합격 도장이 있는지 실시간 검사
    const authStatus = localStorage.getItem('discord_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleDiscordLogin = () => {
    const DISCORD_AUTH_URL = "https://discord.com/oauth2/authorize?client_id=1508034647152398436&response_type=code&redirect_uri=https%3A%2F%2Fkyvobot-dashboard-2bu4.vercel.app%2Fcallback&scope=identify+guilds"; 
    window.location.href = DISCORD_AUTH_URL;
  };

  // 테스트용 로그아웃 함수 (필요 시 주머니 비우기)
  const handleDiscordLogout = () => {
    localStorage.removeItem('discord_authenticated');
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white font-mono p-6 selection:bg-[#2A1F40]">
      <div className="max-w-4xl mx-auto mt-10">
        
        <header className="mb-12 border-b border-[#2A1F40] pb-6 text-center md:text-left">
          <h1 className="text-4xl font-extrabold tracking-wider text-[#FFD700] animate-pulse">
            KYVO NETWORKS // CORE TERMINAL
          </h1>
          <p className="text-xs text-[#57576F] mt-2 tracking-widest">
            SECURE INTERACTION MATRIX & DISCORD COMMAND CENTER
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
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

          {/* ★ 디스코드 계정 상태 제어 연동 섹션 변경 */}
          <div className="border border-[#2A1F40] bg-[#161626] p-6 rounded-xl flex flex-col justify-between shadow-2xl">
            <div>
              <h2 className="text-base font-bold text-gray-200 mb-2 border-b border-[#2A1F40] pb-2">DISCORD ACCOUNT</h2>
              <p className="text-xs text-[#57576F] leading-relaxed">
                {isAuthenticated 
                  ? "Bypass verification successful. Handshake protocol holding secure link." 
                  : "Matrix sync requires authentication bypass via official Discord gateway protocols."}
              </p>
            </div>
            
            {/* ★ 로그인 상태에 따라 버튼을 다르게 보여주는 조건부 스위칭 레이어 */}
            {isAuthenticated ? (
              <div className="flex flex-col gap-2 mt-4">
                <div className="w-full text-center border border-green-500 bg-green-950/20 text-green-400 text-xs font-bold py-3 px-4 rounded-lg tracking-widest">
                  ● MATRIX SYNC ACTIVE
                </div>
                <button 
                  onClick={handleDiscordLogout}
                  className="text-[10px] text-red-400 hover:underline text-right"
                >
                  [DISCONNECT LINK]
                </button>
              </div>
            ) : (
              <button 
                onClick={handleDiscordLogin} 
                className="w-full mt-4 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold py-3 px-4 rounded-lg transition-all shadow-md tracking-wider"
              >
                CONNECT DISCORD
              </button>
            )}
          </div>

        </div>

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
