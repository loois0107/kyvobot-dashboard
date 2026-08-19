'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useT } from '@/lib/i18n/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import ThemeToggle from '@/components/ThemeToggle';
import AccountMenu from '@/components/AccountMenu';
import BotNotInvitedNotice from '@/components/BotNotInvitedNotice';
import { GuildsProvider, type ManagedGuild } from '@/components/GuildsContext';
import Button from '@/components/ui/Button';
import SidebarNavLink from '@/components/ui/SidebarNavLink';
import Breadcrumb from '@/components/dashboard/Breadcrumb';
import ServerSelect from '@/components/dashboard/ServerSelect';
import RouteLoadingOverlay, { triggerRouteLoading } from '@/components/dashboard/RouteLoadingOverlay';
import {
  LayoutDashboard,
  User,
  Settings,
  Shield,
  Gamepad2,
  Trophy,
  Plug,
  Home,
  BookOpen,
} from 'lucide-react';

type BotStatus = 'checking' | 'present' | 'absent' | 'unknown';

function isValidGuildId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && !id.includes('[') && !id.includes('%5B');
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();

  const rawGuildId = params?.guildId as string | undefined;
  const currentGuildId = isValidGuildId(rawGuildId) ? rawGuildId : undefined;

  const [guilds, setGuilds] = useState<ManagedGuild[]>([]);
  const [guildsLoaded, setGuildsLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [botStatus, setBotStatus] = useState<BotStatus>('checking');

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
          // Only flip this on a successful response - a network hiccup shouldn't bounce a real
          // admin out just because the list came back empty by accident (fail open, matching the
          // bot-status check's philosophy below).
          setGuildsLoaded(true);
        }
      } catch (err) {
        console.error('[GUILD LIST SYNC FAULT]', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 🛡️ [권한 없는 접근 가드] guilds 목록이 로드된 뒤에도 현재 URL의 guildId가 그 안에 없다면
  // (관리 권한이 아예 없거나, 관리하지 않는 다른 서버 ID를 직접 입력/링크로 들어온 경우) 이 페이지
  // 트리 전체가 조각조각 깨진 채로 렌더링되는 대신(각 위젯이 개별 API의 403을 각자 다르게
  // 처리해서 "숫자 전부 0 + 경고 배지"처럼 보임) /dashboard로 되돌린다 - 그 피커 페이지가 이미
  // "관리 서버 0개면 프로필로 안내 / 1개면 자동 이동 / 여러 개면 선택"을 전부 처리해준다.
  useEffect(() => {
    if (!guildsLoaded || !currentGuildId) return;
    const hasAccess = guilds.some((g) => g.id === currentGuildId);
    if (!hasAccess) {
      router.replace('/dashboard');
    }
  }, [guildsLoaded, guilds, currentGuildId, router]);

  // Gates every page under this layout on whether Kyvo is actually in the guild being viewed -
  // user permission (owner/MANAGE_GUILD) and bot membership are completely independent, so without
  // this, channel/role pickers and stats just silently degrade with no explanation. Fails open
  // (treats a failed check as 'unknown', not 'absent') since this is a UX guide rail, not the
  // security boundary - the per-page requireGuildAdmin calls still enforce real access control.
  const checkBotStatus = async (guildId: string) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/bot-status`);
      if (!res.ok) {
        console.error('[BOT_STATUS_CHECK_FAULT] non-OK response:', res.status);
        setBotStatus('unknown');
        return;
      }
      const data = await res.json();
      setBotStatus(data.bot_present ? 'present' : 'absent');
    } catch (err) {
      console.error('[BOT_STATUS_CHECK_FAULT]', err);
      setBotStatus('unknown');
    }
  };

  useEffect(() => {
    if (!currentGuildId) return;
    setBotStatus('checking');
    checkBotStatus(currentGuildId);
  }, [currentGuildId]);

  const handleGuildChange = (targetId: string) => {
    if (!targetId || !pathname) return;
    // Path shape is always /dashboard/{guildId}/{...rest} - carry over whatever follows the guildId
    // instead of maintaining a manually-synced whitelist of known subpages.
    const pathSegments = pathname.split('/').filter(Boolean);
    const destinationMenu = pathSegments.slice(2).join('/');
    // 🛡️ [전환 오버레이] 서버 전환은 <a href>가 아니라 버튼 클릭 → router.push()라서
    // RouteLoadingOverlay의 전역 document 클릭 리스너로는 안 잡힌다 - 여기서 직접 트리거.
    triggerRouteLoading();
    router.push(`/dashboard/${targetId}${destinationMenu ? `/${destinationMenu}` : ''}`);
  };

  if (!currentGuildId) {
    return null;
  }

  return (
    // 🛡️ [브레드크럼] guilds 목록을 예전엔 children 바로 앞에서만 GuildsProvider로 감쌌는데,
    // 브레드크럼이 모바일 전용 줄(<main> 바깥)과 데스크톱 줄(botStatus 게이트 안) 두 군데에서
    // useGuildName()을 써야 해서 트리 전체를 감싸는 최상위로 끌어올렸다.
    <GuildsProvider guilds={guilds}>
    {/* 🛡️ [font-sans 제거] 전역 Inter는 app/layout.tsx의 body에 이미 걸려 있는데, 이 div가
        font-sans(Tailwind 기본 --font-sans, Inter 아님)를 명시적으로 지정해서 대시보드 섹션
        전체(이 레이아웃 아래 모든 페이지)가 Inter 대신 브라우저/OS 기본 산세리프로 렌더링되고
        있었다 - font-mono 6곳 정리 검증 중 발견. 이 div가 최상위 조상이라 지우면 body의 Inter가
        정상적으로 상속된다. */}
    <div className="flex min-h-screen bg-bg-base text-text-primary relative overflow-x-hidden">
      <RouteLoadingOverlay />

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-bg-surface p-4 flex flex-col justify-between border-r border-border-default transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-text-secondary uppercase tracking-wider">{t('sidebar.selectServer')}</label>
              <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="text-text-secondary hover:text-text-primary md:hidden text-lg p-1">✕</button>
            </div>
            <ServerSelect guilds={guilds} currentGuildId={currentGuildId} onChange={handleGuildChange} />
          </div>

          <nav className="space-y-4">
            <SidebarNavLink href={`/dashboard/${currentGuildId}`} active={pathname === `/dashboard/${currentGuildId}`} icon={LayoutDashboard}>
              {t('sidebar.controlHubHome')}
            </SidebarNavLink>

            <SidebarNavLink href={`/profile/${currentGuildId}`} icon={User}>
              {t('sidebar.myPage')}
            </SidebarNavLink>

            <SidebarNavLink href={`/dashboard/${currentGuildId}/general`} active={pathname?.includes('/general')} icon={Settings}>
              {t('sidebar.generalSettings')}
            </SidebarNavLink>

            {/* 🛡️ [커뮤니티 관리 그룹] 다른 그룹들과 동일 패턴 - 개별 링크 7개 대신 그룹
                진입점 1개. 아이콘은 기존 7개(Shield/DoorOpen/Mic/Flag/Smile/Terminal/
                ScrollText) 중 Shield - 자동관리(첫 탭)의 아이콘이기도 하고, 자동 관리·
                익명 제보·감사 로그처럼 그룹의 절반 이상이 "서버를 안전하게 지키고 운영을
                감시한다"는 보호/관리 개념이라 Shield가 그룹 전체를 가장 보편적으로
                대표한다고 판단했다. */}
            <SidebarNavLink href={`/dashboard/${currentGuildId}/community/automod`} active={pathname?.includes('/community')} icon={Shield}>
              {t('sidebar.categoryCommunity')}
            </SidebarNavLink>

            {/* 🛡️ [파티 & 게임 그룹] "연동 & AI 지원" 파일럿과 동일 패턴 - 개별 링크 4개 대신
                그룹 진입점 1개. 아이콘은 기존 4개 중 Gamepad2(게임 프리셋에서 재사용) - 게임
                컨트롤러가 "파티 모집/통계/프리셋/티어"를 아우르는 "같이 게임한다"는 그룹
                전체 개념을 가장 보편적으로 대표한다고 판단해서 새로 고르지 않고 그대로 썼다. */}
            <SidebarNavLink href={`/dashboard/${currentGuildId}/party/party-settings`} active={pathname?.includes('/party')} icon={Gamepad2}>
              {t('sidebar.categoryPartyGames')}
            </SidebarNavLink>

            {/* 🛡️ [경제 & 참여도 그룹] 개별 링크 3개 대신 그룹 진입점 1개. 아이콘은 기존 3개
                (Sparkles/Trophy/Gift) 중 Trophy - 레벨링(XP 적립)·리더보드(순위)·추첨(보상)이
                전부 "서버 참여도에 따른 성취/보상"이라는 한 개념으로 묶이는데, Trophy가 그
                "성취"를 가장 보편적으로 표현하고, 셋 중 리더보드가 economy 시스템 전체의
                결과를 보여주는 요약 화면 성격이라는 점도 반영했다. */}
            <SidebarNavLink href={`/dashboard/${currentGuildId}/economy/leveling`} active={pathname?.includes('/economy')} icon={Trophy}>
              {t('sidebar.categoryEconomy')}
            </SidebarNavLink>

            {/* 🛡️ [연동 & AI 지원 그룹 파일럿] 트위치/AI지원티켓 개별 링크 2개 대신, 그룹
                진입점 1개로 교체 - 클릭하면 첫 탭(twitch)으로 들어가고, 그 안에서
                integrations/layout.tsx가 렌더링하는 탭바로 두 세부 페이지를 전환한다.
                이로써 4개 그룹(커뮤니티 관리/파티 & 게임/경제 & 참여도/연동 & AI 지원)
                전부 동일한 "그룹 진입점 1개 + 탭 레이아웃" 구조로 재구성 완료. */}
            <SidebarNavLink href={`/dashboard/${currentGuildId}/integrations/twitch`} active={pathname?.includes('/integrations')} icon={Plug}>
              {t('sidebar.categoryIntegrationsAI')}
            </SidebarNavLink>
          </nav>
        </div>

        <div className="pt-4 border-t border-border-default text-sm text-text-secondary">
          <p>{t('sidebar.activeServerLabel')}</p>
          <code className="text-brand block mt-1 truncate">{currentGuildId}</code>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center justify-between bg-bg-surface px-4 py-3 border-b border-border-default z-20">
          <button type="button" onClick={() => setIsMobileMenuOpen(true)} className="text-text-secondary hover:text-text-primary p-1 focus:outline-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          {/* 🛡️ [모바일 좁은 상단바 전용 축약] 이 바는 햄버거+타이틀+아이콘 3개로 이미 꽉 차 있어서
              "KyvoBot Dashboard"가 두 줄로 줄바꿈되며 바 높이가 늘어나는 문제가 있었다 - 여기만
              별도 키(mobileTopBarTitle)로 "KyvoBot"만 쓴다. 데스크톱 헤더(mainHeaderTitle)와
              Sidebar.tsx(mobileHeaderTitle)는 그대로 "KyvoBot Dashboard" 유지. */}
          <span className="text-sm font-black tracking-widest text-brand uppercase whitespace-nowrap">{t('sidebar.mobileTopBarTitle')}</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => router.push('/')} aria-label={t('sidebar.homeButton')} title={t('sidebar.homeButton')} className="!px-2 !py-1">
              <Home className="w-5 h-5" />
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push('/guide')} aria-label={t('sidebar.guideButton')} title={t('sidebar.guideButton')} className="!px-2 !py-1">
              <BookOpen className="w-5 h-5" />
            </Button>
            <LanguageToggle />
          </div>
        </div>
        {/* 🛡️ [브레드크럼] 모바일 헤더는 이미 햄버거/타이틀/아이콘 3분할로 꽉 차 있어서 그 안에
            욱여넣지 않고, 전용 줄을 아래에 하나 더 뺐다 - GroupTabLayout의 모바일 7탭 스크롤에
            쓴 것과 동일한 overflow-x-auto 패턴이라 별도 축약 로직 없이 길어져도 가로 스크롤된다. */}
        <div className="md:hidden bg-bg-surface px-4 py-2 border-b border-border-default">
          <Breadcrumb />
        </div>

        <main className="flex-1 p-5 md:p-8 overflow-y-auto">
          <header className="mb-6 pb-4 border-b border-border-default flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-11 h-11 rounded-lg overflow-hidden bg-white shrink-0 relative">
                <Image src="/images/features/brand/kyvobot character.png" alt="" fill className="object-contain" sizes="44px" />
              </span>
              <h1 className="text-xl md:text-2xl font-bold text-text-primary uppercase tracking-wide break-words max-w-full">{t('sidebar.mainHeaderTitle')}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-bg-elevated px-3 py-1 rounded-full text-sm text-success font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success"></span> {t('sidebar.syncStatus')}</div>
              <div className="hidden md:flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => router.push('/')}>
                  <Home className="w-4 h-4" /> {t('sidebar.homeButton')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.push('/guide')}>
                  <BookOpen className="w-4 h-4" /> {t('sidebar.guideButton')}
                </Button>
              </div>
              <ThemeToggle />
              <div className="hidden md:block">
                <LanguageToggle />
              </div>
              <AccountMenu profileHref={`/profile/${currentGuildId}`} />
            </div>
          </header>

          {botStatus === 'checking' ? (
            <div className="flex items-center justify-center py-20 text-base text-text-muted">{t('botNotInvited.checking')}</div>
          ) : botStatus === 'absent' ? (
            <BotNotInvitedNotice onRecheck={() => checkBotStatus(currentGuildId)} />
          ) : (
            <>
              {/* 🛡️ [브레드크럼] Go Back(router.back(), 히스토리 기반 한 단계 뒤로가기)과
                  브레드크럼(고정 href, 위치 파악용)은 서로 대체 관계가 아니라 나란히 공존한다 -
                  브레드크럼은 컨트롤 허브 홈에서도 항상 보이지만 Go Back은 기존과 동일하게
                  isSubPage일 때만 나온다. 데스크톱 전용인 이유는 모바일엔 헤더 바로 아래
                  전용 브레드크럼 줄이 이미 따로 있기 때문(중복 방지). */}
              <div className="mb-6 flex items-center justify-between gap-3">
                <div className="hidden md:block">
                  <Breadcrumb />
                </div>
                {isSubPage && (
                  <Button type="button" variant="ghost" onClick={() => router.back()}>
                    <span>◀</span> {t('sidebar.goBack')}
                  </Button>
                )}
              </div>
              {children}
            </>
          )}
        </main>
      </div>

    </div>
    </GuildsProvider>
  );
}