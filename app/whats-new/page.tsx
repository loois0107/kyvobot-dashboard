import Image from 'next/image';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/auth';
import { COOKIE_NAME, dictionaries, resolveInitialLanguage } from '@/lib/i18n';
import LandingHeader from '@/components/landing/LandingHeader';
import RevealOnScroll from '@/components/landing/RevealOnScroll';
import Badge from '@/components/ui/Badge';
import { BOT_INVITE_URL } from '@/lib/botInvite';
import { LANDING_THEME_COOKIE_NAME, resolveInitialLandingTheme } from '@/lib/theme';
import { LandingThemeProvider } from '@/lib/theme/LandingThemeContext';

// 🛡️ [섹션 1은 더 이상 카드 그리드가 아님] 예전엔 "뭐가 달라졌나요"로 section1도 section2와
// 같은 items 카드 그리드였는데, 이번에 "기능 소개"로 톤을 바꾸면서 section1은 설명 문단 +
// 스크린샷으로 구성된 전용 블록(아래 JSX에 직접 하드코딩)으로 바뀌었다. section2(사용 전
// 주의사항)만 여전히 가이드 페이지와 같은 items 카드 그리드 패턴을 쓰므로, 이 배열은 section2
// 전용으로 남긴다.
// 🛡️ [4개 카드 -> 3개로 재구성] "클립당 킬 1개"+"매치 기록이 남는 게임만 가능"(코드로 실제
// 동작 확인 - highlight_err_match_not_found 메시지가 커스텀 게임/연습 모드/AI 상대 대전
// 입문·초급·중급을 명시적으로 막는다는 걸 locales/*.json에서 확인함)을 "이럴 때 주의하세요"
// 한 카드로, "45초 길이 제한"+"녹화 조건"을 "녹화할 때 이렇게 해주세요" 한 카드로 묶었다.
// descKey 내용에 "\n\n"으로 두 사실을 구분해두고, whitespace-pre-line으로 그 줄바꿈만
// 살려서 긴 한 문단이 아니라 짧은 두 문단처럼 보이게 한다.
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
            <Badge variant="warning" className="!text-xs mb-4">
              {t.whatsNewPage.betaBadgeLabel}
            </Badge>
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
            <p className="max-w-3xl mx-auto text-base md:text-lg text-text-secondary leading-relaxed text-center">
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

        {/* 🛡️ [베타 안내 - 섹션 1과 섹션 2 사이] 기능 소개 바로 다음, 주의사항 카드 앞에 둔다 -
            "뭘 하는 기능인지" 알고 난 직후 "아직 다듬는 중"이라는 맥락을 바로 이어 붙여서,
            주의사항 카드(사용 제약)와는 다른 결의 안내(완성도에 대한 기대치 조정)로 구분했다. */}
        <section className="max-w-3xl mx-auto w-full px-4 pb-24">
          <RevealOnScroll className="bg-warning/10 border border-warning/30 rounded-2xl p-6 md:p-8 text-center space-y-2">
            <Badge variant="warning" className="!text-xs">
              {t.whatsNewPage.betaBadgeLabel}
            </Badge>
            <p className="text-sm md:text-base text-text-secondary leading-relaxed">
              {t.whatsNewPage.whatsNewBetaNotice}
            </p>
          </RevealOnScroll>
        </section>

        {/* 🛡️ [섹션 2 - 주의사항, 기존 카드 그리드 유지] 가이드 페이지와 동일한 items 배열 .map
            패턴 - isNew/Badge는 섹션 1 카드 그리드가 사라지면서 같이 제거됐다(이 섹션 항목
            중에는 애초에 isNew가 없었음). */}
        <section className="max-w-7xl mx-auto w-full px-4 pb-24">
          <RevealOnScroll className="mb-10 text-center">
            <h2 className="text-2xl md:text-3xl font-black text-text-primary">
              {t.whatsNewPage[WHATS_NEW_CAVEATS.sectionTitleKey]}
            </h2>
          </RevealOnScroll>
          {/* 🛡️ [카드 높이 - 억지로 안 맞춤] grid 기본값인 align-items:stretch를 items-start로
              덮어쓰고, 카드 div에서도 h-full을 뺐다 - 이제 각 카드는 내용 길이만큼만 자연스럽게
              높이가 생긴다(전엔 가장 긴 카드에 맞춰 짧은 카드까지 억지로 늘어났었음). */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {WHATS_NEW_CAVEATS.items.map((item, i) => (
              <RevealOnScroll key={item.titleKey} delayMs={(i % 3) * 100}>
                <div className="bg-bg-surface border border-border-default rounded-2xl p-6 space-y-3">
                  <h3 className="text-base font-bold text-text-primary leading-snug">
                    {t.whatsNewPage[item.titleKey]}
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">
                    {t.whatsNewPage[item.descKey]}
                  </p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
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
