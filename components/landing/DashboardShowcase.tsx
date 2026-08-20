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

// 🛡️ [브랜드 블루 예외를 없앰 - 랜딩 무채색 정리 2단계] 예전엔 이 섹션만 "웹 대시보드"라는
// 킬러 피처를 단독으로 강조한다는 이유로 파란 eyebrow 배지 + 파란 글로우 테두리를 의도적으로
// 유지했었다. 이제 랜딩 전체가 무채색으로 통일되는 범위에 이 컴포넌트도 편입되면서 그 예외를
// 없앴다 - 강조 자체(알약 배지, 글로우 테두리 굵기)는 그대로 두되 색만 중립톤으로 바꿨다.
// 보더/글로우는 Card.tsx와 동일한 패턴(app/globals.css --showcase-border/--showcase-shadow,
// 다크는 옅은 글로우/라이트는 드롭섀도우)의 CSS 변수로 분기한다.
export default function DashboardShowcase({ eyebrow, title, description, imageSrc, imageWidth, imageHeight }: DashboardShowcaseProps) {
  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <span className="inline-block text-xs font-black tracking-widest text-text-secondary uppercase bg-text-secondary/10 border border-text-secondary/30 rounded-full px-4 py-1.5">
          {eyebrow}
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-text-primary">{title}</h2>
        <p className="max-w-2xl mx-auto text-base md:text-lg text-text-secondary leading-relaxed">{description}</p>
      </div>
      {/* 🛡️ aspect-[16/9]+object-cover(고정 박스 크롭)를 버리고, 실제 width/height + w-full h-auto로
          이미지 자체 비율을 그대로 살린다 - overflow-hidden은 이제 잘라내는 용도가 아니라 rounded-2xl
          모서리를 유지하기 위한 것뿐(이미지가 박스보다 커질 일이 없으므로 실질적으로 아무것도 안 잘림). */}
      <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden border-2 border-[color:var(--showcase-border)] shadow-[var(--showcase-shadow)]">
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
