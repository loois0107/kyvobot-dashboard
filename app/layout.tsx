import { Inter } from 'next/font/google';
import { Providers } from './providers';
import Sidebar from '@/components/Sidebar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
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
      <body className={`${inter.className} bg-[#0F0F1A] text-white min-h-screen`}>
        <Providers>
          <div className="flex flex-col md:flex-row min-h-screen font-mono">
            
            {/* 💡 컴포넌트 하나로 레이아웃이 획기적으로 청소됨 */}
            <Sidebar />

            {/* 메인 콘텐츠 출력 영역 */}
            <main className="flex-1 w-full bg-[#0F0F1A] p-4 md:p-8 overflow-x-hidden">
              {children}
            </main>

          </div>
        </Providers>
      </body>
    </html>
  );
}
