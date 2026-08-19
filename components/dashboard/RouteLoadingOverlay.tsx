'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const SHOW_DELAY_MS = 150; // never flash for an already-cached/near-instant transition
const MIN_VISIBLE_MS = 300; // once shown, stay long enough to not look like a flicker
const SAFETY_TIMEOUT_MS = 4000; // clear a stuck overlay if the pathname never actually changes
// (navigation cancelled, blocked by a confirm(), etc.) - this is a visual layer only, it must
// never be able to outlive the navigation it's decorating.

// 🛡️ [전역 트리거] 이 오버레이는 대시보드 루트 레이아웃에 딱 하나만 마운트된다 - 사이드바 그룹
// 링크/GroupTabLayout 탭은 평범한 next/link <a>라서 아래 document 클릭 리스너 하나로 전부 잡히고,
// ServerSelect의 서버 전환만 <a>가 아니라 버튼 클릭 → router.push()라서 그 호출부(layout.tsx의
// handleGuildChange)에서 이 함수를 직접 불러야 한다. 컨슈머가 이 오버레이 하나뿐이라 Context
// Provider를 새로 만드는 대신 모듈 스코프 함수 참조로 충분하다 - 마운트 전에 호출되면(있을 수
// 없는 타이밍이지만) 그냥 조용히 무시된다.
let startNavigation: (() => void) | null = null;

export function triggerRouteLoading() {
  startNavigation?.();
}

export default function RouteLoadingOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [skipAnimation, setSkipAnimation] = useState(false);

  const pendingRef = useRef(false);
  const shownAtRef = useRef(0);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSkipAnimation(true);
    }
  }, []);

  useEffect(() => {
    const clearPendingTimers = () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };

    const start = () => {
      // 🛡️ [즉시 전환] 모션을 줄인 유저에게는 블러+스피너 자체가 "전환 효과"라서 아예 안 띄운다 -
      // RevealOnScroll의 prefers-reduced-motion 처리와 같은 원칙.
      if (skipAnimation) return;
      if (pendingRef.current) return; // already mid-transition, don't restart the timers
      pendingRef.current = true;
      clearPendingTimers();
      showTimerRef.current = setTimeout(() => {
        setVisible(true);
        shownAtRef.current = Date.now();
      }, SHOW_DELAY_MS);
      safetyTimerRef.current = setTimeout(() => {
        pendingRef.current = false;
        setVisible(false);
      }, SAFETY_TIMEOUT_MS);
    };

    startNavigation = start;

    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      start();
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      clearPendingTimers();
      if (startNavigation === start) startNavigation = null;
    };
  }, [skipAnimation]);

  // Route actually changed (new page mounted) - clear the pending/visible state, respecting the
  // minimum-visible-time so an already-shown spinner never disappears mid-flicker.
  useEffect(() => {
    if (prevPathnameRef.current === pathname) return;
    prevPathnameRef.current = pathname;
    pendingRef.current = false;
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    setVisible((wasVisible) => {
      if (!wasVisible) return false;
      const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAtRef.current));
      hideTimerRef.current = setTimeout(() => setVisible(false), remaining);
      return wasVisible;
    });
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!visible || skipAnimation) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-base/60 backdrop-blur-sm transition-opacity"
    >
      <Loader2 className="w-10 h-10 text-brand animate-spin" />
    </div>
  );
}
