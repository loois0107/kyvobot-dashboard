import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { COOKIE_NAME, dictionaries, resolveInitialLanguage } from '@/lib/i18n';

export default async function RootPage() {
  // 🛡️ [다국어] 이 페이지는 서버 컴포넌트라 useT() 훅(클라이언트 Context)을 못 쓴다 - 루트
  // 레이아웃과 동일한 방식으로 쿠키/Discord locale을 직접 계산해서 사전을 바로 조회한다.
  const cookieStore = await cookies();

  // 1) Next-Auth Session Verification
  const session = await auth();
  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  const lang = resolveInitialLanguage(cookieStore.get(COOKIE_NAME)?.value, (session.user as any)?.discordLocale);
  const t = dictionaries[lang];

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