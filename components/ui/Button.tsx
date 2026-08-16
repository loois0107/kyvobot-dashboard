import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

// 🛡️ [디자인 토큰 리디자인 1/2] 이전엔 "bg-[#5865F2] hover:bg-[#4752C4] text-white ..." 조합이
// 19개 파일에 29번 그대로 복붙되어 있었다(패딩/라운드 등 나머지는 파일마다 조금씩 또 달랐음) -
// 이 컴포넌트 하나로 그 반복을 대체한다. 기존 19개 페이지에 실제로 적용하는 건 이번 스코프가
// 아니고(신규 페이지/컴포넌트에서부터 채택), Button/Card 자체의 존재와 동작만 검증한다.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // 브랜드 배경 + 흰 텍스트 - 화면당 하나뿐인 주요 액션(저장, 시작 등)에 사용.
  primary: 'bg-brand hover:bg-brand-hover text-white',
  // 투명 배경 + 보더만 - 주요 액션 옆의 보조 액션(취소, 초기화 등)에 사용.
  secondary: 'bg-transparent border border-border-default hover:border-border-hover text-text-primary',
  // 배경/보더 없이 텍스트만 - 가장 눈에 덜 띄어야 하는 액션(더보기, 닫기 등)에 사용.
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary',
};

export default function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
