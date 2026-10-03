import Image from 'next/image';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/auth';
import { COOKIE_NAME, dictionaries, resolveInitialLanguage } from '@/lib/i18n';
import LandingHeader from '@/components/landing/LandingHeader';
import RevealOnScroll from '@/components/landing/RevealOnScroll';
import BetaBadge from '@/components/ui/BetaBadge';
import { BOT_INVITE_URL } from '@/lib/botInvite';
import { LANDING_THEME_COOKIE_NAME, resolveInitialLandingTheme } from '@/lib/theme';
import { LandingThemeProvider } from '@/lib/theme/LandingThemeContext';

// 🛡️ [섹션 1은 더 이상 카드 그리드가 아님] 예전엔 "뭐가 달라졌나요"로 section1도 section2와
// 같은 items 카드 그리드였는데, 이번에 "기능 소개"로 톤을 바꾸면서 section1은 설명 문단 +
// 스크린샷으로 구성된 전용 블록(아래 JSX에 직접 하드코딩)으로 바뀌었다. section2(사용 전
// 주의사항)만 여전히 가이드 페이지와 같은 items 카드 그리드 패턴을 쓰므로, 이 배열은 section2
// 전용으로 남긴다.
// 🛡️ [4개 카드 -> 3개로 재구성] "클립당 킬 1개"+"매치 기록이 남는 게임만 가능"(코드로 실제
// 동작 확인 - highlight_err_match_not_found 메시지가 커스텀 게임/연습 모드/AI 상대 대전을
// 명시적으로 막는다는 걸 locales/*.json에서 확인함)을 "이럴 때 주의하세요" 한 카드로,
// "45초 길이 제한"+"녹화 조건"을 "녹화할 때 이렇게 해주세요" 한 카드로 묶었다. descKey
// 내용에 "\n\n"으로 두 사실을 구분해두고, whitespace-pre-line으로 그 줄바꿈만 살려서
// 긴 한 문단이 아니라 짧은 두 문단처럼 보이게 한다.
// 🛡️ [AI 상대 대전 난이도 명칭 제거] 원래 "(Intro/Beginner/Intermediate)"처럼 구체적인
// 난이도 이름을 영어로 적었는데, 실제 라이엇 공식 자료를 다시 조사해보니 세 번째 난이도가
// "Intermediate"인지 "Advanced"인지 공식 출처(라이엇 개발자 블로그 vs 공식 위키)끼리도
// 서로 다르게 표기하고 있어 확신할 수 없었다 - 틀릴 수 있는 세부 명칭 대신 "Co-op vs. AI
// modes"/"AI 상대 대전"처럼 카테고리만 언급하도록 양쪽 언어 모두 단순화했다.
const WHATS_NEW_CAVEATS = {
  sectionTitleKey: 'section2Title',
  items: [
    { titleKey: 'whatsNewCaveatsTitle', descKey: 'whatsNewCaveatsBody' },
    { titleKey: 'whatsNewRecordingTitle', descKey: 'whatsNewRecordingBody' },
    { titleKey: 'whatsNewLanguageTitle', descKey: 'whatsNewLanguageDesc' },
  ],
} as const;

