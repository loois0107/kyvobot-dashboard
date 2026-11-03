import fs from 'node:fs';
import path from 'node:path';
import Image from 'next/image';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';
import { auth } from '@/auth';
import { COOKIE_NAME, dictionaries, resolveInitialLanguage } from '@/lib/i18n';
import LandingHeader from '@/components/landing/LandingHeader';
import RevealOnScroll from '@/components/landing/RevealOnScroll';
import { BOT_INVITE_URL } from '@/lib/botInvite';
import { LANDING_THEME_COOKIE_NAME, resolveInitialLandingTheme } from '@/lib/theme';
import { LandingThemeProvider } from '@/lib/theme/LandingThemeContext';

// 🛡️ [아직 캡처 안 된 이미지 - "Coming Soon" 처리] lib/resolveLocalizedImage.ts와 동일한
// fs.existsSync 패턴 - public/images/features/brawl-spike/에 파일이 실제로 있는지 요청
// 시점에 확인해서, 없으면 깨진 <img> 대신 플레이스홀더를 보여준다. screenshot-mainmenu.png는
// 아직 전달받지 못해 현재는 이 경로를 탄다 - 파일만 넣으면 코드 변경 없이 자동으로 노출된다.
function imageExists(publicRelativePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), 'public', publicRelativePath));
}

// 🛡️ [히어로 이미지 - 갤러리에서 분리] 메인 화면 캡처는 더 이상 "인게임 스크린샷" 갤러리에
//안 들어간다 - 히어로 바로 아래, 설명 캡션 없이 큰 단독 이미지로 쓴다(요청대로).
const HERO_IMAGE = {
  src: '/images/features/brawl-spike/screenshot-mainmenu.png',
  altKey: 'screenshotMainMenuAlt',
  width: 1953,
  height: 1272,
} as const;

// 🛡️ app/page.tsx의 FEATURES/SCREENSHOTS와 같은 자리(public/images/features/) 아래,
// 봇 기능 캡처와는 구분되는 brawl-spike/ 하위 폴더에 둔다(브랜드 캐릭터 이미지도 같은 패턴으로
// features/brand/에 분리돼 있음). 게임 화면이라 언어별 UI 텍스트가 안 섞여 있어 -en/-ko 분기
// 없이 파일 하나로 재사용한다. width/height는 실제 캡처본 실측치(레이아웃 예약용 근사치면
// 충분 - w-full h-auto가 로드된 크기를 그대로 따라감).
const SCREENSHOTS = [
  { src: '/images/features/brawl-spike/screenshot-arena-classic.png', altKey: 'screenshotArenaClassicAlt', captionKey: 'screenshotArenaClassicCaption', width: 1966, height: 1247 },
  { src: '/images/features/brawl-spike/screenshot-arena-constellation.png', altKey: 'screenshotArenaConstellationAlt', captionKey: 'screenshotArenaConstellationCaption', width: 1967, height: 1286 },
] as const;

// 🛡️ [무기 이름 비노출] 요청대로 이 섹션에서는 어떤 이미지가 어떤 희귀 무기인지 밝히지 않는다 -
// alt/caption 전부 "예시 N"처럼 일반화된 문구만 쓴다(무기 이름/스펙은 위 소개 문단에서만 언급).
const CUTSCENES = [
  { src: '/images/features/brawl-spike/cutscene-voidriftblade.png', altKey: 'cutsceneAlt1', captionKey: 'cutsceneCaption1', width: 1907, height: 1051 },
  { src: '/images/features/brawl-spike/cutscene-stasis.png', altKey: 'cutsceneAlt2', captionKey: 'cutsceneCaption2', width: 1799, height: 1003 },
  { src: '/images/features/brawl-spike/cutscene-lumenbronte.png', altKey: 'cutsceneAlt3', captionKey: 'cutsceneCaption3', width: 1928, height: 1082 },
] as const;

