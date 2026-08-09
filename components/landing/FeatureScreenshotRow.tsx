import Image from 'next/image';

type FeatureScreenshotRowProps = {
  title: string;
  description: string;
  icon: string;
  comingSoonLabel: string;
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
};

// Placeholder mock-up (Option A) for a real product screenshot - no <Image> yet since the file
// doesn't exist. Swap the placeholder <div> below for <Image src={futureImageSrc} ... /> once the
// real screenshots land in public/images/features/, no other structural change needed.
export default function FeatureScreenshotRow({
  title,
  description,
  icon,
  comingSoonLabel,
  reverse = false,
  futureImageSrc,
  imageSrc,
  imageWidth,
  imageHeight,
}: FeatureScreenshotRowProps) {
  return (
    <div className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-12`}>
      <div className="w-full md:w-1/2" title={futureImageSrc}>
        {imageSrc ? (
          // 🛡️ 액자(bg/border) 없이 이미지 자체가 자연스러운 비율로 보이도록 fill+object-cover를
          // 버리고 실제 width/height + w-full h-auto를 쓴다 - 세로로 긴 디스코드 캡처든 가로로
          // 넓은 랭크카드든 잘리지 않고 카드 폭에 맞춰 온전히 보인다.
          <Image
            src={imageSrc}
            alt={title}
            width={imageWidth ?? 1200}
            height={imageHeight ?? 675}
            className="w-full h-auto rounded-2xl"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          /* bg-[#161626] + border는 캡처본이 없는 동안 이 슬롯이 빈 구멍처럼 안 보이게 하는
             자리표시자 전용 - 실제 이미지가 준비되면(imageSrc) 위 분기로 완전히 대체된다. */
          <div className="aspect-[16/9] rounded-2xl bg-[#161626] border border-[#2A1F40] flex flex-col items-center justify-center gap-3">
            <span className="text-5xl opacity-60">{icon}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#5f6570]">{comingSoonLabel}</span>
          </div>
        )}
      </div>
      <div className="w-full md:w-1/2 space-y-4 text-center md:text-left">
        <h3 className="text-2xl md:text-3xl font-bold text-white">{title}</h3>
        <p className="text-base md:text-lg text-[#a1a1aa] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
