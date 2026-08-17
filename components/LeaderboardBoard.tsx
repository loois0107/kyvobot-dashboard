'use client';

import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import Card from '@/components/ui/Card';

export interface LeaderboardUser {
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
  statSize: string;
  mobileOrder: string;
  desktopOrder: string;
  lift: string;
  cardWidth: string;
}> = {
  1: {
    medal: '🥇',
    borderClass: 'border-[#FFD700]/60',
    glowClass: 'shadow-[0_0_50px_rgba(255,215,0,0.35)]',
    avatarSize: 'h-32 w-32 border-[6px]', // 128px
    nameSize: 'text-xl',
    statSize: 'text-xl',
    mobileOrder: 'order-1',
    desktopOrder: 'sm:order-2',
    lift: 'sm:-mt-10',
    cardWidth: 'sm:min-w-[260px] sm:max-w-[300px]',
  },
  2: {
    medal: '🥈',
    borderClass: 'border-[#C0C0C0]/50',
    glowClass: 'shadow-[0_0_20px_rgba(192,192,192,0.2)]',
    avatarSize: 'h-24 w-24 border-4', // 96px
    nameSize: 'text-lg',
    statSize: 'text-lg',
    mobileOrder: 'order-2',
    desktopOrder: 'sm:order-1',
    lift: 'sm:mt-10',
    cardWidth: 'sm:min-w-[220px] sm:max-w-[250px]',
  },
  3: {
    medal: '🥉',
    borderClass: 'border-[#CD7F32]/50',
    glowClass: 'shadow-[0_0_20px_rgba(205,127,50,0.2)]',
    avatarSize: 'h-24 w-24 border-4', // 96px
    nameSize: 'text-lg',
    statSize: 'text-lg',
    mobileOrder: 'order-3',
    desktopOrder: 'sm:order-3',
    lift: 'sm:mt-10',
    cardWidth: 'sm:min-w-[220px] sm:max-w-[250px]',
  },
};

