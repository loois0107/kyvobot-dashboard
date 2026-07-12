'use client';

import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/components/Toast'; // 💡 우리가 방금 만든 토스트 엔진 로드

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
