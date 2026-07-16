import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  // 1) Next-Auth Session Verification
  const session = await auth();
  if (!session?.user) {
    redirect('/api/auth/signin');
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
        ⚠️ Failed to load your Discord server list. Please re-authenticate your session.
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
        <p className="text-lg font-bold text-white">🛡️ Kyvo Control Hub</p>
        <p>No Discord servers found where you have management permissions.</p>
      </div>
    );
  }

  // 4) Automatically redirect to the first managed server's dashboard!
  redirect(`/dashboard/${managed[0].id}`);
}