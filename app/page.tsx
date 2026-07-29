import { cookies } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/auth';
import { COOKIE_NAME, dictionaries, resolveInitialLanguage } from '@/lib/i18n';
import LandingHeader from '@/components/landing/LandingHeader';
import PartyPreviewCard from '@/components/landing/PartyPreviewCard';
import FeatureScreenshotRow from '@/components/landing/FeatureScreenshotRow';
import RankCardMockup from '@/components/landing/RankCardMockup';
import PartyPresetMockup from '@/components/landing/PartyPresetMockup';
import AiKnowledgeMockup from '@/components/landing/AiKnowledgeMockup';

// TODO: set NEXT_PUBLIC_BOT_INVITE_URL in the environment to the real bot invite link
// (client_id + permissions bitfield) - this fallback is a placeholder only.
const BOT_INVITE_URL =
  process.env.NEXT_PUBLIC_BOT_INVITE_URL ||
  'https://discord.com/oauth2/authorize?client_id=REPLACE_WITH_REAL_CLIENT_ID&permissions=8&scope=bot%20applications.commands';

const FEATURES = [
  {
    titleKey: 'featurePartyTitle',
    descKey: 'featurePartyDesc',
    icon: '🎮',
    badgeBg: 'bg-[#5865F2]/15',
    border: 'hover:border-[#5865F2]/50',
    shadow: 'hover:shadow-[0_0_25px_rgba(88,101,242,0.25)]',
  },
  {
    titleKey: 'featureTicketTitle',
    descKey: 'featureTicketDesc',
    icon: '🤖',
    badgeBg: 'bg-purple-500/15',
    border: 'hover:border-purple-500/50',
    shadow: 'hover:shadow-[0_0_25px_rgba(168,85,247,0.25)]',
  },
  {
    titleKey: 'featureLevelingTitle',
    descKey: 'featureLevelingDesc',
    icon: '📊',
    badgeBg: 'bg-green-500/15',
    border: 'hover:border-green-500/50',
    shadow: 'hover:shadow-[0_0_25px_rgba(34,197,94,0.25)]',
  },
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

const SCREENSHOTS = [
  {
    titleKey: 'screenshotPartyTitle',
    descKey: 'screenshotPartyDesc',
    icon: '🎮',
    futureImageSrc: '/images/features/party-recruit.png',
  },
  {
    titleKey: 'screenshotBalancerTitle',
    descKey: 'screenshotBalancerDesc',
    icon: '⚖️',
    futureImageSrc: '/images/features/team-balancer.png',
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
        <p className="max-w-xl text-sm md:text-base text-[#b5bac1] leading-relaxed">{t.landingPage.heroTagline}</p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
          {!session?.user ? (
            <>
              <a
                href={BOT_INVITE_URL}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-black px-8 py-3.5 rounded-xl shadow-[0_0_30px_rgba(88,101,242,0.45)] hover:shadow-[0_0_45px_rgba(88,101,242,0.65)] transition-all"
              >
                🤖 {t.landingPage.addBotCta}
              </a>
              <a
                href="/api/auth/signin"
                className="border border-[#5865F2]/40 hover:border-[#5865F2] text-[#b5bac1] hover:text-white text-sm font-bold px-8 py-3.5 rounded-xl transition-all"
              >
                {t.landingPage.loginCta}
              </a>
            </>
          ) : dashboardHref ? (
            <Link
              href={dashboardHref}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-black px-8 py-3.5 rounded-xl shadow-[0_0_30px_rgba(88,101,242,0.45)] hover:shadow-[0_0_45px_rgba(88,101,242,0.65)] transition-all"
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
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-black px-8 py-3.5 rounded-xl shadow-[0_0_30px_rgba(88,101,242,0.45)] hover:shadow-[0_0_45px_rgba(88,101,242,0.65)] transition-all"
              >
                {t.profilePickerPage.title}
              </Link>
            </div>
          )}
        </div>
      </main>

      <section className="relative max-w-4xl mx-auto w-full px-4 pb-20 flex flex-col items-center gap-5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#5865F2] font-black">
          {t.landingPage.previewLabel}
        </span>
        <PartyPreviewCard
          title={t.landingPage.previewCardTitle}
          hostLabel={t.landingPage.previewCardHostLabel}
          hostName={t.landingPage.previewCardHostName}
          slotsLabel={t.landingPage.previewCardSlotsLabel}
          joinCta={t.landingPage.previewCardJoinCta}
        />
      </section>

      <section className="relative max-w-5xl mx-auto w-full px-4 pb-20">
        <h2 className="text-center text-xs font-black tracking-widest text-[#FFD700] uppercase mb-10">
          {t.landingPage.featuresTitle}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature) => (
            <div
              key={feature.titleKey}
              className={`bg-[#161626] border border-[#2A1F40] rounded-2xl p-6 space-y-3 transition-all duration-200 hover:-translate-y-1 ${feature.border} ${feature.shadow}`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl ${feature.badgeBg}`}>
                {feature.icon}
              </div>
              <h3 className="text-sm font-bold text-white">{t.landingPage[feature.titleKey]}</h3>
              <p className="text-xs text-[#949ba4] leading-relaxed">{t.landingPage[feature.descKey]}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative max-w-6xl mx-auto w-full px-4 pb-20 space-y-16">
        <h2 className="text-center text-xs font-black tracking-widest text-[#FFD700] uppercase">
          {t.landingPage.screenshotsTitle}
        </h2>
        {SCREENSHOTS.map((item, i) => (
          <FeatureScreenshotRow
            key={item.titleKey}
            title={t.landingPage[item.titleKey]}
            description={t.landingPage[item.descKey]}
            icon={item.icon}
            comingSoonLabel={t.landingPage.screenshotComingSoon}
            futureImageSrc={item.futureImageSrc}
            reverse={i % 2 === 1}
          />
        ))}
      </section>

      <section className="relative max-w-5xl mx-auto w-full px-4 pb-20">
        <h2 className="text-center text-xs font-black tracking-widest text-[#FFD700] uppercase mb-10">
          {t.landingPage.customizationTitle}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-[#161626] border border-[#2A1F40] rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">{t.landingPage.customRankCardTitle}</h3>
            <p className="text-xs text-[#949ba4] leading-relaxed">{t.landingPage.customRankCardDesc}</p>
            <RankCardMockup name={t.landingPage.previewCardHostName} />
          </div>
          <div className="bg-[#161626] border border-[#2A1F40] rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">{t.landingPage.customPartyPresetTitle}</h3>
            <p className="text-xs text-[#949ba4] leading-relaxed">{t.landingPage.customPartyPresetDesc}</p>
            <PartyPresetMockup
              preset1={t.landingPage.customPartyPresetExample1}
              preset2={t.landingPage.customPartyPresetExample2}
            />
          </div>
          <div className="bg-[#161626] border border-[#2A1F40] rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">{t.landingPage.customAiKnowledgeTitle}</h3>
            <p className="text-xs text-[#949ba4] leading-relaxed">{t.landingPage.customAiKnowledgeDesc}</p>
            <AiKnowledgeMockup
              question={t.landingPage.customAiKnowledgeQuestion}
              answer={t.landingPage.customAiKnowledgeAnswer}
              tag={t.landingPage.customAiKnowledgeTag}
            />
          </div>
        </div>
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
