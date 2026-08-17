'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import Card from '@/components/ui/Card';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
}

export default function ProfileGuildPicker() {
  const router = useRouter();
  const { status } = useSession();
  const t = useT();
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
    return <div className="min-h-screen bg-bg-base" />;
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-text-primary">{t('profilePickerPage.title')}</h1>
          <HelpText className="mt-1 tracking-widest uppercase">
            {t('profilePickerPage.subtitle')}
          </HelpText>
        </header>

        {guilds.length === 0 ? (
          <Card elevated className="!py-12 border-dashed text-center">
            <p className="text-sm text-text-secondary">
              {t('profilePickerPage.noServersFound')}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {guilds.map((g) => (
              <button key={g.id} type="button" onClick={() => router.push(`/profile/${g.id}`)} className="text-left">
                <Card className="!p-4 flex items-center gap-3 hover:!border-brand">
                  {g.icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center text-xs font-bold text-text-secondary">
                      {g.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-bold text-text-primary truncate">{g.name}</span>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