export default async function WhatsNewPage() {
  // 🛡️ [다국어] 가이드 페이지와 동일 - 서버 컴포넌트라 쿠키/Discord locale로 사전을 직접 조회한다.
  const cookieStore = await cookies();
  const session = await auth();
  const lang = resolveInitialLanguage(
    cookieStore.get(COOKIE_NAME)?.value,
    (session?.user as any)?.discordLocale
  );
  const t = dictionaries[lang];
  const landingTheme = resolveInitialLandingTheme(cookieStore.get(LANDING_THEME_COOKIE_NAME)?.value);

  return (
    <LandingThemeProvider
      initialTheme={landingTheme}
      className="min-h-screen bg-bg-base text-text-primary flex flex-col relative overflow-hidden"
    >
      {/* 🛡️ 문서 페이지라 실제 관리 서버 조회가 불필요 - dashboardHref=null로 헤더의 Discord API 호출을 건너뛴다. */}
      <LandingHeader dashboardHref={null} />

      {/* 🛡️ [글자 단위 줄바꿈 방지 - 한국어만] word-break: keep-all(Tailwind의 break-keep)을
          한국어일 때만 최상위에 걸어둔다 - word-break는 상속 속성이라 여기 한 번만 걸면
          히어로/섹션 제목/본문/카드 문구까지 전부 적용된다. 영어는 공백 단위로 이미 잘
          끊기므로(오히려 break-keep이 영어 긴 단어에서 넘침을 유발할 수 있어) lang==='ko'일
          때만 조건부로 붙인다. */}
      <main className={`relative w-full ${lang === 'ko' ? 'break-keep' : ''}`}>
        <section className="max-w-3xl mx-auto w-full px-4 pt-20 pb-16 text-center">
          <RevealOnScroll>
            <BetaBadge label={t.whatsNewPage.betaBadgeLabel} className="mb-5" />
            <h1 className="text-4xl md:text-5xl font-black tracking-wide mb-6">
              <span className="bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
                {t.whatsNewPage.heroTitle}
              </span>
            </h1>
            <p className="text-base md:text-lg text-text-secondary leading-relaxed">{t.whatsNewPage.heroDesc}</p>
          </RevealOnScroll>
        </section>

        {/* 🛡️ [섹션 1 - 기능 소개, 카드 그리드 아님] 설명 문단 -> 스크린샷(크게) -> 언어 지원
            안내 순서로 쌓는다. 이미지 파일은 실제 /highlight 렌더 결과(1920x804, KR_8380594904
            매치 데이터)이고, 좌우 사이드 패널/시스템 로그/인게임 네임플레이트에 노출됐던 실제
            플레이어 닉네임은 전부 블러 처리된 상태다. FeatureScreenshotRow와 동일한 프레임
            스타일(--showcase-border/--showcase-shadow)을 재사용해 랜딩 전체의 스크린샷 취급을
            통일한다. */}
        <section className="max-w-5xl mx-auto w-full px-4 pb-24">
          <RevealOnScroll className="mb-10 text-center">
            <h2 className="text-2xl md:text-3xl font-black text-text-primary">{t.whatsNewPage.section1Title}</h2>
          </RevealOnScroll>
          <RevealOnScroll className="space-y-8">
            {/* 🛡️ [좁은 안쪽 max-w-3xl 제거] 섹션 컨테이너(max-w-5xl)보다 훨씬 좁은 max-w-3xl로
                한 번 더 가둬놔서, 넓은 화면에서 양옆에 큰 여백만 남고 글자는 좁은 띠에 몰려
                보이는 문제가 있었다 - 바로 아래 스크린샷과 같은 폭(5xl 컨테이너 그대로)까지
                채우도록 안쪽 제약을 없앴다. */}
            <p className="text-base md:text-lg text-text-secondary leading-relaxed text-center">
              {t.whatsNewPage.whatsNewExplainerBody}
            </p>
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border-2 border-[color:var(--showcase-border)] shadow-[var(--showcase-shadow)]">
                <Image
                  src="/images/features/whats-new-highlight.png"
                  alt={t.whatsNewPage.whatsNewScreenshotAlt}
                  width={1920}
                  height={804}
                  className="w-full h-auto block"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                />
              </div>
              <p className="text-sm text-text-muted text-center">{t.whatsNewPage.whatsNewScreenshotCaption}</p>
            </div>
          </RevealOnScroll>
        </section>

        {/* 🛡️ [섹션 2 - 박스 제거 + 가로 정렬(라벨/설명 2단)] 카드(bg/border/rounded) +
            3열 그리드를 걷어낸 자리에, 처음엔 제목-위/본문-아래로 세로 쌓는 리스트를
            썼었는데 그러면 컨테이너를 넓혀도 글자는 여전히 왼쪽 절반에만 몰려 보이는
            문제가 있었다("가로로 정렬해달라"는 피드백) - 각 항목을 제목(왼쪽 고정폭
            라벨)+본문(오른쪽 나머지 폭) 가로 2단으로 바꿔서 넓어진 컨테이너(max-w-6xl)의
            가로 공간을 실제로 채운다. 본문 한 줄 길이 자체는 라벨 폭만큼 줄어들어 전처럼
            과하게 길어지지 않는다. 모바일(sm 미만)에서는 flex-col로 자동으로 다시
            세로 쌓임. */}
        <section className="max-w-6xl mx-auto w-full px-4 pb-24">
          <RevealOnScroll className="mb-10 text-center">
            <h2 className="text-2xl md:text-3xl font-black text-text-primary">
              {t.whatsNewPage[WHATS_NEW_CAVEATS.sectionTitleKey]}
            </h2>
          </RevealOnScroll>
          <div className="divide-y divide-border-default/40 [&>*+*]:pt-8 [&>*]:pb-8">
            {WHATS_NEW_CAVEATS.items.map((item, i) => (
              <RevealOnScroll
                key={item.titleKey}
                delayMs={(i % 3) * 100}
                className="flex flex-col sm:flex-row sm:gap-10"
              >
                <h3 className="sm:w-64 sm:shrink-0 text-lg font-bold text-text-primary leading-snug mb-2 sm:mb-0">
                  {t.whatsNewPage[item.titleKey]}
                </h3>
                <p className="flex-1 text-base text-text-muted leading-relaxed whitespace-pre-line">
                  {t.whatsNewPage[item.descKey]}
                </p>
              </RevealOnScroll>
            ))}
            {/* 🛡️ [사전 조건 항목 - 가이드 링크 포함이라 배열 밖에 별도 렌더] 쿨다운/용량/사전
                설정(서버 지역+본인 인증)을 묶은 네 번째 항목. 나머지 세 항목과 달리 안내
                링크(/guide)가 섞여 있어서 순수 문자열 하나로 표현할 수 없어, 위 items 배열에
                넣지 않고 같은 라벨/본문 2단 구조를 직접 반복한다. /guide 페이지에 서버 지역
                설정+본인 인증을 함께 설명하는 항목(guideTierVerifyTitle/Desc)이 실제로
                존재하는 것을 확인했다 - 섹션별 anchor id는 없어서 페이지 전체 링크로
                연결한다.*/}
            <RevealOnScroll delayMs={300} className="flex flex-col sm:flex-row sm:gap-10">
              <h3 className="sm:w-64 sm:shrink-0 text-lg font-bold text-text-primary leading-snug mb-2 sm:mb-0">
                {t.whatsNewPage.whatsNewPrereqTitle}
              </h3>
              <div className="flex-1">
                <p className="text-base text-text-muted leading-relaxed whitespace-pre-line">
                  {t.whatsNewPage.whatsNewPrereqBody}
                </p>
                <Link
                  href="/guide"
                  className="inline-block mt-2 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors"
                >
                  {t.whatsNewPage.whatsNewPrereqLinkLabel} →
                </Link>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        {/* 🛡️ [베타 안내 - 섹션 2 뒤로 이동] 원래는 섹션 1 바로 뒤(주의사항보다 먼저)였는데,
            "사용 전 꼭 알아두세요를 다 본 다음에 보게 해달라"는 피드백으로 섹션 2 뒤로
            옮겼다 - 구체적인 사용 제약을 다 읽은 다음에 "아직 베타라 다듬는 중"이라는
            기대치 조정 멘트가 와야 자연스럽다는 취지. 배지(BetaBadge)도 같이 뺐다 - 바로
            위 히어로에 이미 베타 배지가 있어서 중복이었다는 피드백. */}
        <section className="max-w-3xl mx-auto w-full px-4 pb-24">
          <RevealOnScroll className="bg-warning/10 border border-warning/30 rounded-2xl p-6 md:p-8 text-center">
            <p className="text-sm md:text-base text-text-secondary leading-relaxed">
              {t.whatsNewPage.whatsNewBetaNotice}
            </p>
          </RevealOnScroll>
        </section>

        <section className="relative flex flex-col items-center w-full px-4 py-24 text-center bg-bg-base border-t-4 border-border-default">
          <RevealOnScroll className="flex flex-col items-center gap-6 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-text-primary">{t.whatsNewPage.ctaTitle}</h2>
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
            <p className="text-sm text-text-muted mt-4">{t.whatsNewPage.whatsNewMoreGamesTeaser}</p>
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
