// 🛡️ [배경 라인 장식] 예전에 지운 브랜드색 블러 글로우(bg-[#5865F2]/25 blur-[130px] 등)와는
// 의도적으로 다른 방향 - 색이 아니라 형태로만 만드는 장식이라, 옅은 중립 선(--decor-stroke,
// 다크/라이트 분기는 app/globals.css)으로만 그린 기하학 도형을 흩뿌린다. 브랜드색은 전혀 안 씀.
//
// 🛡️ [참고 사이트 대비 재조정] 실제로 참고 사이트(leaderboard.run)를 열어 비교해보니, 거기는
// 저알파가 아니라 완전 불투명(stroke-opacity:1) + 브랜드색을 아주 옅게 우려낸 파스텔톤이었고,
// 장식 자체도 히어로 하나가 아니라 페이지 전반(Pain Points/구조/Features/CTA)에 10개 넘게
// 흩어져 있었다. 저희는 브랜드색을 안 쓰기로 한 전제는 유지하되(중립색+알파 방식 그대로),
// 알파값을 다크 0.14→0.35/라이트 0.10→0.22로 올리고(app/globals.css) 배치 범위를 5개 섹션으로
// 넓혀서 그 격차를 좁힌다.
//
// 🛡️ [섹션마다 다른 부분집합 - 복붙 티 안 나게] 도형 8종(SHAPE_RENDERERS)을 정의해두고, 섹션별
// 프리셋(HERO_SHAPES 등)이 그중 일부만 골라 각자 다른 위치/크기로 쓴다 - 같은 도형이 여러
// 섹션에 나올 순 있어도(참고 사이트도 사각형/원을 반복해서 씀), 한 섹션 안에서 "이전 섹션
// 그대로 복사"처럼 보이는 조합은 없게 했다.
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

type ShapeKind = 'triangle' | 'diamond' | 'dashedCircle' | 'diamond2' | 'xmark' | 'dot' | 'square' | 'plus';

export type ShapeSpec = {
  kind: ShapeKind;
  position: string;
  size: string;
};

function ShapeMark({ kind }: { kind: ShapeKind }) {
  switch (kind) {
    case 'triangle':
      return <polygon points="20,4 36,34 4,34" fill="none" stroke="var(--decor-stroke)" strokeWidth="1.5" />;
    case 'diamond':
      return (
        <rect x="10" y="10" width="20" height="20" fill="none" stroke="var(--decor-stroke)" strokeWidth="1.5" transform="rotate(45 20 20)" />
      );
    case 'dashedCircle':
      return <circle cx="20" cy="20" r="14" fill="none" stroke="var(--decor-stroke)" strokeWidth="1.5" strokeDasharray="3 5" />;
    case 'diamond2':
      return <polygon points="20,6 34,20 20,34 6,20" fill="none" stroke="var(--decor-stroke)" strokeWidth="1.5" />;
    case 'xmark':
      return (
        <>
          <line x1="8" y1="8" x2="32" y2="32" stroke="var(--decor-stroke)" strokeWidth="1.5" />
          <line x1="32" y1="8" x2="8" y2="32" stroke="var(--decor-stroke)" strokeWidth="1.5" />
        </>
      );
    case 'dot':
      return <circle cx="20" cy="20" r="6" fill="var(--decor-stroke)" />;
    case 'square':
      return <rect x="10" y="10" width="20" height="20" fill="none" stroke="var(--decor-stroke)" strokeWidth="1.5" />;
    case 'plus':
      return (
        <>
          <line x1="20" y1="6" x2="20" y2="34" stroke="var(--decor-stroke)" strokeWidth="1.5" />
          <line x1="6" y1="20" x2="34" y2="20" stroke="var(--decor-stroke)" strokeWidth="1.5" />
        </>
      );
  }
}

// 🛡️ 히어로는 아래에 대시보드 미리보기 이미지가 이미 있어 3개로 절제 - 중앙 텍스트 컬럼과
// 겹치지 않게 네 모서리 쪽에만 배치.
export const HERO_SHAPES: ShapeSpec[] = [
  { kind: 'triangle', position: 'top-[10%] left-[4%]', size: 'w-16 h-16 sm:w-20 sm:h-20' },
  { kind: 'diamond', position: 'top-[8%] right-[6%]', size: 'w-14 h-14 sm:w-16 sm:h-16' },
  { kind: 'dot', position: 'bottom-[10%] left-[8%]', size: 'w-3 h-3' },
];

// 🛡️ Pain Points - 히어로와 다른 도형 조합(dashedCircle/plus/square)으로 시작, 카드 4개
// (히어로 카드 1 + 2열 카드 3) 레이아웃을 피해 가장자리에만.
export const PAIN_POINTS_SHAPES: ShapeSpec[] = [
  { kind: 'dashedCircle', position: 'top-[4%] right-[6%]', size: 'w-12 h-12 sm:w-14 sm:h-14' },
  { kind: 'plus', position: 'bottom-[8%] left-[4%]', size: 'w-8 h-8' },
  { kind: 'square', position: 'top-[52%] right-[2%]', size: 'w-10 h-10' },
];

// 🛡️ Features - diamond2(다이아몬드 폴리곤)/xmark/dot 조합으로 히어로·Pain Points와 겹치지
// 않는 시각적 변주.
export const FEATURES_SHAPES: ShapeSpec[] = [
  { kind: 'diamond2', position: 'top-[6%] right-[5%]', size: 'w-12 h-12 sm:w-14 sm:h-14' },
  { kind: 'xmark', position: 'bottom-[15%] left-[3%]', size: 'w-8 h-8' },
  { kind: 'dot', position: 'top-[45%] right-[8%]', size: 'w-3 h-3' },
];

// 🛡️ DashboardShowcase - 이미 스크린샷 프레임 자체가 시각적 무게가 커서 2개로 최소화, 작게.
export const DASHBOARD_SHOWCASE_SHAPES: ShapeSpec[] = [
  { kind: 'triangle', position: 'top-[4%] left-[3%]', size: 'w-10 h-10 sm:w-12 sm:h-12' },
  { kind: 'dashedCircle', position: 'bottom-[6%] right-[5%]', size: 'w-10 h-10' },
];

// 🛡️ Final CTA - CTA 버튼(브랜드 블루)이 페이지에서 제일 눈에 띄어야 하므로 2개만, 버튼이 있는
// 중앙에서 최대한 떨어진 모서리에.
export const FINAL_CTA_SHAPES: ShapeSpec[] = [
  { kind: 'diamond', position: 'top-[10%] left-[6%]', size: 'w-10 h-10' },
  { kind: 'plus', position: 'bottom-[10%] right-[6%]', size: 'w-8 h-8' },
];

export default function DecorShapes({ shapes }: { shapes: ShapeSpec[] }) {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {shapes.map((shape, i) => (
        <svg key={i} viewBox="0 0 40 40" className={`absolute ${shape.position} ${shape.size}`}>
          <ShapeMark kind={shape.kind} />
        </svg>
      ))}
    </div>
  );
}
