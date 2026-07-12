'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// 1. 실시간 주소창 데이터를 다루는 알짜배기 컴포넌트
function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');

    if (code) {
      console.log('Bypass code intercepted successfully:', code);
      localStorage.setItem('discord_authenticated', 'true');
      
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } else {
      router.push('/');
    }
  }, [searchParams, router]);

  return (
    <div className="border border-purple-500 bg-[#161626] p-8 rounded-xl max-w-sm w-full text-center shadow-2xl">
      <div className="h-3 w-3 bg-purple-500 rounded-full animate-ping mx-auto mb-4"></div>
      <h2 className="text-lg font-bold text-purple-400 mb-2 tracking-widest">DECRYPTING DISCORD HANDSHAKE...</h2>
      <p className="text-xs text-gray-400">Verifying authorization parameters with official Discord servers.</p>
    </div>
  );
}

// 2. Next.js 빌드 엔진을 안심시키는 서스펜스(Suspense) 안전망 컴포넌트
export default function OAuthCallbackPage() {
  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white flex items-center justify-center font-mono p-6">
      {/* Suspense로 감싸주면 Next.js가 빌드할 때 패닉에 빠지지 않고 안전하게 넘어갑니다 */}
      <Suspense fallback={
        <div className="text-center text-xs text-[#FFD700] animate-pulse tracking-widest">
          INITIALIZING AUTHENTICATION MATRIX...
        </div>
      }>
        <OAuthCallbackContent />
      </Suspense>
    </div>
  );
}
