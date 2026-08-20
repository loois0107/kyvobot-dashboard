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
  // 🛡️ [1단계 임시 글루 - 본문은 아직 다크 전용] LandingHeader가 이제 useLandingTheme()을 필수로
  // 요구해서(LandingThemeToggle 때문에) 감싸주지 않으면 크래시 난다. 다만 가이드 페이지 본문은
  // 이번 1단계 범위 밖이라 여전히 리터럴 다크 색상 그대로다 - 헤더에서 토글을 눌러도 헤더만
  // 라이트로 바뀌고 본문은 다크로 남는 반쪽짜리 상태가 됨(2단계에서 본문까지 토큰 전환하며 해결).
  const landingTheme = resolveInitialLandingTheme(cookieStore.get(LANDING_THEME_COOKIE_NAME)?.value);

  return (
    <LandingThemeProvider initialTheme={landingTheme}>
    <div className="min-h-screen bg-[#0A0A0B] text-[#F5F5F5] flex flex-col relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-[#5865F2]/25 rounded-full blur-[130px]" />
        <div className="absolute top-64 -right-32 w-[500px] h-[500px] bg-[#2DD4BF]/10 rounded-full blur-[130px]" />
      </div>

      {/* 🛡️ 문서 페이지라 실제 관리 서버 조회가 불필요 - dashboardHref=null로 헤더의 Discord API 호출을 건너뛴다. */}
      <LandingHeader dashboardHref={null} />

      <main className="relative w-full">
        <section className="max-w-3xl mx-auto w-full px-4 pt-20 pb-16 text-center">
          <RevealOnScroll>
            <h1 className="text-4xl md:text-5xl font-black tracking-wide mb-6">
              <span className="bg-gradient-to-r from-white via-[#c7cdfd] to-[#5865F2] bg-clip-text text-transparent">
                {t.guidePage.heroTitle}
              </span>
            </h1>
            <p className="text-base md:text-lg text-[#A1A1AA] leading-relaxed">{t.guidePage.heroDesc}</p>
          </RevealOnScroll>
        </section>

        {GUIDE_CATEGORIES.map((category) => (
          <section key={category.categoryKey} className="max-w-7xl mx-auto w-full px-4 pb-24">
            <RevealOnScroll className="mb-10 text-center">
              <p className="text-xs font-black tracking-widest text-[#5865F2] uppercase mb-3">
                {t.sidebar[category.categoryKey]}
              </p>
              <h2 className="text-2xl md:text-3xl font-black text-[#F5F5F5]">{t.sidebar[category.categoryKey]}</h2>
            </RevealOnScroll>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.items.map((item, i) => (
                <RevealOnScroll key={item.titleKey} delayMs={(i % 3) * 100}>
                  <div className="h-full bg-[#141416] border border-[#676771] rounded-2xl p-6 space-y-3">
                    <h3 className="text-base font-bold text-[#F5F5F5] leading-snug">{t.guidePage[item.titleKey]}</h3>
                    <p className="text-sm text-[#85858B] leading-relaxed">{t.guidePage[item.descKey]}</p>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </section>
        ))}

        <section className="relative flex flex-col items-center w-full px-4 py-24 text-center bg-[#0A0A0B] border-t-4 border-[#676771]">
          <RevealOnScroll className="flex flex-col items-center gap-6 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-[#F5F5F5]">{t.guidePage.ctaTitle}</h2>
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
              <a
                href={BOT_INVITE_URL}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-base font-black px-10 py-4 rounded-full shadow-[0_0_30px_rgba(88,101,242,0.45)] hover:shadow-[0_0_45px_rgba(88,101,242,0.65)] transition-all"
              >
                🤖 {t.landingPage.addBotCta}
              </a>
              <Link
                href="/"
                className="border border-[#5865F2]/40 hover:border-[#5865F2] text-[#A1A1AA] hover:text-[#F5F5F5] text-base font-bold px-10 py-4 rounded-full transition-all"
              >
                {t.landingPage.heroTitle}
              </Link>
            </div>
          </RevealOnScroll>
        </section>
      </main>

      <footer className="relative bg-[#0A0A0B] border-t border-[#676771]/40 py-16 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10">
          <div className="space-y-3 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#5865F2] to-[#4752C4] flex items-center justify-center text-xs font-black text-white">
                K
              </span>
              <span className="text-base font-black text-[#F5F5F5]">{t.landingPage.heroTitle}</span>
            </div>
            <p className="text-xs text-[#85858B]">{t.landingPage.footerTagline}</p>
          </div>
          <div className="space-y-3 text-center sm:text-left">
            <h4 className="text-sm font-bold text-[#F5F5F5]">{t.landingPage.footerQuickLinksHeader}</h4>
            <div className="flex flex-col gap-2">
              <Link href="/#features" className="text-xs text-[#85858B] hover:text-[#F5F5F5] transition-colors">
                {t.landingPage.navFeatures}
              </Link>
              <Link href="/guide" className="text-xs text-[#85858B] hover:text-[#F5F5F5] transition-colors">
                {t.landingPage.navGuide}
              </Link>
            </div>
          </div>
          <div className="space-y-3 text-center sm:text-left">
            <h4 className="text-sm font-bold text-[#F5F5F5]">{t.landingPage.footerLegalHeader}</h4>
            <div className="flex flex-col gap-2">
              <Link href="/privacy" className="text-xs text-[#85858B] hover:text-[#F5F5F5] transition-colors">
                {t.landingPage.footerPrivacy}
              </Link>
              <Link href="/terms" className="text-xs text-[#85858B] hover:text-[#F5F5F5] transition-colors">
                {t.landingPage.footerTerms}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </LandingThemeProvider>
  );
}
