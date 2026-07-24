'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
}

export default function ProfileGuildPicker() {
  const router = useRouter();
  const { status } = useSession();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/profile/guilds')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setGuilds(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-[#111214]" />;
  }

  return (
    <div className="min-h-screen bg-[#111214] text-[#dbdee1] p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-white">👤 My Profile</h1>
          <p className="text-[10px] text-[#57576F] mt-1 tracking-widest uppercase">
            Pick a server to customize your personal rank card
          </p>
        </header>

        {guilds.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#2b2d31] rounded-xl bg-[#1e1f22]">
            <p className="text-sm text-gray-400">
              No servers found where both you and Kyvo are present. Join a server that has Kyvo, then come back here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {guilds.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => router.push(`/profile/${g.id}`)}
                className="flex items-center gap-3 bg-[#1e1f22] border border-[#2b2d31] hover:border-[#5865F2] rounded-xl p-4 text-left transition-colors"
              >
                {g.icon ? (
                  <img
                    src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#313338] flex items-center justify-center text-xs font-bold text-gray-400">
                    {g.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-bold text-white truncate">{g.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
