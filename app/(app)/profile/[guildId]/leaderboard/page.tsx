'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import LeaderboardBoard, { type LeaderboardUser } from '@/components/LeaderboardBoard';

export default function ProfileLeaderboardPage() {
  const params = useParams();
  const { status, data: session } = useSession();
  const t = useT();

  const rawGuildId = params?.guildId as string | undefined;
  // 🛡️ page.tsx/activity/page.tsx/layout.tsx에도 있는 동일한 가드 - 하이드레이션 완료 전
  // 리터럴 "[guildId]" 플레이스홀더가 잠깐 넘어올 수 있다.
  const guildId = rawGuildId && rawGuildId !== '[guildId]' && !rawGuildId.includes('%5B') ? rawGuildId : '';

  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || !guildId) return;
    setLoading(true);
    fetch(`/api/profile/${guildId}/leaderboard`)
      .then((res) => {
        if (!res.ok) throw new Error(`leaderboard fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [status, guildId]);

  if (status === 'loading') return <div className="min-h-screen bg-bg-base" />;

  const myUserId = (session?.user as any)?.id as string | undefined;
  // 🛡️ 쿼리에 .limit(100)이 걸려있어서(app/api/profile/[guildId]/leaderboard/route.ts) 100등
  // 밖이면 이 배열 안에 본인이 아예 없다 - 그럴 땐 등수를 알 방법이 없으니(추가 카운트 쿼리 없이는)
  // "TOP 100 밖"으로만 안내한다. 로딩 중이거나 데이터가 아직 없을 땐 아무것도 안 보여준다.
  const myIndex = myUserId ? users.findIndex((u) => u.user_id === myUserId) : -1;
  const myRank = myIndex >= 0 ? myIndex + 1 : null;

  return (
    <div className="min-h-screen bg-bg-base text-text-primary p-2 sm:p-4 md:p-6">
      <SettingsPageContainer>
        <div className="border-b border-border-default pb-4">
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-text-primary">{t('profileLeaderboardPage.title')}</h1>
          <HelpText className="mt-1 tracking-wide">{t('profileLeaderboardPage.subtitle')}</HelpText>
        </div>

        {!loading && (
          <div className="text-center py-3 rounded-xl border border-brand/40 bg-brand/10">
            {myRank !== null ? (
              <p className="text-sm sm:text-base font-black text-brand">{t('profileLeaderboardPage.yourRank', { rank: myRank })}</p>
            ) : (
              <p className="text-sm font-bold text-text-secondary">{t('profileLeaderboardPage.outsideTop100')}</p>
            )}
          </div>
        )}

        <LeaderboardBoard users={users} loading={loading} highlightUserId={myUserId} />
      </SettingsPageContainer>
    </div>
  );
}
