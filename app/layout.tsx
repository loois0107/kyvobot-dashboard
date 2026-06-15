import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers'; // 방금 만든 프로바이더를 불러옵니다.
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'KyvoBot Dashboard',
  description: 'Manage your KyvoBot server',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Providers로 감싸주어 빌드 시 useSession 에러를 완전히 방지합니다. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
