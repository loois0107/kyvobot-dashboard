import { cookies } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/auth';
import { COOKIE_NAME, dictionaries, resolveInitialLanguage } from '@/lib/i18n';
import LandingHeader from '@/components/landing/LandingHeader';
import RevealOnScroll from '@/components/landing/RevealOnScroll';
import PartyPreviewCard from '@/components/landing/PartyPreviewCard';
import FeatureScreenshotRow from '@/components/landing/FeatureScreenshotRow';
import RankCardMockup from '@/components/landing/RankCardMockup';
import PartyPresetMockup from '@/components/landing/PartyPresetMockup';
import AiKnowledgeMockup from '@/components/landing/AiKnowledgeMockup';
import { BOT_INVITE_URL } from '@/lib/botInvite';

// 🛡️ 파티/AI티켓/랭크카드(레벨링)는 아래 SCREENSHOTS의 "대표 3+1" 행으로 승격되어 여기서 빠졌다 -
// 같은 내용을 아이콘 카드로 또 보여주면 중복이라 제거함. 여기 남은 3개는 상대적으로 소소해서
// 아이콘 카드 한 줄로 충분한 기능들이다.
const FEATURES = [
  {
    titleKey: 'featureAutomodTitle',
    descKey: 'featureAutomodDesc',
    icon: '🛡️',
    badgeBg: 'bg-red-500/15',
    border: 'hover:border-red-500/50',
    shadow: 'hover:shadow-[0_0_25px_rgba(239,68,68,0.25)]',
  },
  {
    titleKey: 'featureReactionRolesTitle',
    descKey: 'featureReactionRolesDesc',
    icon: '🎭',
    badgeBg: 'bg-[#FFD700]/15',
    border: 'hover:border-[#FFD700]/50',
    shadow: 'hover:shadow-[0_0_25px_rgba(255,215,0,0.25)]',
  },
  {
    titleKey: 'featureTwitchTitle',
    descKey: 'featureTwitchDesc',
    icon: '📺',
    badgeBg: 'bg-[#9146FF]/15',
    border: 'hover:border-[#9146FF]/50',
    shadow: 'hover:shadow-[0_0_25px_rgba(145,70,255,0.25)]',
  },
] as const;

// 🛡️ 아이콘/색은 아래에서 이 주제를 이어받는 섹션과 맞춰뒀다 - party/ticket/leveling은 SCREENSHOTS의
// 대표 행과, automod는 FEATURES 카드와 - 스크롤을 내렸을 때 "이 고민 -> 저 기능"으로 자연스럽게
// 이어져 보이게 한다(우연이 아니라 의도적 연결).
const PAIN_POINTS = [
  {
    problemKey: 'painPointPartyProblem',
    solutionKey: 'painPointPartySolution',
    icon: '🎮',
    badgeBg: 'bg-[#5865F2]/15',
    accentText: 'text-[#5865F2]',
  },
  {
    problemKey: 'painPointAutomodProblem',
    solutionKey: 'painPointAutomodSolution',
    icon: '🛡️',
    badgeBg: 'bg-red-500/15',
    accentText: 'text-red-400',
  },
  {
    problemKey: 'painPointTicketProblem',
    solutionKey: 'painPointTicketSolution',
    icon: '🤖',
    badgeBg: 'bg-purple-500/15',
    accentText: 'text-purple-400',
  },
  {
    problemKey: 'painPointLevelingProblem',
    solutionKey: 'painPointLevelingSolution',
    icon: '📊',
    badgeBg: 'bg-green-500/15',
    accentText: 'text-green-400',
  },
] as const;

// 🛡️ 4개 중 3개는 봇 실행 결과물(파티/AI티켓/랭크카드), 1개는 관리자 대시보드 설정 화면 자체
// (레벨링&이코노미 페이지) - "이 봇은 웹 대시보드로 관리된다"는 걸 텍스트가 아니라 실제 화면으로
// 보여준다. 대시보드 항목을 맨 앞에 둬서 이 섹션에 들어오자마자 그 메시지부터 각인시킨다.
// 랭크카드/대시보드 스크린샷은 실제 캡처본(imageSrc) - 파티/AI티켓은 디스코드 클라이언트 UI라
// CDP로 캡처할 수 없어서 기존 placeholder(futureImageSrc)를 그대로 유지한다.
const SCREENSHOTS = [
  {
    titleKey: 'screenshotDashboardTitle',
    descKey: 'screenshotDashboardDesc',
    icon: '🎛️',
    futureImageSrc: '/images/features/leveling-dashboard.png',
    imageSrc: '/images/features/leveling-dashboard.png',
  },
  {
    titleKey: 'screenshotPartyTitle',
    descKey: 'screenshotPartyDesc',
    icon: '🎮',
    futureImageSrc: '/images/features/party-recruit.png',
  },
  {
    titleKey: 'screenshotAiTicketTitle',
    descKey: 'screenshotAiTicketDesc',
    icon: '🤖',
    futureImageSrc: '/images/features/ai-ticket.png',
  },
  {
    titleKey: 'screenshotRankCardTitle',
    descKey: 'screenshotRankCardDesc',
    icon: '🎨',
    futureImageSrc: '/images/features/rank-card.png',
    imageSrc: '/images/features/rank-card.png',
  },
] as const;

