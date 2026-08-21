import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';

type FeatureScreenshotRowProps = {
  title: string;
  description: string;
  // 🛡️ page.tsx의 FEATURES/PAIN_POINTS와 동일하게 이모지 문자열 대신 lucide 컴포넌트를 직접
  // 받는다 - Coming Soon 자리표시자에서만 실제로 렌더링된다(캡처본이 있으면 이미지로 대체).
  icon: LucideIcon;
  comingSoonLabel: string;
  // 🛡️ [alt ≠ title] 예전엔 이미지 alt를 title 그대로 재사용했다 - 화면에 보이는 제목과 스크린
  // 리더가 읽는 이미지 설명이 완전히 같은 문자열이었다는 뜻. alt는 "이 이미지가 실제로 뭘
  // 보여주는지"를 설명해야 하므로 별도 문구를 받는다. setupAlt가 없으면 alt로 폴백 -
  // 설정 화면 슬롯이 없는 항목(파티모집/AI티켓)은 이 prop 자체를 안 넘기므로 자동으로 안전하다.
  alt: string;
  setupAlt?: string;
  reverse?: boolean;
  // Final path this placeholder will be swapped for once the real capture lands, e.g.
  // "/images/features/party-recruit.png" - kept here only as a pointer for that future edit.
  futureImageSrc: string;
  // Real, already-captured image (e.g. a genuine /level rank card render or a real dashboard
  // screenshot) - when provided, this replaces the "Coming Soon" placeholder entirely.
  imageSrc?: string;
  // 🛡️ 실제 캡처본의 원본 가로/세로 - next/image가 fill 없이 이 비율로 레이아웃을 예약한다.
  // 정확한 픽셀 값일 필요는 없다(비율만 대략 맞으면 됨) - 로드된 실제 파일의 진짜 크기를
  // w-full h-auto가 그대로 따라가므로, 다국어 스크린샷처럼 파일마다 비율이 조금씩 달라도
  // 잘리거나 찌그러지지 않는다. 지정 안 하면 무난한 기본 박스로 폴백.
  imageWidth?: number;
  imageHeight?: number;
  // 🛡️ [설정 -> 결과 2단 구성] 이 4개를 넘기면 위 imageSrc(결과물) 위에 "설정 화면" 이미지가
  // 화살표로 연결되어 하나 더 쌓인다 - 랭크카드 항목(설정 화면 + 실제 카드) 전용, 나머지
  // 항목(파티모집/AI티켓)은 이 props를 안 넘기므로 기존처럼 이미지 1장 그대로 렌더링된다.
  // 나란히(side-by-side)가 아니라 위→아래로 쌓는 이유: 이미지 컬럼이 이미 데스크톱에서
  // 화면 절반(md:w-1/2)이라, 그 절반을 다시 반으로 쪼개면 특히 모바일(컬럼이 전체 폭)에서
  // 각 이미지가 너무 작아진다 - 위→아래면 두 이미지 다 컬럼 전체 폭을 그대로 쓴다.
  setupImageSrc?: string;
  setupFutureImageSrc?: string;
  setupImageWidth?: number;
  setupImageHeight?: number;
};

// 🛡️ imageSrc가 있으면 실제 캡처본을, 없으면 "Coming Soon" 자리표시자를 반환하는 공용 렌더러 -
// 결과물 슬롯과 설정 화면 슬롯이 독립적으로 각자 준비 여부에 따라 실제 이미지 <-> 플레이스홀더를
// 오갈 수 있어야 해서(둘 중 하나만 먼저 캡처되는 경우가 실제로 있었음) 함수로 뽑아 재사용한다.
function ImageSlot({
  src,
  future,
  width,
  height,
  alt,
  icon: Icon,
  comingSoonLabel,
}: {
  src: string | undefined;
  future: string;
  width: number | undefined;
  height: number | undefined;
  alt: string;
  icon: LucideIcon;
  comingSoonLabel: string;
}) {
  if (src) {
    // 🛡️ [프레임 추가 - 랜딩 무채색 정리 2단계] 이전엔 "액자(bg/border) 없이 이미지 자체가
    // 자연스러운 비율로 보이도록" 일부러 프레임을 안 씌웠는데, 랜딩이 라이트 배경 기본값이
    // 되면서 다크 배경 스크린샷이 밝은 페이지 위에 그대로 붕 뜨는 문제가 생겼다. DashboardShowcase와
    // 동일한 중립 프레임(--showcase-border/--showcase-shadow)으로 감싸서 두 컴포넌트의 스크린샷
    // 취급을 통일한다 - width/height + w-full h-auto로 비율을 살리는 부분은 그대로 유지.
    return (
      <div className="rounded-2xl overflow-hidden border-2 border-[color:var(--showcase-border)] shadow-[var(--showcase-shadow)]">
        <Image
          src={src}
          alt={alt}
          width={width ?? 1200}
          height={height ?? 675}
          className="w-full h-auto block"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    );
  }
  /* bg-bg-surface + border는 캡처본이 없는 동안 이 슬롯이 빈 구멍처럼 안 보이게 하는
     자리표시자 전용 - 실제 이미지가 준비되면(src) 위 분기로 완전히 대체된다. */
  return (
    <div className="aspect-[16/9] rounded-2xl bg-bg-surface border border-border-default flex flex-col items-center justify-center gap-3" title={future}>
      <Icon className="w-12 h-12 text-text-primary opacity-60" aria-hidden="true" />
      <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">{comingSoonLabel}</span>
    </div>
  );
}

export default function FeatureScreenshotRow({
  title,
  description,
  icon,
  comingSoonLabel,
  alt,
  setupAlt,
  reverse = false,
  futureImageSrc,
  imageSrc,
  imageWidth,
  imageHeight,
  setupImageSrc,
  setupFutureImageSrc,
  setupImageWidth,
  setupImageHeight,
}: FeatureScreenshotRowProps) {
  const hasSetupSlot = setupFutureImageSrc !== undefined;

  return (
    <div className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-12`}>
      <div className="w-full md:w-1/2 space-y-3">
        {hasSetupSlot && (
          <>
            <ImageSlot
              src={setupImageSrc}
              future={setupFutureImageSrc!}
              width={setupImageWidth}
              height={setupImageHeight}
              alt={setupAlt ?? alt}
              icon={icon}
              comingSoonLabel={comingSoonLabel}
            />
            <div className="flex justify-center text-2xl text-text-secondary" aria-hidden="true">↓</div>
          </>
        )}
        <ImageSlot
          src={imageSrc}
          future={futureImageSrc}
          width={imageWidth}
          height={imageHeight}
          alt={alt}
          icon={icon}
          comingSoonLabel={comingSoonLabel}
        />
      </div>
      <div className="w-full md:w-1/2 space-y-4 text-center md:text-left">
        <h3 className="text-2xl md:text-3xl font-bold text-text-primary">{title}</h3>
        <p className="text-base md:text-lg text-text-secondary leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
