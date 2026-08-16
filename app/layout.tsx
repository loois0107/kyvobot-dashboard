import { cookies } from 'next/headers';
import { Inter } from 'next/font/google';
import { auth } from '@/auth';
import { Providers } from './providers';
import { COOKIE_NAME, resolveInitialLanguage } from '@/lib/i18n';
import { THEME_COOKIE_NAME, resolveInitialTheme } from '@/lib/theme';
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
  // 🛡️ [다크/라이트] 같은 이유로 테마도 서버에서 미리 계산해서 <html data-theme>에 SSR로 반영한다
  // - 토글은 관리자 대시보드 헤더에만 있지만(기본값은 항상 dark), 쿠키 자체는 앱 전역에서 읽는 게
  // 언어와 같은 구조라 여기서 처리한다. app/globals.css의 [data-theme="light"] 블록이 이 속성을
  // 보고 CSS 변수를 오버라이드한다.
  const initialTheme = resolveInitialTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <html lang={initialLang} data-theme={initialTheme}>
      <body className={`${inter.className} bg-bg-base text-text-primary min-h-screen`}>
        <Providers initialLang={initialLang} initialTheme={initialTheme} session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
