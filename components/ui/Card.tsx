type CardProps = {
  children: React.ReactNode;
  className?: string;
  /** true면 bg-elevated(카드 위에 얹히는 카드/모달 등) - 기본은 bg-surface. */
  elevated?: boolean;
};

// 🛡️ [디자인 토큰 리디자인 2/2] 예전엔 카드 배경이 두 톤으로 쪼개져 있었다 -
// bg-[#1e1f22]+border-[#2b2d31](19개 파일) vs bg-[#161626]+border-[#2A1F40](12개 파일),
// 같은 "카드" 역할인데 파일마다 임의로 골라 썼다. 이 컴포넌트는 그 둘을 완전히 대체하는
// 단일 토큰 쌍(bg-surface/bg-elevated + border-default)만 쓴다 - 보라색 톤은 신규 토큰에서
// 의도적으로 제외.
//
// 🛡️ [배경색은 prop으로, className 문자열 접미사로 덮어쓰지 않음] 처음엔 elevated를 그냥
// `className="bg-bg-elevated"`로 덮어쓰게 했는데, 실제 렌더링 검증에서 안 먹히는 걸 발견했다 -
// 이 프로젝트엔 clsx/tailwind-merge가 없어서 base 클래스 문자열에 이미 있는 bg-bg-surface와
// 나중에 붙는 bg-bg-elevated가 DOM에 동시에 존재하게 되고, 실제로 어느 쪽이 이기는지는 컴파일된
// CSS의 규칙 순서(문자열에 적은 순서가 아님)에 달려있어 예측 불가능했다(실측: bg-bg-surface가
// 이겨서 elevated가 무시됨). 그래서 배경은 컴포넌트가 elevated bool로 직접 하나만 골라 내보내고,
// 보더 hover도 항상 켜진 hover:border-border-hover로 내장해서(별도 덮어쓰기 불필요) 같은 충돌이
// 재발하지 않게 했다 - className은 레이아웃/스페이싱처럼 겹치지 않는 용도로만 안전하다.
export default function Card({ children, className = '', elevated = false }: CardProps) {
  return (
    <div
      className={`${elevated ? 'bg-bg-elevated shadow-[var(--card-shadow)]' : 'bg-bg-surface shadow-[var(--card-shadow-accent)] hover:scale-[1.005]'} border border-[color:var(--card-border)] hover:border-border-hover rounded-xl p-6 transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-out ${className}`}
    >
      {children}
    </div>
  );
}
