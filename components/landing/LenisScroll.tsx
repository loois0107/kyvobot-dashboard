'use client';

import { ReactLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';

// 🛡️ [가장 가벼운 스무스스크롤 - Lenis] 의존성 0개(package.json 확인), 코어만 설치되는 순수
// 스크롤 라이브러리 - GSAP ScrollSmoother는 GSAP 코어+플러그인까지 같이 끌고 와서 훨씬 무겁고
// 이 프로젝트 의존성 규모(런타임 8개)에 안 맞아 제외했다.
//
// root(children 없음)로 붙이면 wrapper/content div를 새로 만들지 않고 실제 window/documentElement를
// 그대로 스크롤한다("가상 스크롤"이 아님) - 그래서 RevealOnScroll의 IntersectionObserver가 보는
// 실제 뷰포트 교차 판정에 전혀 영향이 없다(Lenis는 스크롤이 "일어나는 방식"만 부드럽게 바꿀 뿐,
// 스크롤 위치 자체는 진짜로 이동시킨다).
//
// anchors:true로 <a href="#features">류 앵커 클릭을 Lenis가 자체 easing으로 스크롤한다 - 기존
// html { scroll-behavior: smooth }는 그대로 둬도 충돌 없음(Lenis가 클릭을 가로채 자체 스크롤을
// 실행하므로 네이티브 smooth-scroll이 개입할 일이 애초에 없음).
//
// respectReducedMotion 옵션은 기본값 true라 OS "동작 줄이기" 설정을 Lenis가 자동으로 존중한다
// (lerp를 1로 강제해 입력 장치 스크롤을 1:1로 그대로 따라가고, 프로그래매틱 스크롤도 즉시 이동) -
// RevealOnScroll도 동일한 media feature를 직접 확인하니 두 동작의 "모션 줄이기" 판단 기준이
// 일치한다. 별도 매체 쿼리 체크 불필요.
export default function LenisScroll() {
  return <ReactLenis root options={{ anchors: true }} />;
}