// 상위 3명 전용 카드 - place=1은 👑을 덧붙이고(기존 🥇 배지는 그대로 유지), 더 크게/가운데로
// 띄운다. 모바일에서는 order-*가 등수 순(1→2→3 위에서 아래로)으로, sm: 이상에서는 2등-1등-3등
// 좌우 배치로 바뀐다 - PODIUM_STYLE의 mobileOrder/desktopOrder가 그 전환을 담당한다. XP 바는
// 하단 Row 리스트와 동일한 공식(5*level^2 + 50*level + 100)을 그대로 재사용한다. isYou일 땐
// 메달 색상은 그대로 두고 파란 링만 덧씌운다 - "내가 몇 등인지"는 색상보다 "나"라는 배지가
// 훨씬 명확하다(금/은/동 색을 파란색으로 바꿔버리면 오히려 등수를 헷갈리게 만든다).
function PodiumCard({
  user, place, levelLabel, pointsLabel, formatMetric, isYou, youBadgeLabel,
}: {
  user: LeaderboardUser;
  place: 1 | 2 | 3;
  levelLabel: string;
  pointsLabel: string;
  formatMetric: (val: number) => string;
  isYou: boolean;
  youBadgeLabel: string;
}) {
  const style = PODIUM_STYLE[place];
  const maxXp = 5 * (user.level ** 2) + 50 * user.level + 100;
  const progress = Math.min(user.xp / maxXp, 1);

  return (
    <div className={`flex flex-col items-center gap-2 p-5 sm:p-6 rounded-2xl border bg-bg-surface ${style.borderClass} ${style.glowClass} ${style.mobileOrder} ${style.desktopOrder} ${style.lift} ${style.cardWidth} ${isYou ? 'ring-2 ring-brand ring-offset-2 ring-offset-bg-elevated' : ''}`}>
      {place === 1 && <span className="text-4xl leading-none">👑</span>}
      <div className={`relative rounded-full ${style.avatarSize} ${style.borderClass} overflow-hidden bg-bg-elevated flex-shrink-0`}>
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-bg-surface flex items-center justify-center text-sm font-black text-text-secondary">KYVO</div>
        )}
      </div>
      <span className="text-2xl leading-none">{style.medal}</span>
      <h3 className={`${style.nameSize} font-bold text-text-primary text-center truncate max-w-[11rem]`}>
        {user.username}
        {isYou && <span className="ml-1.5 text-[10px] font-black text-brand align-middle">({youBadgeLabel})</span>}
      </h3>

      <div className="w-full px-1">
        <div className="flex justify-between text-xs font-bold text-text-secondary tracking-tighter mb-0.5">
          <span>{formatMetric(user.xp)} / {formatMetric(maxXp)} XP</span>
          <span className="text-brand">{Math.round(progress * 100)}%</span>
        </div>
        <div className="w-full h-2.5 bg-bg-elevated rounded-full overflow-hidden">
          <div className="h-full bg-brand transition-all duration-500 ease-out" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="flex gap-4 text-center font-mono pt-1">
        <div>
          <div className="text-[10px] text-text-muted tracking-wider">{levelLabel}</div>
          <div className={`${style.statSize} font-black text-text-primary`}>{user.level}</div>
        </div>
        <div>
          <div className="text-[10px] text-text-muted tracking-wider">{pointsLabel}</div>
          <div className={`${style.statSize} font-black text-text-primary`}>{formatMetric(user.points)}P</div>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardBoard({
  users, loading, highlightUserId,
}: {
  users: LeaderboardUser[];
  loading: boolean;
  highlightUserId?: string;
}) {
  const t = useT();

  const formatMetric = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toString();
  };

  const getRankStyle = (index: number, isYou: boolean) => {
    const highlightRing = isYou ? ' ring-2 ring-brand' : '';
    switch (index) {
      case 0:
        return {
          bg: `!bg-[#FFD700]/5 !border-[#FFD700]/30 animate-gold-aura${highlightRing}`,
          badge: '🥇',
          text: 'text-[#FFD700] font-black scale-110 drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]',
        };
      case 1:
        return {
          bg: `!bg-[#C0C0C0]/5 !border-[#C0C0C0]/20 animate-silver-aura${highlightRing}`,
          badge: '🥈',
          text: 'text-[#C0C0C0] font-bold drop-shadow-[0_0_8px_rgba(192,192,192,0.5)]',
        };
      case 2:
        return {
          bg: `!bg-[#CD7F32]/5 !border-[#CD7F32]/20 animate-bronze-aura${highlightRing}`,
          badge: '🥉',
          text: 'text-[#CD7F32] font-bold drop-shadow-[0_0_8px_rgba(205,127,50,0.5)]',
        };
      default:
        return {
          bg: `hover:!border-brand/40 hover:shadow-[0_0_20px_rgba(88,101,242,0.15)]${highlightRing}`,
          badge: `#${index + 1}`,
          text: 'text-text-secondary font-mono',
        };
    }
  };

  return (
    <>
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

      {!loading && users.length >= 3 && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-center gap-4 sm:gap-6 pb-2">
          <PodiumCard user={users[1]} place={2} levelLabel={t('leaderboardPage.level')} pointsLabel={t('leaderboardPage.points')} formatMetric={formatMetric} isYou={users[1].user_id === highlightUserId} youBadgeLabel={t('profileLeaderboardPage.youBadge')} />
          <PodiumCard user={users[0]} place={1} levelLabel={t('leaderboardPage.level')} pointsLabel={t('leaderboardPage.points')} formatMetric={formatMetric} isYou={users[0].user_id === highlightUserId} youBadgeLabel={t('profileLeaderboardPage.youBadge')} />
          <PodiumCard user={users[2]} place={3} levelLabel={t('leaderboardPage.level')} pointsLabel={t('leaderboardPage.points')} formatMetric={formatMetric} isYou={users[2].user_id === highlightUserId} youBadgeLabel={t('profileLeaderboardPage.youBadge')} />
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <Card elevated className="text-center !py-20 animate-pulse">
            <p className="text-base text-text-secondary tracking-widest">{t('leaderboardPage.loadingStandings')}</p>
          </Card>
        ) : users.length === 0 ? (
          <Card elevated className="!border-danger/20 hover:!border-danger/20 text-center !py-20">
            <p className="text-base text-danger tracking-wider font-bold">{t('leaderboardPage.noUsersTitle')}</p>
            <HelpText className="mt-2 font-sans">{t('leaderboardPage.noUsersSubtitle')}</HelpText>
          </Card>
        ) : (
          (users.length >= 3 ? users.slice(3) : users).map((user, i) => {
            // 포디움이 그려질 땐(3명 이상) 상위 3명은 이미 위에 카드로 나왔으니 리스트에서
            // 제외한다 - 다만 순위 배지(#4, #5...)는 잘려나간 3자리를 감안한 실제 등수를
            // 반영해야 하므로, 슬라이스로 생긴 새 배열 인덱스가 아니라 원래 등수(index)를 쓴다.
            const index = users.length >= 3 ? i + 3 : i;
            const isYou = user.user_id === highlightUserId;
            const style = getRankStyle(index, isYou);
            const maxXp = 5 * (user.level ** 2) + 50 * user.level + 100;
            const progress = Math.min(user.xp / maxXp, 1);

            return (
              <Card
                elevated
                key={user.user_id}
                className={`!p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transform transition-all duration-300 ease-out cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${style.bg}`}
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <span className={`text-base md:text-lg w-10 text-center ${style.text}`}>{style.badge}</span>
                  <div className="h-12 w-12 rounded-full bg-bg-elevated overflow-hidden flex-shrink-0 border-2 border-border-default">
                    {user.avatar_url ? <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-bg-surface flex items-center justify-center text-sm font-black text-text-secondary">KYVO</div>}
                  </div>
                  <div className="truncate">
                    <h3 className="text-base md:text-base font-bold text-text-primary truncate">
                      {user.username}
                      {isYou && <span className="ml-1.5 text-[10px] font-black text-brand">({t('profileLeaderboardPage.youBadge')})</span>}
                    </h3>
                    <HelpText className="font-mono mt-0.5">{t('leaderboardPage.nodeIdLabel')} {user.user_id}</HelpText>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-8 w-full sm:w-auto justify-end">
                  <div className="flex flex-col gap-1 w-full sm:w-44">
                    <div className="flex justify-between text-[10px] font-bold text-text-secondary tracking-tighter">
                      <span>{formatMetric(user.xp)} / {formatMetric(maxXp)} XP</span>
                      <span className="text-brand">{Math.round(progress * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
                      <div className="h-full bg-brand transition-all duration-500 ease-out" style={{ width: `${progress * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-6 text-right font-mono min-w-[120px]">
                    <div>
                      <div className="text-sm text-text-muted tracking-wider">{t('leaderboardPage.level')}</div>
                      <div className="text-base md:text-base font-black text-text-primary">{user.level}</div>
                    </div>
                    <div>
                      <div className="text-sm text-text-muted tracking-wider">{t('leaderboardPage.points')}</div>
                      <div className="text-base md:text-base font-black text-text-primary">{formatMetric(user.points)}P</div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
