'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/components/Toast'; // 💡 우리가 방금 만든 토스트 엔진 로드
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n';

export function Providers({
  initialLang,
  session,
  children,
}: {
  initialLang: Lang;
  session: Session | null;
  children: React.ReactNode;
}) {
  return (
    // 서버에서 이미 계산해둔 session을 넘겨줘야 useSession()을 쓰는 클라이언트 컴포넌트(Sidebar,
    // LandingHeader)가 첫 렌더부터 로그인 상태를 알 수 있다 - 안 넘기면 hydration 전까지 무조건
    // "비로그인"으로 SSR되고, 그 상태가 그대로 처음 화면에 잠깐 깜빡였다가 뒤늦게 로그인 UI로 바뀐다.
    <SessionProvider session={session}>
      <LanguageProvider initialLang={initialLang}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
