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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 1. Fetch real-time asynchronous bot statistics from main.py endpoint
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'online') {
          setStats(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to stream central backend metrics:', err);
        setLoading(false);
      });

    // 2. Audit check on local storage passport stamp signature
    const authStatus = localStorage.getItem('discord_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleDiscordLogin = () => {
    const DISCORD_AUTH_URL = "https://discord.com/oauth2/authorize?client_id=1508034647152398436&response_type=code&redirect_uri=https%3A%2F%2Fkyvobot-dashboard-2bu4.vercel.app%2Fcallback&scope=identify+guilds"; 
    window.location.href = DISCORD_AUTH_URL;
  };

  const handleDiscordLogout = () => {
    localStorage.removeItem('discord_authenticated');
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white font-mono p-4 md:p-6 selection:bg-[#2A1F40]">
      <div className="max-w-4xl mx-auto mt-4 md:mt-10 space-y-6">
        
        {/* Main Framework Header Terminal */}
        <header className="mb-8 border-b border-[#2A1F40] pb-6 text-center md:text-left">
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-wider text-[#FFD700] animate-pulse">
            KYVO NETWORKS // CORE TERMINAL
          </h1>
          <p className="text-[10px] md:text-xs text-[#57576F] mt-2 tracking-widest">
            SECURE INTERACTION MATRIX & DISCORD COMMAND CENTER // PREMIUM BYPASS ACTIVE
          </p>
        </header>

        {/* Dynamic Analytics & Gatekeeper Panel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card Module A: System Operational Status Monitor */}
          <div className="md:col-span-2 border border-[#2A1F40] bg-[#161626] p-6 rounded-xl shadow-2xl transform transition-all duration-300 ease-out hover:scale-[1.01] hover:bg-[#1a1a2e] hover:border-[#00FF66]/30 hover:shadow-[0_0_25px_rgba(0,255,102,0.1)]">
            <h2 className="text-sm md:text-base font-bold text-gray-200 mb-4 flex items-center gap-2 border-b border-[#2A1F40] pb-2">
              <span className={`h-2 w-2 rounded-full animate-ping ${stats ? 'bg-green-500' : 'bg-red-500'}`}></span>
              SYSTEM OPERATIONAL STATUS
            </h2>
            
            {loading ? (
              <p className="text-xs md:text-sm text-[#FFD700] animate-pulse tracking-widest">▶ PINGING BACKEND CORE INFRASTRUCTURES...</p>
            ) : stats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs md:text-sm text-gray-400">
                <div>CORE ALIAS: <span className="text-white font-bold">{stats.bot_name.toUpperCase()}</span></div>
                <div>MATRIX VER: <span className="text-[#FFD700]">{stats.version}</span></div>
                <div>INTEGRATED NODES: <span className="text-blue-400 font-bold">{stats.guilds_count} Guilds</span></div>
                <div>LATENCY TICK: <span className="text-green-400 font-bold">{stats.ping_ms}ms</span></div>
              </div>
            ) : (
              <p className="text-xs md:text-sm text-red-400 font-bold tracking-wider animate-pulse">❌ CRITICAL: BACKEND MATRIX OFFLINE. VERIFY DESK RUNTIME.</p>
            )}
          </div>

          {/* Card Module B: Discord Security Gateway Handshake */}
          <div className="border border-[#2A1F40] bg-[#161626] p-6 rounded-xl flex flex-col justify-between shadow-2xl transform transition-all duration-300 ease-out hover:scale-[1.02] hover:bg-[#1a1a2e] hover:border-[#5865F2]/30">
            <div>
              <h2 className="text-sm md:text-base font-bold text-gray-200 mb-2 border-b border-[#2A1F40] pb-2">DISCORD ACCOUNT</h2>
              <p className="text-[11px] md:text-xs text-[#57576F] leading-relaxed">
                {isAuthenticated 
                  ? "Bypass verification successful. Handshake protocol holding secure mainframe link." 
                  : "Matrix sync requires authentication bypass via official Discord secure gateway protocols."}
              </p>
            </div>
            
            {/* Conditional Switched Authentication Button Interface */}
            {isAuthenticated ? (
              <div className="flex flex-col gap-2 mt-4">
                <div className="w-full text-center border border-green-500/50 bg-green-950/20 text-green-400 text-[10px] md:text-xs font-black py-3 px-4 rounded-lg tracking-widest animate-pulse">
                  ● MATRIX SYNC ACTIVE
                </div>
                <button 
                  onClick={handleDiscordLogout}
                  className="text-[9px] md:text-[10px] text-red-400 hover:text-red-300 hover:underline text-right transition-colors"
                >
                  [DISCONNECT PROTOCOL LINK]
                </button>
              </div>
            ) : (
              <button 
                onClick={handleDiscordLogin} 
                className="w-full mt-4 bg-[#5865F2] text-white text-xs font-black py-3 px-4 rounded-lg shadow-md tracking-widest transform transition-all duration-200 ease-out hover:bg-[#4752C4] hover:scale-[1.03] active:scale-[0.97] hover:shadow-[0_0_20px_rgba(88,101,242,0.3)]"
              >
                CONNECT DISCORD
              </button>
            )}
          </div>

        </div>

        {/* Framework Architecture Navigation Section */}
        <div className="border border-[#2A1F40] bg-[#161626] p-6 rounded-xl shadow-2xl">
          <h2 className="text-sm md:text-base font-bold text-gray-200 mb-4 border-b border-[#2A1F40] pb-2 tracking-wider">SYSTEM ARCHITECTURE DIRECTORY</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Sector A: Audit Logs */}
            <Link href="/logs" className="border border-[#2A1F40] bg-[#0F0F1A] p-4 rounded-lg transform transition-all duration-300 ease-out hover:scale-[1.04] active:scale-[0.96] hover:border-[#FFD700] hover:shadow-[0_0_20px_rgba(255,215,0,0.15)] group">
              <div className="text-xs md:text-sm font-black text-[#FFD700] group-hover:underline tracking-wider">// AUDIT LOGS</div>
              <p className="text-[10px] md:text-[11px] text-[#57576F] mt-1 leading-snug">Real-time security automation actions feed pipeline.</p>
            </Link>

            {/* Sector B: Leaderboard */}
            <Link href="/leaderboard" className="border border-[#2A1F40] bg-[#0F0F1A] p-4 rounded-lg transform transition-all duration-300 ease-out hover:scale-[1.04] active:scale-[0.96] hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group">
              <div className="text-xs md:text-sm font-black text-blue-400 group-hover:underline tracking-wider">// LEADERBOARD</div>
              <p className="text-[10px] md:text-[11px] text-[#57576F] mt-1 leading-snug">Global user matrix experience and point standings database.</p>
            </Link>

            {/* Sector C: Management System Configuration */}
            <Link href="/settings" className="border border-[#2A1F40] bg-[#0F0F1A] p-4 rounded-lg transform transition-all duration-300 ease-out hover:scale-[1.04] active:scale-[0.96] hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] group">
              <div className="text-xs md:text-sm font-black text-purple-400 group-hover:underline tracking-wider">// MANAGEMENT</div>
              <p className="text-[10px] md:text-[11px] text-[#57576F] mt-1 leading-snug">Server parameters configuration index sector mapping.</p>
            </Link>

          </div>
        </div>

      </div>
    </div>
  );
}
