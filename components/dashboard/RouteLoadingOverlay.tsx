'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// 🛡️ [의도적 재조정] 원래는 표시 지연(SHOW_DELAY_MS) 타이머를 뒀었는데, 프리페치된 전환은 그
// 타이머가 fire하기도 전에 pathname이 바뀌어버려서 오버레이가 아예 안 뜨는 레이스가 있었다.
// "정확한 로딩 상태 표시"가 아니라 "전환마다 일관된 부드러움"이 목적으로 바뀌었으니, 지연
// 타이머 자체를 없애고 setVisible(true)를 동기적으로 호출한다.
const MIN_VISIBLE_MS = 400; // 500ms를 넘기면 답답하게 느껴질 수 있어 그 밑으로 유지
const SAFETY_TIMEOUT_MS = 4000; // clear a stuck overlay if the pathname never actually changes
// (navigation cancelled, blocked by a confirm(), etc.) - this is a visual layer only, it must
// never be able to outlive the navigation it's decorating.

// 🛡️ [모듈 스코프 상태 - 리마운트 생존] 서버 전환(ServerSelect → router.push)은 대시보드
// [guildId] 레이아웃 자체를 리마운트시킨다는 걸 라이브 테스트로 확인했다(사이드바 그룹/탭
// 전환은 같은 guildId 안에서 움직이니 안 그런다) - 리마운트되면 useState/useRef로 들고 있던
// "언제부터 보여주고 있었나"가 통째로 초기화돼서 최소 표시 시간 보장이 깨진다. pendingSince를
// 컴포넌트 밖(모듈 스코프)에 두면 새로 마운트된 인스턴스도 이어받을 수 있다.
let pendingSince: number | null = null;
let notifyMounted: (() => void) | null = null;

export function triggerRouteLoading() {
  pendingSince = Date.now();
  notifyMounted?.();
}

export default function RouteLoadingOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [skipAnimation, setSkipAnimation] = useState(false);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSkipAnimation(true);
    }
  }, []);

  useEffect(() => {
    // 🛡️ [pendingSince는 타이머가 "실제로 fire했을 때"만 지움] React 18 dev Strict Mode는
    // 이 effect를 mount→cleanup→mount로 두 번 돌린다 - 첫 번째 pass가 예약한 hideTimer를
    // cleanup이 취소해버리는데, 그 자리에서 pendingSince까지 null 처리해버리면 두 번째 pass는
    // "예약할 게 없다"고 오판해서 오버레이가 안 사라지는 버그가 실제로 있었다(서버 전환의
    // 리마운트와 겹쳐서 1초 넘게 안 사라짐을 실측). pendingSince는 hideTimer 콜백이 진짜 실행될
    // 때만 지운다 - 중간에 몇 번을 취소당하든 마지막까지 살아남는 pass가 항상 남은 시간을 다시
    // 계산해서 재예약하므로 결국엔 정확히 사라진다.
    const scheduleHide = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (pendingSince === null) return;
      const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - pendingSince));
      hideTimerRef.current = setTimeout(() => {
        pendingSince = null;
        setVisible(false);
      }, remaining);
    };

    const armSafetyTimeout = () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = setTimeout(() => {
        pendingSince = null;
        setVisible(false);
      }, SAFETY_TIMEOUT_MS);
    };

    const showNow = () => {
      // 🛡️ [즉시 전환] 모션을 줄인 유저에게는 블러+스피너 자체가 "전환 효과"라서 아예 안 띄운다 -
      // RevealOnScroll의 prefers-reduced-motion 처리와 같은 원칙.
      if (skipAnimation) return;
      setVisible(true);
      armSafetyTimeout();
      scheduleHide();
    };

    notifyMounted = showNow;

    // 🛡️ [리마운트로 넘어온 진행 중인 전환 이어받기] 이 인스턴스가 마운트된 시점에 이미
    // pendingSince가 있다면(=서버 전환처럼 트리거 직후 컴포넌트가 리마운트된 경우) 바로
    // 이어받는다 - usePathname()이 이미 목적지로 바뀐 채로 시작하니 아래 pathname 변경 감지
    // effect는 다시 fire하지 않는다.
    if (pendingSince !== null) showNow();

    const handleClick = (e: MouseEvent) => {
      // 🛡️ [defaultPrevented 체크 안 함] next/link는 클라이언트 라우팅을 위해 항상 자기
      // 클릭 핸들러에서 e.preventDefault()를 먼저 호출한다 - 그게 정상 동작이지 "이미 다른
      // 핸들러가 처리했으니 건너뛰라"는 신호가 아니다. 여기서 defaultPrevented를 걸렀더니
      // 모든 Link 클릭이 무조건 걸러져서 오버레이가 전혀 안 뜨는 버그가 실제로 있었다.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
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
      triggerRouteLoading();
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (notifyMounted === showNow) notifyMounted = null;
    };
  }, [skipAnimation]);

  // Route actually changed while THIS instance stayed mounted (sidebar group / tab switches never
  // remount the layout) - clear the pending state, respecting the minimum-visible-time. The
  // remount case (server switch) is handled separately above, on mount.
  useEffect(() => {
    if (prevPathnameRef.current === pathname) return;
    prevPathnameRef.current = pathname;
    if (pendingSince === null) return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - pendingSince));
    hideTimerRef.current = setTimeout(() => {
      pendingSince = null;
      setVisible(false);
    }, remaining);
  }, [pathname]);

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
