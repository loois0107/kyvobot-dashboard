// 🛡️ [배경 라인 장식] 예전에 지운 브랜드색 블러 글로우(bg-[#5865F2]/25 blur-[130px] 등)와는
// 의도적으로 다른 방향 - 색이 아니라 형태로만 만드는 장식이라, 옅은 중립 선(--decor-stroke,
// 다크/라이트 분기는 app/globals.css)으로만 그린 기하학 도형을 흩뿌린다. 브랜드색은 전혀 안 씀.
//
// 각 도형을 독립된 작은 SVG(고정 정사각형 viewBox)로 그리고 위치만 퍼센트로 반응형 배치한다 -
// 하나의 큰 SVG에 viewBox+preserveAspectRatio="none"으로 늘리면 뷰포트 폭이 바뀔 때 도형 자체가
// 찌그러지므로 피했다. pointer-events-none이라 버튼/링크 클릭을 가리지 않는다.
//
// 🛡️ [z-index: 음수 대신 0 + DOM 순서] 원래 -z-10을 썼는데, 이 프로젝트 검증에 쓰는 헤드리스
// Edge에서 "음수 z-index + 아주 옅은(low-alpha) 색"이 겹치면 실제로는 그려지는데 픽셀상
// 완전히 안 보이는 렌더링 버그를 발견했다(getComputedStyle은 정상, 스크린샷 픽셀 diff는 0 -
// DOM 중첩 깊이/overflow/viewBox 스케일은 전부 원인이 아니었고, z-index를 0 이상으로 바꾸는
// 순간 정확히 그 알파값 그대로 보임). 그래서 z-index는 0으로 두고, 대신 각 사용처에서 이
// 컴포넌트를 형제 콘텐츠보다 먼저(자식 목록 맨 앞에) 렌더링해서 DOM 순서로 뒤에 깔리게 한다
// (실측 확인: 이 순서만으로 타이틀/버튼 위로 안 올라오고 정상적으로 뒤에 깔림).
export default function DecorShapes() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <svg viewBox="0 0 40 40" className="absolute top-[10%] left-[4%] w-16 h-16 sm:w-20 sm:h-20">
        <polygon points="20,4 36,34 4,34" fill="none" stroke="var(--decor-stroke)" strokeWidth="1.5" />
      </svg>
      <svg viewBox="0 0 40 40" className="absolute top-[8%] right-[6%] w-14 h-14 sm:w-16 sm:h-16">
        <rect x="10" y="10" width="20" height="20" fill="none" stroke="var(--decor-stroke)" strokeWidth="1.5" transform="rotate(45 20 20)" />
      </svg>
      <svg viewBox="0 0 40 40" className="absolute top-[38%] right-[4%] w-12 h-12 sm:w-14 sm:h-14">
        <circle cx="20" cy="20" r="14" fill="none" stroke="var(--decor-stroke)" strokeWidth="1.5" strokeDasharray="3 5" />
      </svg>
      <svg viewBox="0 0 40 40" className="absolute top-[58%] left-[3%] w-12 h-12 sm:w-14 sm:h-14">
        <polygon points="20,6 34,20 20,34 6,20" fill="none" stroke="var(--decor-stroke)" strokeWidth="1.5" />
      </svg>
      <svg viewBox="0 0 40 40" className="absolute top-[68%] right-[9%] w-8 h-8">
        <line x1="8" y1="8" x2="32" y2="32" stroke="var(--decor-stroke)" strokeWidth="1.5" />
        <line x1="32" y1="8" x2="8" y2="32" stroke="var(--decor-stroke)" strokeWidth="1.5" />
      </svg>
      <svg viewBox="0 0 40 40" className="absolute bottom-[8%] left-[10%] w-3 h-3">
        <circle cx="20" cy="20" r="6" fill="var(--decor-stroke)" />
      </svg>
    </div>
  );
}
