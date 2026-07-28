import { cookies } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { COOKIE_NAME, dictionaries, resolveInitialLanguage } from '@/lib/i18n';

const FEATURES = [
  ['featurePartyTitle', 'featurePartyDesc'],
  ['featureTicketTitle', 'featureTicketDesc'],
  ['featureLevelingTitle', 'featureLevelingDesc'],
  ['featureAutomodTitle', 'featureAutomodDesc'],
  ['featureReactionRolesTitle', 'featureReactionRolesDesc'],
  ['featureTwitchTitle', 'featureTwitchDesc'],
] as const;

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

  // 🛡️ 비로그인 방문자는 여기서 랜딩 페이지를 그대로 렌더링한다(리다이렉트하지 않음) - 로그인
  // 유저는 기존 로직(관리 서버 자동 리다이렉트)을 그대로 탄다.
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-[#0F0F1A] text-[#dbdee1] flex flex-col">
        <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 gap-6">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-wide">{t.landingPage.heroTitle}</h1>
          <p className="max-w-xl text-sm md:text-base text-[#b5bac1] leading-relaxed">{t.landingPage.heroTagline}</p>
          <a
            href="/api/auth/signin"
            className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-black px-8 py-3.5 rounded-xl shadow-lg transition-all"
          >
            {t.landingPage.loginCta}
          </a>
        </main>

        <section className="max-w-4xl mx-auto w-full px-4 pb-20">
          <h2 className="text-center text-xs font-black tracking-widest text-[#57576F] uppercase mb-8">
            {t.landingPage.featuresTitle}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(([titleKey, descKey]) => (
              <div key={titleKey} className="bg-[#161626] border border-[#2A1F40] rounded-2xl p-5 space-y-2">
                <h3 className="text-sm font-bold text-white">{t.landingPage[titleKey]}</h3>
                <p className="text-xs text-[#949ba4] leading-relaxed">{t.landingPage[descKey]}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-[#2A1F40] py-6 px-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-[#57576F]">
          <span>{t.landingPage.footerTagline}</span>
          <span className="hidden sm:inline">·</span>
          <Link href="/privacy" className="hover:text-[#5865F2] hover:underline">{t.landingPage.footerPrivacy}</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-[#5865F2] hover:underline">{t.landingPage.footerTerms}</Link>
        </footer>
      </div>
    );
  }

  const accessToken = (session as any).accessToken;

  // 2) Fetch user's joined guild list from Discord API
  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111214] text-red-400 font-mono p-8 text-center">
        {t.landingPage.guildListFailed}
      </div>
    );
  }

  interface DiscordGuild {
    id: string;
    name: string;
    owner: boolean;
    permissions: string;
  }

  const guilds: DiscordGuild[] = await res.json();

  // 3) Filter servers where the user has management permissions (Server Owner or MANAGE_GUILD = 0x20)
  const managed = guilds.filter(
    (g) => g.owner || (BigInt(g.permissions) & BigInt(0x20)) === BigInt(0x20)
  );

  if (managed.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111214] text-gray-400 font-mono p-8 text-center flex-col gap-2">
        <p className="text-lg font-bold text-white">{t.landingPage.controlHubTitle}</p>
        <p>{t.landingPage.noManagedServers}</p>
      </div>
    );
  }

  // 4) Automatically redirect to the first managed server's dashboard!
  redirect(`/dashboard/${managed[0].id}`);
}
