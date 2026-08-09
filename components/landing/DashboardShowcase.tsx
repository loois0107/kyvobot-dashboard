import Image from 'next/image';

type DashboardShowcaseProps = {
  eyebrow: string;
  title: string;
  description: string;
  imageSrc: string;
  // 🛡️ 실제 대시보드 캡처본의 원본 가로/세로 - FeatureScreenshotRow와 동일한 이유로 fill 대신
  // 진짜 크기를 준다(정확한 픽셀 값일 필요는 없음, 비율만 대략 맞으면 w-full h-auto가 로드된
  // 실제 파일 크기를 그대로 따라간다).
  imageWidth?: number;
  imageHeight?: number;
};

// 🛡️ 다른 기능 카드/스크린샷 행과 톤을 의도적으로 다르게 간다 - 이 섹션 하나만 "웹 대시보드"라는
// 킬러 피처를 단독으로 강조해야 해서, 알약 모양 eyebrow 배지 + 파란 글로우 테두리로 시각적으로
// 확실히 구분되게 만든다(이 테두리/글로우는 스크린샷 잘림 문제와 무관한 의도된 디자인이라 유지).
export default function DashboardShowcase({ eyebrow, title, description, imageSrc, imageWidth, imageHeight }: DashboardShowcaseProps) {
  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <span className="inline-block text-xs font-black tracking-widest text-[#5865F2] uppercase bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-full px-4 py-1.5">
          {eyebrow}
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-white">{title}</h2>
        <p className="max-w-2xl mx-auto text-base md:text-lg text-[#b5bac1] leading-relaxed">{description}</p>
      </div>
      {/* 🛡️ aspect-[16/9]+object-cover(고정 박스 크롭)를 버리고, 실제 width/height + w-full h-auto로
          이미지 자체 비율을 그대로 살린다 - overflow-hidden은 이제 잘라내는 용도가 아니라 rounded-2xl
          모서리를 유지하기 위한 것뿐(이미지가 박스보다 커질 일이 없으므로 실질적으로 아무것도 안 잘림). */}
      <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden border-2 border-[#5865F2]/30 shadow-[0_0_60px_rgba(88,101,242,0.25)]">
        <Image
          src={imageSrc}
          alt={title}
          width={imageWidth ?? 1600}
          height={imageHeight ?? 900}
          className="w-full h-auto block"
          sizes="(max-width: 1024px) 100vw, 1024px"
        />
      </div>
    </div>
  );
}