export default async function BrawlSpikePage() {
  // 🛡️ [다국어/테마] app/whats-new/page.tsx와 동일한 패턴 - 서버 컴포넌트라 쿠키/Discord
  // locale로 사전을 직접 조회하고, 랜딩 전용 테마도 같은 방식으로 초깃값을 미리 계산한다.
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
      className="min-h-screen bg-bg-base text-text-primary flex flex-col relative"
    >
      {/* 🛡️ 문서/소개 페이지라 실제 관리 서버 조회가 불필요 - dashboardHref=null로 헤더의 Discord API 호출을 건너뛴다. */}
      <LandingHeader dashboardHref={null} />

      <main className={`relative w-full ${lang === 'ko' ? 'break-keep' : ''}`}>
        <section className="max-w-3xl mx-auto w-full px-4 pt-20 pb-24 text-center">
          <RevealOnScroll>
            {/* 🛡️ 메인 화면 미니게임 카드와 같은 눈에 띄는 프리픽스 문구(landingPage.miniGameEyebrow)를
                그대로 재사용해서, 카드 -> 이 페이지로 넘어왔을 때 같은 톤이라는 걸 바로 알 수 있게 한다. */}
            <p className="text-sm md:text-base font-black tracking-widest text-text-primary mb-3">
              {t.landingPage.miniGameEyebrow}
            </p>
            <h1 className="text-4xl md:text-5xl font-black tracking-wide mb-6">
              <span className="bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
                {t.brawlSpikePage.heroTitle}
              </span>
            </h1>
            <p className="text-base md:text-lg text-text-secondary leading-relaxed">{t.brawlSpikePage.heroDesc}</p>
          </RevealOnScroll>
        </section>

        {/* 🛡️ 히어로 이미지 - 설명 캡션 없이 단독으로 크게(요청대로) */}
        <section className="max-w-6xl mx-auto w-full px-4 pb-24">
          <RevealOnScroll>
            {imageExists(HERO_IMAGE.src) ? (
              <div className="rounded-2xl overflow-hidden border-2 border-[color:var(--showcase-border)] shadow-[var(--showcase-shadow)]">
                <Image
                  src={HERO_IMAGE.src}
                  alt={t.brawlSpikePage[HERO_IMAGE.altKey]}
                  width={HERO_IMAGE.width}
                  height={HERO_IMAGE.height}
                  priority
                  className="w-full h-auto block"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                />
              </div>
            ) : (
              <div className="aspect-[16/9] rounded-2xl bg-bg-surface border border-border-default flex flex-col items-center justify-center gap-3">
                <Gamepad2 className="w-12 h-12 text-text-primary opacity-60" aria-hidden="true" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                  {t.landingPage.screenshotComingSoon}
                </span>
              </div>
            )}
          </RevealOnScroll>
        </section>

        {/* 게임 소개 */}
        <section className="max-w-5xl mx-auto w-full px-4 pb-64">
          <RevealOnScroll className="mb-10 text-center">
            <h2 className="text-2xl md:text-3xl font-black text-text-primary">{t.brawlSpikePage.section1Title}</h2>
          </RevealOnScroll>
          <RevealOnScroll className="space-y-4">
            <p className="text-base md:text-lg text-text-secondary leading-relaxed text-center">{t.brawlSpikePage.introBody1}</p>
            <p className="text-base md:text-lg text-text-secondary leading-relaxed text-center">{t.brawlSpikePage.introBody2}</p>
          </RevealOnScroll>
        </section>

        {/* 🛡️ [인게임 스크린샷 - 세로로 쌓아서 크게] 3열 그리드였을 때 한 장당 폭이 너무 좁아져
            "거의 안 보이는 수준"이라는 피드백을 받았다 - 그리드 대신 세로로 큼직하게 한 장씩
            쌓아서(컨테이너 전체 폭 그대로) 각 장면이 실제로 눈에 들어오게 한다. */}
        <section className="max-w-6xl mx-auto w-full px-4 pb-64">
          <RevealOnScroll className="mb-10 text-center">
            <h2 className="text-2xl md:text-3xl font-black text-text-primary">{t.brawlSpikePage.section2Title}</h2>
          </RevealOnScroll>
          <div className="space-y-10">
            {SCREENSHOTS.map((item, i) => (
              <RevealOnScroll key={item.src} delayMs={i * 100} className="space-y-3">
                {/* 🛡️ DashboardShowcase/FeatureScreenshotRow와 동일한 중립 프레임
                    (--showcase-border/--showcase-shadow)으로 감싸서 랜딩 전체의 스크린샷 취급을 통일한다. */}
                {imageExists(item.src) ? (
                  <div className="rounded-2xl overflow-hidden border-2 border-[color:var(--showcase-border)] shadow-[var(--showcase-shadow)]">
                    <Image
                      src={item.src}
                      alt={t.brawlSpikePage[item.altKey]}
                      width={item.width}
                      height={item.height}
                      className="w-full h-auto block"
                      sizes="(max-width: 1024px) 100vw, 1024px"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] rounded-2xl bg-bg-surface border border-border-default flex flex-col items-center justify-center gap-3">
                    <Gamepad2 className="w-12 h-12 text-text-primary opacity-60" aria-hidden="true" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                      {t.landingPage.screenshotComingSoon}
                    </span>
                  </div>
                )}
                <p className="text-sm text-text-muted text-center">{t.brawlSpikePage[item.captionKey]}</p>
              </RevealOnScroll>
            ))}
          </div>
        </section>

        {/* 🛡️ 각성 컷신 - 무기 이름/스펙 비노출, 연출 예시로만 제시. 스크린샷 섹션과 동일한
            이유로 세로로 쌓아서 크게 보여준다. */}
        <section className="max-w-6xl mx-auto w-full px-4 pb-64">
          <RevealOnScroll className="mb-10 text-center">
            <h2 className="text-2xl md:text-3xl font-black text-text-primary">{t.brawlSpikePage.section3Title}</h2>
            <p className="mt-3 text-base text-text-secondary leading-relaxed max-w-2xl mx-auto">
              {t.brawlSpikePage.cutsceneIntro}
            </p>
          </RevealOnScroll>
          <div className="space-y-10">
            {CUTSCENES.map((item, i) => (
              <RevealOnScroll key={item.src} delayMs={i * 100} className="space-y-3">
                {imageExists(item.src) ? (
                  <div className="rounded-2xl overflow-hidden border-2 border-[color:var(--showcase-border)] shadow-[var(--showcase-shadow)]">
                    <Image
                      src={item.src}
                      alt={t.brawlSpikePage[item.altKey]}
                      width={item.width}
                      height={item.height}
                      className="w-full h-auto block"
                      sizes="(max-width: 1024px) 100vw, 1024px"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] rounded-2xl bg-bg-surface border border-border-default flex flex-col items-center justify-center gap-3">
                    <Gamepad2 className="w-12 h-12 text-text-primary opacity-60" aria-hidden="true" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                      {t.landingPage.screenshotComingSoon}
                    </span>
                  </div>
                )}
                <p className="text-sm text-text-muted text-center">{t.brawlSpikePage[item.captionKey]}</p>
              </RevealOnScroll>
            ))}
          </div>
        </section>

        {/* CTA - /moa로 바로 시작 안내 */}
        <section className="relative flex flex-col items-center w-full px-4 py-24 text-center bg-bg-base border-t-4 border-border-default">
          <RevealOnScroll className="flex flex-col items-center gap-6 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-text-primary">{t.brawlSpikePage.ctaTitle}</h2>
            <p className="max-w-xl text-base md:text-lg text-text-secondary leading-relaxed">{t.brawlSpikePage.ctaDesc}</p>
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
              <a
                href={BOT_INVITE_URL}
                className="bg-brand hover:bg-brand-hover text-white text-base font-black px-10 py-4 rounded-full shadow-[var(--cta-shadow)] hover:shadow-[var(--cta-shadow-hover)] transition-all"
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
