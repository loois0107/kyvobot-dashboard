import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  // 1) Next-Auth 세션 검증
  const session = await auth();
  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  const accessToken = (session as any).accessToken;

  // 2) 디스코드 API로부터 사용자가 가입되어 있는 서버 목록 획득
  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111214] text-red-400 font-mono p-8 text-center">
        ⚠️ 디스코드 서버 목록을 불러오는 데 실패했습니다. 세션을 재연결해 주세요.
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
  
  // 3) 관리 권한(서버 소유주 혹은 MANAGE_GUILD = 0x20 권한 보유자)이 있는 서버만 필터링
  const managed = guilds.filter(
    (g) => g.owner || (BigInt(g.permissions) & BigInt(0x20)) === BigInt(0x20)
  );

  if (managed.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111214] text-gray-400 font-mono p-8 text-center flex-col gap-2">
        <p className="text-lg font-bold text-white">🛡️ Kyvo Control Hub</p>
        <p>봇 관리 권한이 있는 디스코드 서버가 존재하지 않습니다.</p>
      </div>
    );
  }

  // 4) 권한이 있는 첫 번째 서버 대시보드로 초고속 자동 이동!
  redirect(`/dashboard/${managed[0].id}`);
}