'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import { useGuildName } from '@/components/GuildsContext';

interface LeaderboardUser {
  user_id: string;
  username: string;
  avatar_url?: string;
  xp: number;
  level: number;
  points: number;
}

const PODIUM_STYLE: Record<1 | 2 | 3, {
  medal: string;
  borderClass: string;
  glowClass: string;
  avatarSize: string;
  nameSize: string;
  mobileOrder: string;
  desktopOrder: string;
  lift: string;
  cardWidth: string;
}> = {
  1: {
    medal: '🥇',
    borderClass: 'border-[#FFD700]/60',
    glowClass: 'shadow-[0_0_35px_rgba(255,215,0,0.3)]',
    avatarSize: 'h-24 w-24 border-4', // 96px
    nameSize: 'text-base',
    mobileOrder: 'order-1',
    desktopOrder: 'sm:order-2',
    lift: 'sm:-mt-6',
    cardWidth: 'sm:min-w-[230px] sm:max-w-[250px]',
  },
  2: {
    medal: '🥈',
    borderClass: 'border-[#C0C0C0]/50',
    glowClass: 'shadow-[0_0_20px_rgba(192,192,192,0.2)]',
    avatarSize: 'h-[72px] w-[72px] border-2',
    nameSize: 'text-base',
    mobileOrder: 'order-2',
    desktopOrder: 'sm:order-1',
    lift: 'sm:mt-6',
    cardWidth: 'sm:min-w-[190px] sm:max-w-[210px]',
  },
  3: {
    medal: '🥉',
    borderClass: 'border-[#CD7F32]/50',
    glowClass: 'shadow-[0_0_20px_rgba(205,127,50,0.2)]',
    avatarSize: 'h-[72px] w-[72px] border-2',
    nameSize: 'text-base',
    mobileOrder: 'order-3',
    desktopOrder: 'sm:order-3',
    lift: 'sm:mt-6',
    cardWidth: 'sm:min-w-[190px] sm:max-w-[210px]',
  },
};

