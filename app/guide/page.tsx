import { cookies } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/auth';
import { COOKIE_NAME, dictionaries, resolveInitialLanguage } from '@/lib/i18n';
import LandingHeader from '@/components/landing/LandingHeader';
import RevealOnScroll from '@/components/landing/RevealOnScroll';
import { BOT_INVITE_URL } from '@/lib/botInvite';
import { LANDING_THEME_COOKIE_NAME, resolveInitialLandingTheme } from '@/lib/theme';
import { LandingThemeProvider } from '@/lib/theme/LandingThemeContext';

// 🛡️ 대시보드 사이드바와 동일한 4개 카테고리(app/dashboard/[guildId]/layout.tsx 기준)로
// 묶었다 - "밀접한 커맨드는 하나로 묶는다" 원칙에 따라 카지노 게임 6개 -> 1개 항목 등으로
// 압축, 원본 명령어 41개(리프 기준)가 아래 24개 항목 안에 전부 들어간다(사용자에게 별도 체크리스트로 보고).
// /help는 특정 기능이 아니라 "이 항목들을 디스코드 안에서 훑어보는 도구"라 /dashboard와 성격이
// 같다 - 그래서 별도 카테고리를 새로 만들지 않고 /dashboard 바로 앞, 같은 연동&AI지원 카테고리에 둔다.
const GUIDE_CATEGORIES = [
  {
    categoryKey: 'categoryCommunity',
    items: [
      { titleKey: 'guideAutomodTitle', descKey: 'guideAutomodDesc' },
      { titleKey: 'guideWelcomeTitle', descKey: 'guideWelcomeDesc' },
      { titleKey: 'guideVoiceTitle', descKey: 'guideVoiceDesc' },
      { titleKey: 'guideAnonymousReportsTitle', descKey: 'guideAnonymousReportsDesc' },
      { titleKey: 'guideReactionRolesTitle', descKey: 'guideReactionRolesDesc' },
      { titleKey: 'guideCustomCommandsTitle', descKey: 'guideCustomCommandsDesc' },
      { titleKey: 'guideAuditLogsTitle', descKey: 'guideAuditLogsDesc' },
    ],
  },
  {
    categoryKey: 'categoryPartyGames',
    items: [
      { titleKey: 'guidePartyRecruitTitle', descKey: 'guidePartyRecruitDesc' },
      { titleKey: 'guideScrimTitle', descKey: 'guideScrimDesc' },
      { titleKey: 'guideQuickRsvpTitle', descKey: 'guideQuickRsvpDesc' },
      { titleKey: 'guideTierRoleTitle', descKey: 'guideTierRoleDesc' },
      { titleKey: 'guideTierVerifyTitle', descKey: 'guideTierVerifyDesc' },
      { titleKey: 'guidePartyStatsTitle', descKey: 'guidePartyStatsDesc' },
      { titleKey: 'guideGamePresetsTitle', descKey: 'guideGamePresetsDesc' },
      { titleKey: 'guideCs2FlexTitle', descKey: 'guideCs2FlexDesc' },
    ],
  },
  {
    categoryKey: 'categoryEconomy',
    items: [
      { titleKey: 'guideLevelingTitle', descKey: 'guideLevelingDesc' },
      { titleKey: 'guideLeaderboardTitle', descKey: 'guideLeaderboardDesc' },
      { titleKey: 'guideGiveawaysTitle', descKey: 'guideGiveawaysDesc' },
      { titleKey: 'guideCasinoTitle', descKey: 'guideCasinoDesc' },
      { titleKey: 'guideShopTitle', descKey: 'guideShopDesc' },
    ],
  },
  {
    categoryKey: 'categoryIntegrationsAI',
    items: [
      { titleKey: 'guideTwitchTitle', descKey: 'guideTwitchDesc' },
      { titleKey: 'guideAiTicketTitle', descKey: 'guideAiTicketDesc' },
      { titleKey: 'guideHelpTitle', descKey: 'guideHelpDesc' },
      { titleKey: 'guideDashboardTitle', descKey: 'guideDashboardDesc' },
    ],
  },
] as const;

