'use client';

import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';

export default function ServerControlHubHome() {
  const params = useParams();
  
  // 💡 하드코딩된 폴백 ID를 제거하고, 파라미터가 없으면 즉시 Next.js 404(notFound)로 보냅니다.
  const guildId = params?.guildId as string | undefined;
  if (!guildId) {
    notFound();
  }

  return (
    <div className="font-mono text-white space-y-6">
      <div className="bg-[#161626] border border-[#2A1F40] rounded-xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 text-[10px] text-[#57576F] font-bold">NODE_STATUS // ONLINE</div>
        <h2 className="text-xl font-black text-[#FFD700] tracking-wider mb-2">
          📡 CENTRAL CONTROL COMMAND METRICS
        </h2>
        <p className="text-xs text-gray-400">
          Welcome to the automated control interface for server cluster node instance: <span className="text-[#5865F2] font-bold">{guildId}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <Link 
          href={`/dashboard/${guildId}/leveling`} 
          className="bg-[#161626] border border-[#2A1F40] hover:border-[#FFD700]/50 p-5 rounded-xl transition space-y-2 group"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-[#FFD700]">💰 LEVEL & ECONOMY</h3>
            <span className="text-[10px] text-gray-500 font-bold group-hover:text-[#FFD700]">CONFIGURE ➔</span>
          </div>
          <p className="text-xs text-[#57576F] font-sans">
            Tune global experience scaling modifiers, customize role mappings, and register automated commerce market goods.
          </p>
        </Link>

        {/* 🛠️ FIX: Updated to route into internal dashboard tree structure */}
        <Link 
          href={`/dashboard/${guildId}/ticket-settings`} 
          className="bg-[#161626] border border-[#2A1F40] hover:border-[#5865F2]/50 p-5 rounded-xl transition space-y-2 group"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-[#5865F2]">🎫 AI SUPPORT TICKET</h3>
            <span className="text-[10px] text-gray-500 font-bold group-hover:text-[#5865F2]">MANAGE ➔</span>
          </div>
          <p className="text-xs text-[#57576F] font-sans">
            Oversee user care handshake channels, dispatch protocols, and monitor customer service neural logs.
          </p>
        </Link>

        <Link 
          href={`/dashboard/${guildId}/leaderboard`} 
          className="bg-[#161626] border border-[#2A1F40] hover:border-green-500/50 p-5 rounded-xl transition space-y-2 group"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-green-400">🏆 SERVER LEADERBOARD</h3>
            <span className="text-[10px] text-gray-500 font-bold group-hover:text-green-400">VIEW RANK ➔</span>
          </div>
          <p className="text-xs text-[#57576F] font-sans">
            Interrogate active user profile stamps and pull localized database standings matrices in real time.
          </p>
        </Link>

      </div>
    </div>
  );
}