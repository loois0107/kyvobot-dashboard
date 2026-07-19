'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

type ManagedGuild = { id: string; name: string };

function isValidGuildId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && !id.includes('[') && !id.includes('%5B');
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawGuildId = params?.guildId as string | undefined;
  const currentGuildId = isValidGuildId(rawGuildId) ? rawGuildId : undefined;

  const [guilds, setGuilds] = useState<ManagedGuild[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isSubPage = pathname ? pathname !== `/dashboard/${currentGuildId}` : false;

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Invalid/missing guildId in the URL - bounce to the root page, which resolves a real guild via the Discord API,
  // instead of guessing a hardcoded server.
  useEffect(() => {
    if (!currentGuildId) {
      router.replace('/');
    }
  }, [currentGuildId, router]);

  // Live-loads the caller's actually-managed guilds from Discord (via /api/guilds) instead of a
  // client-cached list, so servers the user has left or renamed never linger in the dropdown.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/guilds');
        if (!res.ok) throw new Error(`guilds fetch failed: ${res.status}`);
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setGuilds(data.filter((g: any): g is ManagedGuild => g && isValidGuildId(g.id) && typeof g.name === 'string'));
        }
      } catch (err) {
        console.error('[GUILD LIST SYNC FAULT]', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGuildChange = (targetId: string) => {
    if (!targetId || !pathname) return;
    // Path shape is always /dashboard/{guildId}/{...rest} - carry over whatever follows the guildId
    // instead of maintaining a manually-synced whitelist of known subpages.
    const pathSegments = pathname.split('/').filter(Boolean);
    const destinationMenu = pathSegments.slice(2).join('/');
    router.push(`/dashboard/${targetId}${destinationMenu ? `/${destinationMenu}` : ''}`);
  };

  if (!currentGuildId) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#111214] text-[#dbdee1] font-sans relative overflow-x-hidden">
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#1e1f22] p-4 flex flex-col justify-between border-r border-[#2b2d31] transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="mb-6 flex justify-between items-center">
            <div>
              <label className="block text-xs font-bold text-[#949ba4] uppercase tracking-wider mb-2">Select Server</label>
              <select
                value={currentGuildId || ''}
                onChange={(e) => handleGuildChange(e.target.value)}
                className="w-44 bg-[#313338] text-white rounded px-3 py-2 border border-[#232428] focus:outline-none focus:border-[#5865f2] cursor-pointer font-medium text-xs"
              >
                {guilds.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-white md:hidden text-lg p-1 mt-5">✕</button>
          </div>

          <nav className="space-y-1">
            <label className="block text-xs font-bold text-[#949ba4] uppercase tracking-wider mb-2 px-2">Modules</label>
            <Link 
              href={`/dashboard/${currentGuildId}`}
              className={`flex items-center px-3 py-2 rounded font-medium transition ${pathname === `/dashboard/${currentGuildId}` ? 'bg-[#404249] text-white' : 'hover:bg-[#35373c] text-[#b5bac1] hover:text-[#dbdee1]'}`}
            >
              🎛️ Control Hub Home
            </Link>
            <Link 
              href={`/dashboard/${currentGuildId}/leveling`}
              className={`flex items-center px-3 py-2 rounded font-medium transition ${pathname?.includes('/leveling') ? 'bg-[#404249] text-white' : 'hover:bg-[#35373c] text-[#b5bac1] hover:text-[#dbdee1]'}`}
            >
              ✨ Leveling & Economy
            </Link>
            <Link 
              href={`/dashboard/${currentGuildId}/welcome`}
              className={`flex items-center px-3 py-2 rounded font-medium transition ${pathname?.includes('/welcome') ? 'bg-[#404249] text-white' : 'hover:bg-[#35373c] text-[#b5bac1] hover:text-[#dbdee1]'}`}
            >
              📥 Welcome Settings
            </Link>
            <Link 
              href={`/dashboard/${currentGuildId}/ticket-settings`}
              className={`flex items-center px-3 py-2 rounded font-medium transition ${pathname?.includes('/ticket-settings') ? 'bg-[#404249] text-white' : 'hover:bg-[#35373c] text-[#b5bac1] hover:text-[#dbdee1]'}`}
            >
              🎫 AI Support Ticket
            </Link>
            <Link 
              href={`/dashboard/${currentGuildId}/leaderboard`}
              className={`flex items-center px-3 py-2 rounded font-medium transition ${pathname?.includes('/leaderboard') ? 'bg-[#404249] text-white' : 'hover:bg-[#35373c] text-[#b5bac1] hover:text-[#dbdee1]'}`}
            >
              🏆 Global Leaderboard
            </Link>
            
            {/* ⚙️ FIXED: 사이드바 최하단에 'Custom Commands' 퀵 네비게이션 노드 추가 완료! 활성화 하이라이트 배경 완벽 연동 */}
            <Link 
              href={`/dashboard/${currentGuildId}/settings`}
              className={`flex items-center px-3 py-2 rounded font-medium transition ${pathname?.includes('/settings') ? 'bg-[#404249] text-white' : 'hover:bg-[#35373c] text-[#b5bac1] hover:text-[#dbdee1]'}`}
            >
              ⚙️ Custom Commands
            </Link>
          </nav>
        </div>

        <div className="pt-4 border-t border-[#2b2d31] text-xs text-[#949ba4]">
          <p>Current Active Node:</p>
          <code className="text-[#5865f2] block mt-1 truncate">{currentGuildId}</code>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center justify-between bg-[#1e1f22] px-4 py-3 border-b border-[#2b2d31] z-20">
          <button type="button" onClick={() => setIsMobileMenuOpen(true)} className="text-gray-300 hover:text-white p-1 focus:outline-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="text-xs font-black tracking-widest text-[#FFD700] uppercase">Kyvo Control Hub</span>
          <div className="w-8"></div>
        </div>

        <main className="flex-1 p-5 md:p-8 overflow-y-auto">
          <header className="mb-6 pb-4 border-b border-[#2b2d31] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wide break-words max-w-full">Kyvo Central Control Hub</h1>
            <div className="bg-[#232428] px-3 py-1 rounded-full text-xs text-[#23a55a] font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#23a55a] animate-pulse"></span> Endpoint Matrix Sync</div>
          </header>

          {isSubPage && (
            <div className="mb-6">
              <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-xs font-bold text-[#5865F2] hover:text-white bg-[#5865F2]/10 hover:bg-[#5865F2] border border-[#5865F2]/20 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer shadow-md"><span>◀</span> GO BACK</button>
            </div>
          )}
          {children}
        </main>
      </div>

    </div>
  );
}