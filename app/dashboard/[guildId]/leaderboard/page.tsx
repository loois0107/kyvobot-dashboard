'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import { useGuildName } from '@/components/GuildsContext';
import LeaderboardBoard, { type LeaderboardUser } from '@/components/LeaderboardBoard';

export default function GuildLeaderboardTerminal() {
  const router = useRouter();
  const params = useParams();
  const { status } = useSession();
  const t = useT();

  // 💡 NEXT.JS MAGIC: 주소창에 박혀있는 현재 서버 ID를 유저의 입력 없이 자동 추출!
  const guildId = params?.guildId as string;
  const guildName = useGuildName(guildId);

  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated' || !guildId) return;

    setLoading(true);

    // 2. 🛡️ CORE UPGRADE: 백엔드 API 엔드포인트에 실시간 서버 ID(guild_id) 탑재
    fetch(`/api/leaderboard?guild_id=${guildId}&t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`leaderboard fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to pull global rank matrix:', err);
        setLoading(false);
      });
  }, [status, guildId]); // 🌟 드롭다운에서 완장이 서버를 스위칭하면 guildId가 바뀌면서 실시간 자동 리페칭!

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="text-center space-y-3 border border-red-500/30 bg-[#161626] p-8 rounded-xl max-w-md mx-auto shadow-2xl mt-20">
        <p className="text-base text-red-400 font-bold tracking-widest animate-pulse">
          {t('leaderboardPage.accessDenied')}
        </p>
        <HelpText>
          {t('leaderboardPage.redirecting')}
        </HelpText>
      </div>
    );
  }

  return (
    <div className="font-mono text-white selection:bg-[#2A1F40]">
      <SettingsPageContainer>
        {/* 🛡️ [정직성 정리] "ALL PREMIUM BYPASS ACTIVE" 배지가 있었지만, 이 봇엔 애초에 프리미엄
            등급 자체가 없다 - 아무 상태와도 연결되지 않은 채 항상 떠 있던 문구라 그냥 없앤다. */}
        <div className="flex justify-between items-center border-b border-[#2A1F40] pb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wider text-white">{t('leaderboardPage.title')}</h1>
            <HelpText className="mt-1 tracking-wide">
              {t('leaderboardPage.subtitle')} <code className="text-[#5865F2]">{guildName || guildId}</code>
            </HelpText>
          </div>
        </div>

        <LeaderboardBoard users={users} loading={loading} />
      </SettingsPageContainer>
    </div>
  );
}
