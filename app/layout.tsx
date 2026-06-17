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
          <div className="flex min-h-screen font-mono">
            
            <aside className="w-64 bg-[#161626] border-r border-[#2A1F40] p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#FFD700] tracking-wider mb-8">
                  KYVO DASHBOARD
                </h2>
                <nav className="flex flex-col gap-4 text-sm text-[#57576F]">
                  <Link href="/" className="hover:text-white transition-colors">
                    🏠 Home Terminal
                  </Link>
                  <Link href="/leaderboard" className="hover:text-[#FFD700] text-gray-300 font-bold transition-colors">
                    🏆 Capital Leaderboard
                  </Link>
                </nav>
              </div>
              <div className="text-[10px] text-[#57576F]">
                SYSTEM V2.0.0 // ACTIVE
              </div>
            </aside>

            <main className="flex-1 bg-[#0F0F1A]">
              {children}
            </main>

          </div>
        </Providers>
      </body>
    </html>
  );
}
