'use client';

import { useParams, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useT } from '@/lib/i18n/LanguageContext';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const { status } = useSession();
  const t = useT();

  const rawGuildId = params?.guildId as string | undefined;
  // 🛡️ page.tsx/activity/page.tsx에도 있던 동일한 가드 - 하이드레이션 완료 전 리터럴 "[guildId]"
  // 플레이스홀더가 잠깐 넘어올 수 있다.
  const guildId = rawGuildId && rawGuildId !== '[guildId]' && !rawGuildId.includes('%5B') ? rawGuildId : '';

  // 🛡️ status가 'unauthenticated'면 여기서 한 번에 막는다 - 랭크카드/활동 두 페이지 각각에서
  // useSession()을 따로 체크하며 로그인 안내 화면을 중복 구현할 필요가 없다. callbackUrl은
  // 현재 pathname을 그대로 써서, 로그인 후 사용자가 보려던 바로 그 탭(랭크카드든 활동이든)으로
  // 정확히 돌아온다.
  if (status === 'unauthenticated') {
    const callbackUrl = pathname || (guildId ? `/profile/${guildId}` : '/profile');
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <div className="text-center space-y-4 border border-border-default bg-bg-surface p-8 rounded-2xl shadow-2xl max-w-md w-full">
          <h1 className="text-xl font-black text-warning">{t('profileCardPage.loginRequiredTitle')}</h1>
          <p className="text-sm text-text-secondary">{t('profileCardPage.loginRequiredDesc')}</p>
          <a
            href={`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="inline-block bg-brand hover:bg-brand-hover text-white text-sm font-black px-6 py-3 rounded-xl shadow-lg tracking-widest transition-all"
          >
            {t('profileCardPage.loginButton')}
          </a>
        </div>
      </div>
    );
  }

  if (status === 'loading') return <div className="min-h-screen bg-bg-base" />;

  const isActivityTab = pathname?.endsWith('/activity');
  const isLeaderboardTab = pathname?.endsWith('/leaderboard');
  const tabs = [
    { href: `/profile/${guildId}`, label: t('profileTabs.rankCard'), active: !isActivityTab && !isLeaderboardTab },
    { href: `/profile/${guildId}/activity`, label: t('profileTabs.activity'), active: Boolean(isActivityTab) },
    { href: `/profile/${guildId}/leaderboard`, label: t('profileTabs.leaderboard'), active: Boolean(isLeaderboardTab) },
  ];

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="flex gap-1 border-b border-border-default px-2 sm:px-4 pt-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-xs font-black tracking-widest uppercase border-b-2 transition-all ${
              tab.active ? 'border-brand text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