interface DiscordGuild {
  id: string;
  name: string;
  owner: boolean;
  permissions: string;
}

export default async function RootPage() {
  // 🛡️ [다국어] 이 페이지는 서버 컴포넌트라 useT() 훅(클라이언트 Context)을 못 쓴다 - 루트
  // 레이아웃과 동일한 방식으로 쿠키/Discord locale을 직접 계산해서 사전을 바로 조회한다.
  const cookieStore = await cookies();
  const session = await auth();
  const lang = resolveInitialLanguage(
    cookieStore.get(COOKIE_NAME)?.value,
    (session?.user as any)?.discordLocale
  );
  const t = dictionaries[lang];

  // 🛡️ 로그인 여부와 상관없이 항상 이 랜딩 화면을 렌더링한다(더 이상 자동 리다이렉트하지 않음) -
  // 로그인한 유저는 헤더의 아바타 드롭다운이나 히어로의 "내 대시보드로 이동" 버튼으로 스스로
  // 이동을 선택한다. 관리 서버 목록은 그 버튼들의 목적지를 계산하는 용도로만 조회한다.
  let dashboardHref: string | null = null;
  let guildFetchFailed = false;

  if (session?.user) {
    const accessToken = (session as any).accessToken;
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      guildFetchFailed = true;
    } else {
      const guilds: DiscordGuild[] = await res.json();
      // 관리 권한이 있는 서버만 (Server Owner 또는 MANAGE_GUILD = 0x20)
      const managed = guilds.filter(
        (g) => g.owner || (BigInt(g.permissions) & BigInt(0x20)) === BigInt(0x20)
      );
      dashboardHref = managed[0] ? `/dashboard/${managed[0].id}` : null;
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-[#dbdee1] flex flex-col relative overflow-hidden">
      {/* Decorative background glow, spans hero through the preview section so there's no dead space between them */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-[#5865F2]/25 rounded-full blur-[130px]" />
        <div className="absolute top-64 -right-32 w-[500px] h-[500px] bg-[#FFD700]/10 rounded-full blur-[130px]" />
      </div>

      <LandingHeader dashboardHref={dashboardHref} />

      <main className="relative flex-1 flex flex-col items-center justify-center text-center px-4 pt-4 pb-16 gap-6">
        <h1 className="text-4xl md:text-6xl font-black tracking-wide">
          <span className="bg-gradient-to-r from-white via-[#c7cdfd] to-[#5865F2] bg-clip-text text-transparent">
            {t.landingPage.heroTitle}
          </span>
        </h1>
        <p className="max-w-xl text-base md:text-lg text-[#b5bac1] leading-relaxed">{t.landingPage.heroTagline}</p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
          {!session?.user ? (
            <>
              <a
                href={BOT_INVITE_URL}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-base font-black px-10 py-4 rounded-xl shadow-[0_0_30px_rgba(88,101,242,0.45)] hover:shadow-[0_0_45px_rgba(88,101,242,0.65)] transition-all"
              >
                🤖 {t.landingPage.addBotCta}
              </a>
              <a
                href="/api/auth/signin"
                className="border border-[#5865F2]/40 hover:border-[#5865F2] text-[#b5bac1] hover:text-white text-base font-bold px-10 py-4 rounded-xl transition-all"
              >
                {t.landingPage.loginCta}
              </a>
            </>
          ) : dashboardHref ? (
            <Link
              href={dashboardHref}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-base font-black px-10 py-4 rounded-xl shadow-[0_0_30px_rgba(88,101,242,0.45)] hover:shadow-[0_0_45px_rgba(88,101,242,0.65)] transition-all"
            >
              🎛️ {t.landingPage.goToDashboardCta}
            </Link>
          ) : guildFetchFailed ? (
            <p className="text-sm text-red-400">{t.landingPage.guildListFailed}</p>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-[#949ba4]">{t.landingPage.noManagedServers}</p>
              <Link
                href="/profile"
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-base font-black px-10 py-4 rounded-xl shadow-[0_0_30px_rgba(88,101,242,0.45)] hover:shadow-[0_0_45px_rgba(88,101,242,0.65)] transition-all"
              >
                {t.profilePickerPage.title}
              </Link>
            </div>
          )}
        </div>
      </main>

      <section className="relative max-w-5xl mx-auto w-full px-4 pb-32">
        <RevealOnScroll className="mb-10 text-center">
          <p className="text-xs font-black tracking-widest text-[#FFD700] uppercase mb-3">
            {t.landingPage.painPointsTitle}
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-white">
            {t.landingPage.painPointsTitle}
          </h2>
        </RevealOnScroll>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {PAIN_POINTS.map((item, i) => (
            <RevealOnScroll key={item.problemKey} delayMs={i * 120}>
              <div className="h-full bg-[#161626] border border-[#2A1F40] rounded-2xl p-8 space-y-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${item.badgeBg}`}>
                  {item.icon}
                </div>
                <p className="text-sm text-[#949ba4] leading-relaxed">😩 {t.landingPage[item.problemKey]}</p>
                <div className="h-px bg-[#2A1F40]" />
                <p className={`text-sm font-bold leading-relaxed ${item.accentText}`}>✅ {t.landingPage[item.solutionKey]}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section className="relative max-w-4xl mx-auto w-full px-4 pb-32">
        <RevealOnScroll className="flex flex-col items-center gap-5">
          <PartyPreviewCard
            title={t.landingPage.previewCardTitle}
            hostLabel={t.landingPage.previewCardHostLabel}
            hostName={t.landingPage.previewCardHostName}
            slotsLabel={t.landingPage.previewCardSlotsLabel}
            joinCta={t.landingPage.previewCardJoinCta}
          />
        </RevealOnScroll>
      </section>

      <section id="features" className="relative max-w-6xl mx-auto w-full px-4 pb-32">
        <RevealOnScroll className="mb-10 text-center">
          <p className="text-xs font-black tracking-widest text-[#FFD700] uppercase mb-3">
            {t.landingPage.featuresTitle}
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-white">
            {t.landingPage.featuresTitle}
          </h2>
        </RevealOnScroll>
        <RevealOnScroll>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.titleKey}
                className={`bg-[#161626] border border-[#2A1F40] rounded-2xl p-8 space-y-3 transition-all duration-200 hover:-translate-y-1 ${feature.border} ${feature.shadow}`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl ${feature.badgeBg}`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-white">{t.landingPage[feature.titleKey]}</h3>
                <p className="text-sm text-[#949ba4] leading-relaxed">{t.landingPage[feature.descKey]}</p>
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </section>

      <section className="relative max-w-6xl mx-auto w-full px-4 pb-32 space-y-16">
        <RevealOnScroll className="text-center">
          <p className="text-xs font-black tracking-widest text-[#FFD700] uppercase mb-3">
            {t.landingPage.screenshotsTitle}
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-white">
            {t.landingPage.screenshotsTitle}
          </h2>
        </RevealOnScroll>
        {SCREENSHOTS.map((item, i) => (
          <RevealOnScroll key={item.titleKey} delayMs={i * 120}>
            <FeatureScreenshotRow
              title={t.landingPage[item.titleKey]}
              description={t.landingPage[item.descKey]}
              icon={item.icon}
              comingSoonLabel={t.landingPage.screenshotComingSoon}
              futureImageSrc={item.futureImageSrc}
              imageSrc={'imageSrc' in item ? item.imageSrc : undefined}
              reverse={i % 2 === 1}
            />
          </RevealOnScroll>
        ))}
      </section>

      <section className="relative max-w-6xl mx-auto w-full px-4 pb-32">
        <RevealOnScroll className="mb-10 text-center">
          <p className="text-xs font-black tracking-widest text-[#FFD700] uppercase mb-3">
            {t.landingPage.customizationTitle}
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-white">
            {t.landingPage.customizationTitle}
          </h2>
        </RevealOnScroll>
        <RevealOnScroll>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-[#161626] border border-[#2A1F40] rounded-2xl p-8 space-y-4">
              <h3 className="text-lg font-bold text-white">{t.landingPage.customRankCardTitle}</h3>
              <p className="text-sm text-[#949ba4] leading-relaxed">{t.landingPage.customRankCardDesc}</p>
              <RankCardMockup name={t.landingPage.previewCardHostName} />
            </div>
            <div className="bg-[#161626] border border-[#2A1F40] rounded-2xl p-8 space-y-4">
              <h3 className="text-lg font-bold text-white">{t.landingPage.customPartyPresetTitle}</h3>
              <p className="text-sm text-[#949ba4] leading-relaxed">{t.landingPage.customPartyPresetDesc}</p>
              <PartyPresetMockup
                preset1={t.landingPage.customPartyPresetExample1}
                preset2={t.landingPage.customPartyPresetExample2}
              />
            </div>
            <div className="bg-[#161626] border border-[#2A1F40] rounded-2xl p-8 space-y-4">
              <h3 className="text-lg font-bold text-white">{t.landingPage.customAiKnowledgeTitle}</h3>
              <p className="text-sm text-[#949ba4] leading-relaxed">{t.landingPage.customAiKnowledgeDesc}</p>
              <AiKnowledgeMockup
                question={t.landingPage.customAiKnowledgeQuestion}
                answer={t.landingPage.customAiKnowledgeAnswer}
                tag={t.landingPage.customAiKnowledgeTag}
              />
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <footer className="relative border-t border-[#2A1F40] py-6 px-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-[#57576F]">
        <span>{t.landingPage.footerTagline}</span>
        <span className="hidden sm:inline">·</span>
        <Link href="/privacy" className="hover:text-[#5865F2] hover:underline">{t.landingPage.footerPrivacy}</Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-[#5865F2] hover:underline">{t.landingPage.footerTerms}</Link>
      </footer>
    </div>
  );
}
