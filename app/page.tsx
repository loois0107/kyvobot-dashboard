import { cookies } from 'next/headers';
import Link from 'next/link';
import { Gamepad2, Shield, Ticket, Sparkles, Smile, TvMinimalPlay, Palette } from 'lucide-react';
import { auth } from '@/auth';
import { COOKIE_NAME, dictionaries, resolveInitialLanguage } from '@/lib/i18n';
import { LANDING_THEME_COOKIE_NAME, resolveInitialLandingTheme } from '@/lib/theme';
import { LandingThemeProvider } from '@/lib/theme/LandingThemeContext';
import LandingHeader from '@/components/landing/LandingHeader';
import RevealOnScroll from '@/components/landing/RevealOnScroll';
import FeatureScreenshotRow from '@/components/landing/FeatureScreenshotRow';
import DashboardShowcase from '@/components/landing/DashboardShowcase';
import { BOT_INVITE_URL } from '@/lib/botInvite';
import { resolveLocalizedImage } from '@/lib/resolveLocalizedImage';

// 🛡️ hasDetail: true인 3개(파티/AI티켓/레벨링)는 SEE IT IN ACTION에 대응하는 스크린샷 행이
// 있어서 카드 하단에 "자세히 보기" 링크를 붙인다(#see-it-in-action으로 스크롤). 나머지 3개는
// 대응 스크린샷이 없어서 힌트 없이 아이콘 카드로만 충분하다.
// 🛡️ [흑백 톤 정리 - 아이콘 강조색 통일] 카테고리별로 다르던 배지/보더/그림자 색을 전부
// text-secondary 토큰(다크 #A1A1AA/라이트 #52525B)으로 통일했다 - 랜딩이 이제 자체 다크/라이트
// 토글을 갖게 되면서 반응형 토큰 클래스로 전환했다(kyvo_landing_theme, LandingThemeProvider).
// shadow는 예외 - 색이 섞인 box-shadow 다중 값이라 직접 대응하는 토큰이 없어 리터럴
// rgba(161,161,170,...)를 그대로 뒀다(라이트에서는 흐릿해지지만 hover 전용 은은한 효과라
// 깨지는 수준은 아님). PAIN_POINTS도 같은 톤으로 통일했으니(아래), 파티모집/자동관리/AI티켓/레벨링 4쌍의
// "문제(색) -> 기능(같은 색)" 매칭 스토리텔링은 색으로는 더 이상 안 이어진다 - 대신 이모지를
// 대시보드 사이드바와 동일한 lucide 아이콘으로 바꿔서, "같은 모양"으로 여전히 짝이 맞게 했다
// (Gamepad2/Shield/Ticket/Sparkles를 두 섹션에서 각각 재사용).
const FEATURES = [
  {
    titleKey: 'featurePartyTitle',
    descKey: 'featurePartyDesc',
    icon: Gamepad2,
    badgeBg: 'bg-text-secondary/15',
    border: 'hover:border-text-secondary/50',
    shadow: 'hover:shadow-[0_0_25px_rgba(161,161,170,0.25)]',
    hasDetail: true,
  },
  {
    titleKey: 'featureTicketTitle',
    descKey: 'featureTicketDesc',
    icon: Ticket,
    badgeBg: 'bg-text-secondary/15',
    border: 'hover:border-text-secondary/50',
    shadow: 'hover:shadow-[0_0_25px_rgba(161,161,170,0.25)]',
    hasDetail: true,
  },
  {
    titleKey: 'featureLevelingTitle',
    descKey: 'featureLevelingDesc',
    icon: Sparkles,
    badgeBg: 'bg-text-secondary/15',
    border: 'hover:border-text-secondary/50',
    shadow: 'hover:shadow-[0_0_25px_rgba(161,161,170,0.25)]',
    hasDetail: true,
  },
  {
    titleKey: 'featureAutomodTitle',
    descKey: 'featureAutomodDesc',
    icon: Shield,
    badgeBg: 'bg-text-secondary/15',
    border: 'hover:border-text-secondary/50',
    shadow: 'hover:shadow-[0_0_25px_rgba(161,161,170,0.25)]',
    hasDetail: false,
  },
  {
    titleKey: 'featureReactionRolesTitle',
    descKey: 'featureReactionRolesDesc',
    icon: Smile,
    badgeBg: 'bg-text-secondary/15',
    border: 'hover:border-text-secondary/50',
    shadow: 'hover:shadow-[0_0_25px_rgba(161,161,170,0.25)]',
    hasDetail: false,
  },
  {
    titleKey: 'featureTwitchTitle',
    descKey: 'featureTwitchDesc',
    icon: TvMinimalPlay,
    badgeBg: 'bg-text-secondary/15',
    border: 'hover:border-text-secondary/50',
    shadow: 'hover:shadow-[0_0_25px_rgba(161,161,170,0.25)]',
    hasDetail: false,
  },
] as const;

