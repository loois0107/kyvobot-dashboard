type BetaBadgeProps = {
  label: string;
  className?: string;
};

// 🛡️ [Badge.tsx와 별도] 범용 Badge(단색 10% 배경 + 얇은 보더, text-[10px])는 상태 표시용으로는
// 맞지만 "베타"처럼 한눈에 띄어야 하는 라벨에는 너무 존재감이 약하다는 피드백 - 배경을 꽉 채운
// 색(warning-border, 다크/라이트 모두 흰 텍스트 대비가 충분히 확보된 진한 톤)에 흰 글자로
// 완전히 별도 스타일을 쓴다. Badge.tsx의 variant 체계에 끼워 넣지 않고 독립 컴포넌트로 둔 이유:
// Badge는 "상태"(성공/경고/위험/중립) 의미 체계이고 이건 "라벨"(베타 태그) 의미가 달라서,
// 억지로 끼워 맞추면 variant 이름이 의미를 잃는다.
export default function BetaBadge({ label, className = '' }: BetaBadgeProps) {
  return (
    <span
      className={`inline-block bg-warning-border text-white text-xs md:text-sm font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-sm ${className}`}
    >
      {label}
    </span>
  );
}
