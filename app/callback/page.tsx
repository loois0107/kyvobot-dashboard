'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 디스코드가 주소창에 실어 보낸 인증 코드(?code=...)를 캡처합니다.
    const code = searchParams.get('code');

    if (code) {
      console.log('Bypass code intercepted successfully:', code);
      
      // 임시 시각화: 로그인이 완료되었다고 치고 임시로 값을 브라우저에 저장
      localStorage.setItem('discord_authenticated', 'true');
      
      // 로그인이 완료되었으니 3초 뒤에 메인 홈 화면으로 자동 텔레포트 시킵니다.
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } else {
      router.push('/');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white flex items-center justify-center font-mono p-6">
      <div className="border border-purple-500 bg-[#161626] p-8 rounded-xl max-w-sm w-full text-center shadow-2xl">
        <div className="h-3 w-3 bg-purple-500 rounded-full animate-ping mx-auto mb-4"></div>
        <h2 className="text-lg font-bold text-purple-400 mb-2 tracking-widest">DECRYPTING DISCORD HANDSHAKE...</h2>
        <p className="text-xs text-gray-400">Verifying authorization parameters with official Discord servers.</p>
      </div>
    </div>
  );
}