// 🛡️ 아이콘은 아래에서 이 주제를 이어받는 섹션과 맞춰뒀다 - party/ticket/leveling은 SCREENSHOTS의
// 대표 행과, automod는 FEATURES 카드와 - 스크롤을 내렸을 때 "이 고민 -> 저 기능"으로 자연스럽게
// 이어져 보이게 한다(우연이 아니라 의도적 연결). 색은 FEATURES와 동일하게 text-secondary 토큰으로
// 통일 - 원래는 카테고리별 색이 이 연결을 만들었지만, 이제 같은 lucide 아이콘 모양이 그 역할을
// 대신한다.
const PAIN_POINTS = [
  {
    descriptionKey: 'painPointPartyDescription',
    icon: Gamepad2,
    badgeBg: 'bg-text-secondary/15',
    accentText: 'text-text-secondary',
  },
  {
    descriptionKey: 'painPointAutomodDescription',
    icon: Shield,
    badgeBg: 'bg-text-secondary/15',
    accentText: 'text-text-secondary',
  },
  {
    descriptionKey: 'painPointTicketDescription',
    icon: Ticket,
    badgeBg: 'bg-text-secondary/15',
    accentText: 'text-text-secondary',
  },
  {
    descriptionKey: 'painPointLevelingDescription',
    icon: Sparkles,
    badgeBg: 'bg-text-secondary/15',
    accentText: 'text-text-secondary',
  },
] as const;

// 🛡️ [부분 강조] painPoint*Description 문자열 안에 **이렇게** 감싼 구간만 강조색으로 렌더링한다 -
// "문제/해결" 두 필드로 나뉘어 있던 걸 하나의 자연스러운 문단으로 합치면서, 그중 핵심 해결책
// 구절만 골라 색을 입히고 싶어서 만든 경량 마커 문법(마크다운 볼드와 동일 표기, 별도 파서 없이
// split만으로 충분). 번역할 때도 **...**의 위치만 그 언어 문장에 맞게 옮기면 되니 en/ko 양쪽에서
// 그대로 재사용 가능하다.
function renderHighlightedText(text: string, highlightClass: string): React.ReactNode {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className={`font-bold ${highlightClass}`}>
        {part}
      </span>
    ) : (
      part
    )
  );
}

// 🛡️ 대시보드 설정 화면은 이제 별도의 DashboardShowcase 섹션에서 크게 보여주므로 여기서 뺐다 -
// 이 3개는 순수하게 "봇을 실행하면 이렇게 나온다"는 결과물 중심. 랭크카드는 실제 캡처본
// (imageSrc) - 파티/AI티켓은 디스코드 클라이언트 UI라 CDP로 캡처할 수 없어서 기존
// placeholder(futureImageSrc)를 그대로 유지한다.
// 🛡️ 랭크카드(rank-card.png)는 이 배열에서 빠졌다 - "대시보드로 설정 -> 실제 카드 결과"
// 흐름을 만들기 위해 DashboardShowcase 섹션 바로 아래로 옮겼다(RANK_CARD_SHOWCASE 참고).
const SCREENSHOTS = [
  {
    titleKey: 'screenshotPartyTitle',
    descKey: 'screenshotPartyDesc',
    altKey: 'screenshotPartyAlt',
    // 🛡️ FEATURES/PAIN_POINTS와 동일한 이유(위 26번째 줄 주석 참고)로 이모지 대신 사이드바와
    // 같은 lucide 아이콘 재사용 - Coming Soon 자리표시자에서만 실제로 보인다(캡처본이 있으면
    // 이미지로 완전히 대체됨).
    icon: Gamepad2,
    futureImageSrc: '/images/features/party-recruit.png',
    // 🛡️ lang 기반 -ko/-en 파일로 분리 - 둘 다 없으면 resolveLocalizedImage가 undefined를
    // 돌려줘서 "Coming Soon"이 뜬다. 파일만 추가하면 코드 변경 없이 자동으로 노출된다.
    localizedBaseName: 'party-recruit',
    // 🛡️ party-recruit-en.png(502x368)/-ko.png(468x384) 실측 비율 - 둘이 정확히 같진 않지만
    // w-full h-auto가 실제 로드된 파일 크기를 그대로 따라가므로 여기 값은 레이아웃 예약용
    // 근사치면 충분하다(잘리거나 찌그러지지 않음).
    imageWidth: 490,
    imageHeight: 376,
  },
  {
    titleKey: 'screenshotAiTicketTitle',
    descKey: 'screenshotAiTicketDesc',
    altKey: 'screenshotAiTicketAlt',
    icon: Ticket,
    futureImageSrc: '/images/features/ai-ticket.png',
    // 🛡️ party-recruit와 동일한 lang 기반 -ko/-en 폴백 구조로 전환 - ai-ticket-en.png가
    // 추가되면서 더 이상 언어 분기 없는 단일 파일이 아니게 됐다. 기존 ai-ticket.png는
    // ai-ticket-ko.png로 리네임됨(실제 한국어 캡처였음).
    localizedBaseName: 'ai-ticket',
    // 🛡️ ai-ticket-en.png(715x483)/-ko.png(777x476) 실측 비율 - party-recruit와 동일한 이유로
    // 근사치면 충분(실제 렌더는 w-full h-auto가 로드된 파일 크기를 그대로 따라감).
    imageWidth: 746,
    imageHeight: 480,
  },
] as const;

