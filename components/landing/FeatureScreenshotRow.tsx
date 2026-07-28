type FeatureScreenshotRowProps = {
  title: string;
  description: string;
  icon: string;
  comingSoonLabel: string;
  reverse?: boolean;
  // Final path this placeholder will be swapped for once the real capture lands, e.g.
  // "/images/features/party-recruit.png" - kept here only as a pointer for that future edit.
  futureImageSrc: string;
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
}: FeatureScreenshotRowProps) {
  return (
    <div className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-12`}>
      <div className="w-full md:w-1/2" title={futureImageSrc}>
        <div className="aspect-[16/10] rounded-2xl bg-[#161626] border border-[#2A1F40] flex flex-col items-center justify-center gap-3">
          <span className="text-5xl opacity-60">{icon}</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#5f6570]">{comingSoonLabel}</span>
        </div>
      </div>
      <div className="w-full md:w-1/2 space-y-3 text-center md:text-left">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-sm text-[#a1a1aa] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
