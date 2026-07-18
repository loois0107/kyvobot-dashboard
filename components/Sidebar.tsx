'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useParams } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const params = useParams();

  const [lastGuildId, setLastGuildId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('kyvo_managed_guilds');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed) && typeof parsed[0]?.id === 'string') {
        setLastGuildId(parsed[0].id);
      }
    } catch {
      setLastGuildId(null);
    }
  }, []);

  // The dashboard section renders its own full sidebar/navigation - don't stack a second one next to it.
  if (pathname?.startsWith('/dashboard/')) {
    return null;
  }

  const guildId = (params?.guildId as string | undefined) || lastGuildId;
  // No known guild yet - send to '/', which resolves a real one via the Discord API rather than guessing.
  const controlHubHref = guildId ? `/dashboard/${guildId}` : '/';

  const menuItems = [
    { href: '/', label: '🏠 Home', activeColor: 'text-white border-white' },
    { href: controlHubHref, label: '🎛️ Control Hub', activeColor: 'text-[#5865F2] border-[#5865F2]' },
    { href: '/logs', label: '🛡️ Audit Logs', activeColor: 'text-red-500 border-red-500' },
  ];

  return (
    <aside className="w-full md:w-64 bg-[#161626] border-b md:border-b-0 md:border-r border-[#2A1F40] p-4 md:p-6 flex flex-row md:flex-col justify-between items-center md:items-stretch sticky top-0 z-50">
      <div className="flex flex-row md:flex-col items-center md:items-stretch gap-4 md:gap-0 w-full md:w-auto justify-between md:justify-start">
        
        <h2 className="text-sm md:text-xl font-bold text-[#FFD700] tracking-wider mb-0 md:mb-8 whitespace-nowrap">
          KYVO DASH
        </h2>
        
        <nav className="flex flex-row md:flex-col gap-3 md:gap-4 text-xs md:text-sm text-[#57576F]">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-all duration-200 whitespace-nowrap font-bold relative md:pl-3 py-1 md:border-l-2 ${
                  isActive 
                    ? `${item.activeColor} bg-[#2A1F40]/20` 
                    : 'border-transparent text-gray-400 hover:text-white' 
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="hidden md:block text-[10px] text-[#57576F]">
        SYSTEM V2.0.0 // ACTIVE
      </div>
    </aside>
  );
}