export default async function GuidePage() {
  // 🛡️ [다국어] 랜딩 페이지와 동일하게 서버 컴포넌트라서 쿠키/Discord locale로 사전을 직접 조회한다.
  const cookieStore = await cookies();
  const session = await auth();
  const lang = resolveInitialLanguage(
    cookieStore.get(COOKIE_NAME)?.value,
    (session?.user as any)?.discordLocale
  );
  const t = dictionaries[lang];
  // 🛡️ [2단계 완료 - 본문도 토큰화] 1단계 때는 크래시 방지용 임시 글루였지만, 이제 본문 전체가
  // app/page.tsx와 동일한 토큰/리터럴 예외 규칙을 그대로 따른다 - 토글을 누르면 헤더뿐 아니라
  // 본문까지 함께 라이트/다크로 전환된다.
  const landingTheme = resolveInitialLandingTheme(cookieStore.get(LANDING_THEME_COOKIE_NAME)?.value);

  return (
    <LandingThemeProvider
      initialTheme={landingTheme}
      className="min-h-screen bg-bg-base text-text-primary flex flex-col relative overflow-hidden"
    >
      {/* 🛡️ 히어로 배경 글로우 제거 - app/page.tsx와 동일(랜딩 무채색 정리 범위, 브랜드 블루/민트
          글로우 완전 삭제). */}

      {/* 🛡️ 문서 페이지라 실제 관리 서버 조회가 불필요 - dashboardHref=null로 헤더의 Discord API 호출을 건너뛴다. */}
      <LandingHeader dashboardHref={null} />

      <main className="relative w-full">
        <section className="max-w-3xl mx-auto w-full px-4 pt-20 pb-16 text-center">
          <RevealOnScroll>
            <h1 className="text-4xl md:text-5xl font-black tracking-wide mb-6">
              <span className="bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
                {t.guidePage.heroTitle}
              </span>
            </h1>
            <p className="text-base md:text-lg text-text-secondary leading-relaxed">{t.guidePage.heroDesc}</p>
          </RevealOnScroll>
        </section>

        {GUIDE_CATEGORIES.map((category) => (
          <section key={category.categoryKey} className="max-w-7xl mx-auto w-full px-4 pb-24">
            <RevealOnScroll className="mb-10 text-center">
              <h2 className="text-2xl md:text-3xl font-black text-text-primary">{t.sidebar[category.categoryKey]}</h2>
            </RevealOnScroll>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.items.map((item, i) => (
                <RevealOnScroll key={item.titleKey} delayMs={(i % 3) * 100}>
                  <div className="h-full bg-bg-surface border border-border-default rounded-2xl p-6 space-y-3">
                    <h3 className="text-base font-bold text-text-primary leading-snug">{t.guidePage[item.titleKey]}</h3>
                    <p className="text-sm text-text-muted leading-relaxed">{t.guidePage[item.descKey]}</p>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </section>
        ))}

        <section className="relative flex flex-col items-center w-full px-4 py-24 text-center bg-bg-base border-t-4 border-border-default">
          <RevealOnScroll className="flex flex-col items-center gap-6 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-text-primary">{t.guidePage.ctaTitle}</h2>
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
              <a
                href={BOT_INVITE_URL}
                className="bg-[#27272A] hover:bg-[#3F3F46] text-white text-base font-black px-10 py-4 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.45)] hover:shadow-[0_0_45px_rgba(0,0,0,0.65)] transition-all"
              >
                🤖 {t.landingPage.addBotCta}
              </a>
              <Link
                href="/"
                className="border border-border-default/40 hover:border-border-hover text-text-secondary hover:text-text-primary text-base font-bold px-10 py-4 rounded-full transition-all"
              >
                {t.landingPage.heroTitle}
              </Link>
            </div>
          </RevealOnScroll>
        </section>
      </main>

      <footer className="relative bg-bg-base border-t border-border-default/40 py-16 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10">
          <div className="space-y-3 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#000000] border border-[#FFFFFF] flex items-center justify-center text-xs font-black text-white">
                K
              </span>
              <span className="text-base font-black text-text-primary">{t.landingPage.heroTitle}</span>
            </div>
            <p className="text-xs text-text-muted">{t.landingPage.footerTagline}</p>
          </div>
          <div className="space-y-3 text-center sm:text-left">
            <h4 className="text-sm font-bold text-text-primary">{t.landingPage.footerQuickLinksHeader}</h4>
            <div className="flex flex-col gap-2">
              <Link href="/#features" className="text-xs text-text-muted hover:text-text-primary transition-colors">
                {t.landingPage.navFeatures}
              </Link>
              <Link href="/guide" className="text-xs text-text-muted hover:text-text-primary transition-colors">
                {t.landingPage.navGuide}
              </Link>
            </div>
          </div>
          <div className="space-y-3 text-center sm:text-left">
            <h4 className="text-sm font-bold text-text-primary">{t.landingPage.footerLegalHeader}</h4>
            <div className="flex flex-col gap-2">
              <Link href="/privacy" className="text-xs text-text-muted hover:text-text-primary transition-colors">
                {t.landingPage.footerPrivacy}
              </Link>
              <Link href="/terms" className="text-xs text-text-muted hover:text-text-primary transition-colors">
                {t.landingPage.footerTerms}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </LandingThemeProvider>
  );
}
