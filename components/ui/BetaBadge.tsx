type BetaBadgeProps = {
  label: string;
  className?: string;
};

// 🛡️ [Badge.tsx와 별도] 범용 Badge(단색 10% 배경 + 얇은 보더, text-[10px])는 상태 표시용으로는
// 맞지만 "베타"처럼 한눈에 띄어야 하는 라벨에는 너무 존재감이 약하다는 피드백으로 한 번
// 진한 배경 필(pill) 스타일로 바꿨었는데, 이번엔 반대로 "빨간 원 배경 빼고 (BETA)처럼 괄호
// 두른 텍스트로"라는 피드백 - 배경/보더/패딩/알약 모양을 전부 없애고 강조색 텍스트만
// 남긴다. Badge.tsx의 variant 체계에 끼워 넣지 않고 독립 컴포넌트로 둔 이유는 그대로:
// Badge는 "상태"(성공/경고/위험/중립) 의미 체계이고 이건 "라벨"(베타 태그) 의미가 달라서,
// 억지로 끼워 맞추면 variant 이름이 의미를 잃는다.
export default function BetaBadge({ label, className = '' }: BetaBadgeProps) {
  return (
    <span className={`inline-block text-warning-border text-xs md:text-sm font-black tracking-widest uppercase ${className}`}>
      ({label})
    </span>
  );
}
