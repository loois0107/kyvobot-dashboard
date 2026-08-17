export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

// 🛡️ ticket-settings의 FeedbackBadge(피드백 도움됨 비율 4단계 표시: 70%+/50~69%/50%미만/
// 데이터부족)에서 승격한 범용 상태 배지 - success/warning/danger 토큰 3단계 + 중립 1단계를
// 하나의 재사용 가능한 컴포넌트로 뽑았다. 원래 FeedbackBadge의 시각 톤(font-mono, px-2 py-0.5,
// rounded, font-black, uppercase)을 그대로 유지한다. twitch 폴링 상태(healthy/delayed/stalled/
// pending 4단계)처럼 의미가 다른 별개의 상태 배지는 포함하지 않는다 - 억지로 합치면 오히려
// 부정확해진다. ConfiguredBadge(설정됨/설정 안 됨)는 이 배지의 success/warning 시맨틱과 정확히
// 일치해서 내부적으로 이 컴포넌트를 감싸는 wrapper로 승격했다(voice/anonymous-reports 공용).
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/30',
  danger: 'bg-danger/10 text-danger border-danger/20',
  neutral: 'bg-bg-elevated text-text-secondary border-border-default',
};

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`${VARIANT_CLASSES[variant]} border text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase ${className}`}
    >
      {children}
    </span>
  );
}
