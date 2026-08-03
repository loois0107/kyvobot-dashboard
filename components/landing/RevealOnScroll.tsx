'use client';

import { useEffect, useRef, useState } from 'react';

interface RevealOnScrollProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}

/**
 * 뷰포트에 처음 들어오는 순간 딱 한 번 fade-in + slide-up으로 나타난다(스크롤을 위아래로
 * 왔다갔다해도 재트리거 안 됨 - observer가 첫 트리거 후 바로 unobserve). delayMs는 같은
 * 섹션 안에서 여러 개를 순서대로(스태거) 보여줄 때 쓴다 - 이 요소 "자신"이 뷰포트에 들어온
 * 시점 기준으로 지연되는 것이지, 페이지 로드 시점 기준이 아니다.
 */
export default function RevealOnScroll({ children, className = '', delayMs = 0 }: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  // 🛡️ 모션에 민감한 유저는 트리거 시점만 즉시로 당기는 걸로는 부족하다 - opacity/translate
  // 클래스가 바뀌는 순간에도 transition-all duration-700이 여전히 붙어있으면 700ms짜리 페이드가
  // 그대로 재생된다. 이 값이 true면 트랜지션 클래스 자체와 stagger 지연을 통째로 뺀다.
  const [skipAnimation, setSkipAnimation] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSkipAnimation(true);
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${skipAnimation ? '' : 'transition-all duration-700 ease-out'} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={delayMs && !skipAnimation ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