// 상위 3명 전용 카드 - place=1은 👑을 덧붙이고(기존 🥇 배지는 그대로 유지), 더 크게/가운데로
// 띄운다. 모바일에서는 order-*가 등수 순(1→2→3 위에서 아래로)으로, sm: 이상에서는 2등-1등-3등
// 좌우 배치로 바뀐다 - PODIUM_STYLE의 mobileOrder/desktopOrder가 그 전환을 담당한다. XP 바는
// 하단 Row 리스트와 동일한 공식(5*level^2 + 50*level + 100)을 그대로 재사용한다.
function PodiumCard({
  user, place, levelLabel, pointsLabel, formatMetric,
}: {
  user: LeaderboardUser;
  place: 1 | 2 | 3;
  levelLabel: string;
  pointsLabel: string;
  formatMetric: (val: number) => string;
}) {
  const style = PODIUM_STYLE[place];
  const maxXp = 5 * (user.level ** 2) + 50 * user.level + 100;
  const progress = Math.min(user.xp / maxXp, 1);

  return (
    <div className={`flex flex-col items-center gap-2 p-4 sm:p-5 rounded-2xl border bg-[#161626] ${style.borderClass} ${style.glowClass} ${style.mobileOrder} ${style.desktopOrder} ${style.lift} ${style.cardWidth}`}>
      {place === 1 && <span className="text-2xl leading-none">👑</span>}
      <div className={`relative rounded-full ${style.avatarSize} ${style.borderClass} overflow-hidden bg-[#383A40] flex-shrink-0`}>
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[#2A1F40] flex items-center justify-center text-sm font-black text-gray-400">KYVO</div>
        )}
      </div>
      <span className="text-lg leading-none">{style.medal}</span>
      <h3 className={`${style.nameSize} font-bold text-white text-center truncate max-w-[9rem]`}>{user.username}</h3>

      <div className="w-full px-1">
        <div className="flex justify-between text-[9px] font-bold text-gray-400 tracking-tighter mb-0.5">
          <span>{formatMetric(user.xp)} / {formatMetric(maxXp)} XP</span>
          <span className="text-blue-400">{Math.round(progress * 100)}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#383A40] rounded-full overflow-hidden">
          <div className="h-full bg-[#5865F2] transition-all duration-500 ease-out" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="flex gap-4 text-center font-mono pt-1">
        <div>
          <div className="text-[10px] text-[#8b8d98] tracking-wider">{levelLabel}</div>
          <div className="text-base font-black text-white">{user.level}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#8b8d98] tracking-wider">{pointsLabel}</div>
          <div className="text-base font-black text-[#FFD700]">{formatMetric(user.points)}P</div>
        </div>
      </div>
    </div>
  );
}

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

  const formatMetric = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toString();
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return {
          bg: 'bg-[#FFD700]/5 border-[#FFD700]/30 animate-gold-aura',
          badge: '🥇',
          text: 'text-[#FFD700] font-black scale-110 drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]',
        };
      case 1:
        return {
          bg: 'bg-[#C0C0C0]/5 border-[#C0C0C0]/20 animate-silver-aura',
          badge: '🥈',
          text: 'text-[#C0C0C0] font-bold drop-shadow-[0_0_8px_rgba(192,192,192,0.5)]',
        };
      case 2:
        return {
          bg: 'bg-[#CD7F32]/5 border-[#CD7F32]/20 animate-bronze-aura',
          badge: '🥉',
          text: 'text-[#CD7F32] font-bold drop-shadow-[0_0_8px_rgba(205,127,50,0.5)]',
        };
      default:
        return {
          bg: 'bg-[#161626] border-[#2A1F40] hover:border-[#5865F2]/40 hover:shadow-[0_0_20px_rgba(88,101,242,0.15)]',
          badge: `#${index + 1}`,
          text: 'text-[#a1a1aa] font-mono',
        };
    }
  };

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
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes goldGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(255,215,0,0.15), inset 0 0 8px rgba(255,215,0,0.02); border-color: rgba(255,215,0,0.25); }
          50% { box-shadow: 0 0 35px rgba(255,215,0,0.45), inset 0 0 20px rgba(255,215,0,0.1); border-color: rgba(255,215,0,0.7); }
        }
        @keyframes silverGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(192,192,192,0.1), inset 0 0 8px rgba(192,192,192,0.02); border-color: rgba(192,192,192,0.2); }
          50% { box-shadow: 0 0 30px rgba(192,192,192,0.35), inset 0 0 15px rgba(192,192,192,0.08); border-color: rgba(192,192,192,0.55); }
        }
        @keyframes bronzeGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(205,127,50,0.1), inset 0 0 8px rgba(205,127,50,0.02); border-color: rgba(205,127,50,0.2); }
          50% { box-shadow: 0 0 30px rgba(205,127,50,0.35), inset 0 0 15px rgba(205,127,50,0.08); border-color: rgba(205,127,50,0.55); }
        }
        .animate-gold-aura { animation: goldGlow 3.5s infinite ease-in-out; }
        .animate-silver-aura { animation: silverGlow 3.5s infinite ease-in-out; }
        .animate-bronze-aura { animation: bronzeGlow 3.5s infinite ease-in-out; }
      `}} />

      <SettingsPageContainer>
        <div className="flex justify-between items-center border-b border-[#2A1F40] pb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wider text-white">{t('leaderboardPage.title')}</h1>
            <HelpText className="mt-1 tracking-wide">
              {t('leaderboardPage.subtitle')} <code className="text-[#5865F2]">{guildName || guildId}</code>
            </HelpText>
          </div>
          <span className="text-[10px] bg-[#2A1F40] text-[#FFD700] px-3 py-1 rounded font-black tracking-widest hidden sm:inline">
            {t('leaderboardPage.premiumBadge')}
          </span>
        </div>

        {!loading && users.length >= 3 && (
          <div className="flex flex-col sm:flex-row sm:items-end justify-center gap-3 sm:gap-4 pb-2">
            <PodiumCard user={users[1]} place={2} levelLabel={t('leaderboardPage.level')} pointsLabel={t('leaderboardPage.points')} formatMetric={formatMetric} />
            <PodiumCard user={users[0]} place={1} levelLabel={t('leaderboardPage.level')} pointsLabel={t('leaderboardPage.points')} formatMetric={formatMetric} />
            <PodiumCard user={users[2]} place={3} levelLabel={t('leaderboardPage.level')} pointsLabel={t('leaderboardPage.points')} formatMetric={formatMetric} />
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-20 border border-[#2A1F40] bg-[#161626] rounded-xl animate-pulse">
              <p className="text-base text-[#FFD700] tracking-widest">{t('leaderboardPage.loadingStandings')}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20 border border-red-500/20 bg-[#161626] rounded-xl">
              <p className="text-base text-red-400 tracking-wider font-bold">{t('leaderboardPage.noUsersTitle')}</p>
              <HelpText className="mt-2 font-sans">{t('leaderboardPage.noUsersSubtitle')}</HelpText>
            </div>
          ) : (
            (users.length >= 3 ? users.slice(3) : users).map((user, i) => {
              // 포디움이 그려질 땐(3명 이상) 상위 3명은 이미 위에 카드로 나왔으니 리스트에서
              // 제외한다 - 다만 순위 배지(#4, #5...)는 잘려나간 3자리를 감안한 실제 등수를
              // 반영해야 하므로, 슬라이스로 생긴 새 배열 인덱스가 아니라 원래 등수(index)를 쓴다.
              const index = users.length >= 3 ? i + 3 : i;
              const style = getRankStyle(index);
              const maxXp = 5 * (user.level ** 2) + 50 * user.level + 100;
              const progress = Math.min(user.xp / maxXp, 1);

              return (
                <div key={user.user_id} className={`border p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 transform transition-all duration-300 ease-out cursor-pointer hover:scale-[1.01) active:scale-[0.99] ${style.bg}`}>
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <span className={`text-base md:text-lg w-10 text-center ${style.text}`}>{style.badge}</span>
                    <div className="h-12 w-12 rounded-full bg-[#383A40] overflow-hidden flex-shrink-0 border-2 border-[#2A1F40]">
                      {user.avatar_url ? <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[#2A1F40] flex items-center justify-center text-sm font-black text-gray-400">KYVO</div>}
                    </div>
                    <div className="truncate">
                      <h3 className="text-base md:text-base font-bold text-white truncate">{user.username}</h3>
                      <HelpText className="font-mono mt-0.5">{t('leaderboardPage.nodeIdLabel')} {user.user_id}</HelpText>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-8 w-full sm:w-auto justify-end">
                    <div className="flex flex-col gap-1 w-full sm:w-44">
                      <div className="flex justify-between text-[10px] font-bold text-gray-400 tracking-tighter">
                        <span>{formatMetric(user.xp)} / {formatMetric(maxXp)} XP</span>
                        <span className="text-blue-400">{Math.round(progress * 100)}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#383A40] rounded-full overflow-hidden">
                        <div className="h-full bg-[#5865F2] transition-all duration-500 ease-out" style={{ width: `${progress * 100}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between sm:justify-end gap-6 text-right font-mono min-w-[120px]">
                      <div>
                        <div className="text-sm text-[#8b8d98] tracking-wider">{t('leaderboardPage.level')}</div>
                        <div className="text-base md:text-base font-black text-white">{user.level}</div>
                      </div>
                      <div>
                        <div className="text-sm text-[#8b8d98] tracking-wider">{t('leaderboardPage.points')}</div>
                        <div className="text-base md:text-base font-black text-[#FFD700]">{formatMetric(user.points)}P</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SettingsPageContainer>
    </div>
  );
}
