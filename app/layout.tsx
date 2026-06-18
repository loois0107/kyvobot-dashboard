import { Inter } from 'next/font/google';
import { Providers } from './providers';
import Link from 'next/link';
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
          {/* [수정 1] 모바일은 위아래(flex-col), PC는 좌우(md:flex-row)로 레이아웃 변경 */}
          <div className="flex flex-col md:flex-row min-h-screen font-mono">
            
            {/* [수정 2] 사이드바: 모바일은 상단바(w-full, flex-row), PC는 좌측바(md:w-64, flex-col) */}
            <aside className="w-full md:w-64 bg-[#161626] border-b md:border-b-0 md:border-r border-[#2A1F40] p-4 md:p-6 flex flex-row md:flex-col justify-between items-center md:items-stretch sticky top-0 z-50">
              <div className="flex flex-row md:flex-col items-center md:items-stretch gap-4 md:gap-0 w-full md:w-auto justify-between md:justify-start">
                {/* 타이틀: 모바일에서 크기를 줄이고 하단 마진 제거 */}
                <h2 className="text-sm md:text-xl font-bold text-[#FFD700] tracking-wider mb-0 md:mb-8 whitespace-nowrap">
                  KYVO DASH
                </h2>
                {/* 메뉴: 모바일에서는 가로로 나란히(flex-row), 글씨 살짝 축소 */}
                <nav className="flex flex-row md:flex-col gap-3 md:gap-4 text-xs md:text-sm text-[#57576F]">
                  <Link href="/" className="hover:text-white transition-colors whitespace-nowrap">
                    🏠 Home
                  </Link>
                  <Link href="/leaderboard" className="hover:text-[#FFD700] text-gray-300 font-bold transition-colors whitespace-nowrap">
                    🏆 Leaderboard
                  </Link>
                </nav>
              </div>
              {/* 시스템 정보: 모바일 화면에서는 숨겨서 복잡함 제거 */}
              <div className="hidden md:block text-[10px] text-[#57576F]">
                SYSTEM V2.0.0 // ACTIVE
              </div>
            </aside>

            {/* [수정 3] 메인 영역: w-full 및 overflow-x-hidden으로 모바일 가로 튕김/쏠림 최종 차단 */}
            <main className="flex-1 w-full bg-[#0F0F1A] p-4 md:p-8 overflow-x-hidden">
              {children}
            </main>

          </div>
        </Providers>
      </body>
    </html>
  );
}
