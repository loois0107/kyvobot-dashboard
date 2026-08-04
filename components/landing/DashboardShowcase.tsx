import Image from 'next/image';

type DashboardShowcaseProps = {
  eyebrow: string;
  title: string;
  description: string;
  imageSrc: string;
};

// 🛡️ 다른 기능 카드/스크린샷 행과 톤을 의도적으로 다르게 간다 - 이 섹션 하나만 "웹 대시보드"라는
// 킬러 피처를 단독으로 강조해야 해서, 알약 모양 eyebrow 배지 + 파란 글로우 테두리로 시각적으로
// 확실히 구분되게 만든다.
export default function DashboardShowcase({ eyebrow, title, description, imageSrc }: DashboardShowcaseProps) {
  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <span className="inline-block text-xs font-black tracking-widest text-[#5865F2] uppercase bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-full px-4 py-1.5">
          {eyebrow}
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-white">{title}</h2>
        <p className="max-w-2xl mx-auto text-base md:text-lg text-[#b5bac1] leading-relaxed">{description}</p>
      </div>
      <div className="relative aspect-[16/9] max-w-4xl mx-auto rounded-2xl overflow-hidden border-2 border-[#5865F2]/30 shadow-[0_0_60px_rgba(88,101,242,0.25)]">
        <Image src={imageSrc} alt={title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 1024px" />
      </div>
    </div>
  );
}
