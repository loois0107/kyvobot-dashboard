import { cookies } from 'next/headers';
import { Inter } from 'next/font/google';
import { auth } from '@/auth';
import { Providers } from './providers';
import { COOKIE_NAME, resolveInitialLanguage } from '@/lib/i18n';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'KyvoBot Dashboard',
  description: 'Manage your KyvoBot server',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 🛡️ [다국어] 초기 언어를 서버에서 미리 계산해서 내려준다 - 클라이언트에서 useEffect로
  // 뒤늦게 쿠키/Discord locale을 읽어 리렌더링하면 첫 화면이 잠깐 영어로 보이는 깜빡임(FOUC)과
  // hydration mismatch 위험이 생긴다. 쿠키(유저가 직접 고른 값) -> Discord 계정 locale -> 영어 순.
  const cookieStore = await cookies();
  const session = await auth();
  const initialLang = resolveInitialLanguage(
    cookieStore.get(COOKIE_NAME)?.value,
    (session?.user as any)?.discordLocale
  );

  return (
    <html lang={initialLang}>
      <body className={`${inter.className} bg-[#0F0F1A] text-white min-h-screen`}>
        <Providers initialLang={initialLang} session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