// 🛡️ "SEE IT IN ACTION" 섹션의 마지막 항목 - "설정 화면 -> 실제 카드" 2단 구성이라 SCREENSHOTS
// 배열(항목당 이미지 1장)과 별도로 둔다. 결과물(rank-card-result.png)은 LEVEL/RANK 라벨이
// 하드코딩된 영어라 언어 분기 없이 단일 파일 - 반면 설정 화면(rank-card-setup-{lang}.png)은
// 실제 대시보드 UI 캡처라 party-recruit/ai-ticket과 동일하게 언어별 폴백을 탄다.
const RANK_CARD_SHOWCASE = {
  titleKey: 'screenshotRankCardTitle',
  descKey: 'screenshotRankCardDesc',
  altKey: 'screenshotRankCardAlt',
  setupAltKey: 'screenshotRankCardSetupAlt',
  // 🛡️ 사이드바엔 이 항목과 1:1 대응하는 메뉴가 없어(랭크카드 커스터마이징은 /profile 안에
  // 있음) Gamepad2/Ticket처럼 재사용할 기존 아이콘이 없다 - 색상 커스터마이징 개념과 맞는
  // Palette를 새로 매핑한다.
  icon: Palette,
  futureImageSrc: '/images/features/rank-card-result.png',
  imageSrc: '/images/features/rank-card-result.png',
  imageWidth: 920,
  imageHeight: 240,
  setupLocalizedBaseName: 'rank-card-setup',
  setupFutureImageSrc: '/images/features/rank-card-setup.png',
  // 🛡️ rank-card-setup-en.png/-ko.png 실측(1229x837, 둘이 정확히 같음) - 레이아웃 예약용 근사치일
  // 뿐이지만(w-full h-auto가 실제 로드된 크기를 그대로 따라감), 재캡처 후 실측치로 갱신해둔다.
  setupImageWidth: 1229,
  setupImageHeight: 837,
} as const;

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
  // 🛡️ [랜딩 전용 테마 - 대시보드와 독립] 언어와 동일한 패턴으로 서버에서 미리 계산해서
  // LandingThemeProvider의 초깃값으로 넘긴다(깜빡임 방지) - 대시보드용 kyvo_theme 쿠키가 아니라
  // 별도의 kyvo_landing_theme을 읽으므로, 대시보드에서 뭘 골랐든 이 값에 영향이 없다. 기본값도
  // 반대(쿠키 없으면 light)다.
  const landingTheme = resolveInitialLandingTheme(cookieStore.get(LANDING_THEME_COOKIE_NAME)?.value);

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
      // 🛡️ 어떤 서버로 보낼지(managed[0] 추측)는 더 이상 여기서 결정하지 않는다 - /dashboard
      // 피커 페이지가 목록을 다시 불러와 봇 참여 여부까지 확인한 뒤, 서버가 1개뿐이면 자동으로
      // 넘어가고 여러 개면 직접 고르게 한다. 여기서는 "관리 서버가 있는지"만 판단하면 된다.
      dashboardHref = managed.length > 0 ? '/dashboard' : null;
    }
  }

  return (
    <LandingThemeProvider
      initialTheme={landingTheme}
      className="min-h-screen bg-bg-base text-text-primary flex flex-col relative overflow-hidden"
    >
      <LandingHeader dashboardHref={dashboardHref} />

      <main className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-4 pb-16 gap-6">
        <h1 className="text-4xl md:text-6xl font-black tracking-wide">
          <span className="bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
            {t.landingPage.heroTitle}
          </span>
        </h1>
        <p className="max-w-xl text-base md:text-lg text-text-secondary leading-relaxed">{t.landingPage.heroTagline}</p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
          {!session?.user ? (
            <>
              <a
                href={BOT_INVITE_URL}
                className="bg-[#27272A] hover:bg-[#3F3F46] text-white text-base font-black px-10 py-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.45)] hover:shadow-[0_0_45px_rgba(0,0,0,0.65)] transition-all"
              >
                🤖 {t.landingPage.addBotCta}
              </a>
              <a
                href="/api/auth/signin"
                className="border border-border-default/40 hover:border-border-hover text-text-secondary hover:text-text-primary text-base font-bold px-10 py-4 rounded-xl transition-all"
              >
                {t.landingPage.loginCta}
              </a>
            </>
          ) : dashboardHref ? (
            <Link
              href={dashboardHref}
              className="bg-[#27272A] hover:bg-[#3F3F46] text-white text-base font-black px-10 py-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.45)] hover:shadow-[0_0_45px_rgba(0,0,0,0.65)] transition-all"
            >
              🎛️ {t.landingPage.goToDashboardCta}
            </Link>
          ) : guildFetchFailed ? (
            <p className="text-sm text-danger">{t.landingPage.guildListFailed}</p>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-text-muted">{t.landingPage.noManagedServers}</p>
              <Link
                href="/profile"
                className="bg-[#27272A] hover:bg-[#3F3F46] text-white text-base font-black px-10 py-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.45)] hover:shadow-[0_0_45px_rgba(0,0,0,0.65)] transition-all"
              >
                {t.profilePickerPage.title}
              </Link>
            </div>
          )}
        </div>
      </main>

      <section className="relative min-h-[85vh] flex flex-col justify-center max-w-5xl mx-auto w-full px-4 pb-32">
        <RevealOnScroll className="mb-10 text-center">
          <p className="text-xs font-black tracking-widest text-text-secondary uppercase mb-3">
            {t.landingPage.painPointsEyebrow}
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-text-primary">
            {t.landingPage.painPointsTitle}
          </h2>
        </RevealOnScroll>
        {/* 🛡️ [비대칭 레이아웃] 완벽한 2x2 격자 대신 6컬럼 기준 벤토 배치 - 첫 항목(공감도가
            가장 높은 파티모집 문제)만 한 줄 전체(col-span-6)를 차지하는 "히어로" 카드, 나머지
            3개는 그 아래 한 줄에 균등 분할(col-span-2씩)로 나란히 - 6÷1, 6÷3 둘 다 딱 맞아떨어져
            빈 셀이 안 생긴다. 모바일은 sm: 접두사가 전부 안 걸려서 기존처럼 1열로 쌓이고, 배열
            순서상 히어로가 이미 맨 앞이라 모바일에서도 강조 카드가 자연히 가장 먼저 나온다. */}
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-6">
          {PAIN_POINTS.map((item, i) => {
            const isHero = i === 0;
            return (
              <RevealOnScroll
                key={item.descriptionKey}
                delayMs={i * 120}
                className={isHero ? 'sm:col-span-6' : 'sm:col-span-2'}
              >
                {isHero ? (
                  <div className="h-full bg-bg-surface border border-border-default rounded-2xl p-8 sm:p-10 flex items-start gap-4 sm:gap-6">
                    <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shrink-0 ${item.badgeBg}`}>
                      <item.icon className="w-6 h-6 sm:w-9 sm:h-9 text-text-primary" />
                    </div>
                    <p className="text-sm sm:text-base text-text-muted leading-relaxed">
                      {renderHighlightedText(t.landingPage[item.descriptionKey], item.accentText)}
                    </p>
                  </div>
                ) : (
                  <div className="h-full bg-bg-surface border border-border-default rounded-2xl p-8 flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${item.badgeBg}`}>
                      <item.icon className="w-6 h-6 text-text-primary" />
                    </div>
                    <p className="text-sm text-text-muted leading-relaxed">
                      {renderHighlightedText(t.landingPage[item.descriptionKey], item.accentText)}
                    </p>
                  </div>
                )}
              </RevealOnScroll>
            );
          })}
        </div>
      </section>

      <section id="features" className="relative min-h-[85vh] flex flex-col justify-center max-w-7xl mx-auto w-full px-4 pb-32">
        <RevealOnScroll className="mb-10 text-center">
          <p className="text-xs font-black tracking-widest text-text-secondary uppercase mb-3">
            {t.landingPage.featuresEyebrow}
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-text-primary">
            {t.landingPage.featuresTitle}
          </h2>
        </RevealOnScroll>
        <RevealOnScroll>
          {/* 🛡️ [비대칭 레이아웃] 3열 폭 자체는 그대로 균등 유지(억지로 폭을 다르게 주면 한 줄에
              3개가 어색해짐) - 대신 hasDetail(자세히 보기 링크가 있는 party/ticket/leveling, 배열상
              이미 1행)만 패딩·아이콘·제목을 키워서 콘텐츠가 더 커지게 한다. Grid는 각 행 높이를
              그 행의 가장 큰 셀에 맞춰 자동으로 정하므로, row-span 없이도 1행 전체가 2행보다
              자연히 더 높아진다. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const isEmphasized = feature.hasDetail;
              return (
                <div
                  key={feature.titleKey}
                  className={`bg-bg-surface border rounded-2xl transition-all duration-200 hover:-translate-y-1 ${feature.border} ${feature.shadow} ${
                    isEmphasized ? 'p-10 border-text-secondary/40 space-y-4' : 'p-8 border-border-default space-y-3'
                  }`}
                >
                  {/* 🛡️ 제목 텍스트에서 같은 아이콘을 뺐으니(featurePartyTitle 등) 이 배지는 이제
                      순수 장식이다 - aria-hidden 없이 두면 스크린리더가 "게임패드 아이콘, 파티모집"처럼
                      아이콘 이름과 제목을 중복으로 읽는다. */}
                  <div
                    aria-hidden="true"
                    className={`rounded-full flex items-center justify-center ${feature.badgeBg} ${
                      isEmphasized ? 'w-20 h-20' : 'w-16 h-16'
                    }`}
                  >
                    <feature.icon className={isEmphasized ? 'w-12 h-12 text-text-primary' : 'w-9 h-9 text-text-primary'} />
                  </div>
                  <h3 className={`font-bold text-text-primary ${isEmphasized ? 'text-xl' : 'text-lg'}`}>{t.landingPage[feature.titleKey]}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{t.landingPage[feature.descKey]}</p>
                  {feature.hasDetail && (
                    <a
                      href="#see-it-in-action"
                      className="inline-block text-xs font-bold text-text-secondary hover:text-text-primary transition-colors pt-1"
                    >
                      {t.landingPage.featureDetailHint}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </RevealOnScroll>
      </section>

      <section className="relative min-h-[85vh] flex flex-col justify-center max-w-7xl mx-auto w-full px-4 pb-32">
        <RevealOnScroll>
          <DashboardShowcase
            eyebrow={t.landingPage.dashboardShowcaseEyebrow}
            title={t.landingPage.dashboardShowcaseTitle}
            description={t.landingPage.dashboardShowcaseDesc}
            // 🛡️ 실제 관리자 UI 캡처라 언어에 따라 그림이 달라짐 - lang 버전이 아직 없으면
            // resolveLocalizedImage가 반대 언어 파일로 폴백하므로 깨진 이미지가 뜰 일이 없다.
            // 최종 ?? 은 두 언어 파일이 전부 사라지는(배포 사고급) 극단적 상황에 대비한 타입 안전용.
            imageSrc={resolveLocalizedImage('leveling-dashboard', lang) ?? '/images/features/leveling-dashboard-en.png'}
            // 🛡️ leveling-dashboard-en.png(1630x3443) 실측 비율 - ko 버전(1630x3377)과 정확히
            // 같진 않지만 레이아웃 예약용 근사치면 충분하다(실제 렌더는 w-full h-auto가 로드된
            // 파일 크기를 그대로 따라감).
            imageWidth={1630}
            imageHeight={3443}
          />
        </RevealOnScroll>
      </section>

      <section id="see-it-in-action" className="relative max-w-7xl mx-auto w-full px-4 pb-32 space-y-16">
        <RevealOnScroll className="text-center">
          <p className="text-xs font-black tracking-widest text-text-secondary uppercase mb-3">
            {t.landingPage.screenshotsEyebrow}
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-text-primary">
            {t.landingPage.screenshotsTitle}
          </h2>
        </RevealOnScroll>
        {SCREENSHOTS.map((item, i) => {
          // 🛡️ 이제 이 배열의 모든 항목(party-recruit, ai-ticket)이 lang 기반 -ko/-en 폴백
          // 조회를 거친다 - 둘 다 없으면 undefined가 나와서 "Coming Soon"이 뜬다.
          const resolvedImageSrc = resolveLocalizedImage(item.localizedBaseName, lang);
          return (
            <RevealOnScroll key={item.titleKey} delayMs={i * 120}>
              <FeatureScreenshotRow
                title={t.landingPage[item.titleKey]}
                description={t.landingPage[item.descKey]}
                alt={t.landingPage[item.altKey]}
                icon={item.icon}
                comingSoonLabel={t.landingPage.screenshotComingSoon}
                futureImageSrc={item.futureImageSrc}
                imageSrc={resolvedImageSrc}
                imageWidth={item.imageWidth}
                imageHeight={item.imageHeight}
                reverse={i % 2 === 1}
              />
            </RevealOnScroll>
          );
        })}
        {/* 🛡️ "대시보드로 이렇게 설정한다 -> 실제로 이런 카드가 나온다" 흐름의 마지막 항목 -
            파티모집/AI티켓과 같은 SEE IT IN ACTION 섹션 안, 맨 마지막 자리로 옮겼다. */}
        <RevealOnScroll delayMs={SCREENSHOTS.length * 120}>
          <FeatureScreenshotRow
            title={t.landingPage[RANK_CARD_SHOWCASE.titleKey]}
            description={t.landingPage[RANK_CARD_SHOWCASE.descKey]}
            alt={t.landingPage[RANK_CARD_SHOWCASE.altKey]}
            setupAlt={t.landingPage[RANK_CARD_SHOWCASE.setupAltKey]}
            icon={RANK_CARD_SHOWCASE.icon}
            comingSoonLabel={t.landingPage.screenshotComingSoon}
            futureImageSrc={RANK_CARD_SHOWCASE.futureImageSrc}
            imageSrc={RANK_CARD_SHOWCASE.imageSrc}
            imageWidth={RANK_CARD_SHOWCASE.imageWidth}
            imageHeight={RANK_CARD_SHOWCASE.imageHeight}
            setupImageSrc={resolveLocalizedImage(RANK_CARD_SHOWCASE.setupLocalizedBaseName, lang)}
            setupFutureImageSrc={RANK_CARD_SHOWCASE.setupFutureImageSrc}
            setupImageWidth={RANK_CARD_SHOWCASE.setupImageWidth}
            setupImageHeight={RANK_CARD_SHOWCASE.setupImageHeight}
            reverse={SCREENSHOTS.length % 2 === 1}
          />
        </RevealOnScroll>
      </section>

      <section className="relative min-h-[85vh] flex flex-col justify-center items-center w-full px-4 pb-32 text-center bg-bg-base border-t-4 border-border-default">
        <RevealOnScroll className="flex flex-col items-center gap-6 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-text-primary">{t.landingPage.finalCtaTitle}</h2>
          <p className="max-w-xl text-base md:text-lg text-text-secondary leading-relaxed">{t.landingPage.finalCtaDesc}</p>
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
            <a
              href={BOT_INVITE_URL}
              className="bg-[#27272A] hover:bg-[#3F3F46] text-white text-base font-black px-10 py-4 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.45)] hover:shadow-[0_0_45px_rgba(0,0,0,0.65)] transition-all"
            >
              🤖 {t.landingPage.addBotCta}
            </a>
            <a
              href="/api/auth/signin"
              className="border border-border-default/40 hover:border-border-hover text-text-secondary hover:text-text-primary text-base font-bold px-10 py-4 rounded-full transition-all"
            >
              {t.landingPage.loginCta}
            </a>
          </div>
        </RevealOnScroll>
      </section>

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
              <a href="#features" className="text-xs text-text-muted hover:text-text-primary transition-colors">
                {t.landingPage.navFeatures}
              </a>
              <a href="#see-it-in-action" className="text-xs text-text-muted hover:text-text-primary transition-colors">
                {t.landingPage.screenshotsTitle}
              </a>
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
