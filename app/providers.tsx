'use client';

import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/components/Toast'; // 💡 우리가 방금 만든 토스트 엔진 로드
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n';

export function Providers({ initialLang, children }: { initialLang: Lang; children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider initialLang={initialLang}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
