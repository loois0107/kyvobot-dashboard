type PartyPreviewCardProps = {
  title: string;
  hostLabel: string;
  hostName: string;
  slotsLabel: string;
  joinCta: string;
};

// Static mock-up of a real /party_recruit embed - not a live preview, so the "join" control
// is rendered as a span (not a button) to avoid implying it's interactive.
export default function PartyPreviewCard({ title, hostLabel, hostName, slotsLabel, joinCta }: PartyPreviewCardProps) {
  return (
    <div className="relative w-full max-w-md mx-auto rotate-1 hover:rotate-0 transition-transform duration-300">
      <div className="absolute -inset-2 bg-[#5865F2]/20 blur-2xl rounded-2xl" aria-hidden="true" />
      <div className="relative flex bg-[#1e1f22] border border-[#2b2d31] rounded-xl shadow-2xl overflow-hidden">
        <div className="w-1.5 bg-[#5865F2] shrink-0" />
        <div className="flex-1 p-5 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#5865F2] font-black">
            <span className="w-1.5 h-1.5 rounded-full bg-[#23A55A] animate-pulse" />
            KyvoBot
          </div>
          <h3 className="text-white font-bold text-base">{title}</h3>
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="block text-[10px] uppercase tracking-wide text-[#5f6570]">{hostLabel}</span>
              <span className="text-[#dbdee1] font-semibold">{hostName}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wide text-[#5f6570]">{slotsLabel}</span>
              <span className="text-[#dbdee1] font-semibold">3 / 5</span>
            </div>
          </div>
          <span className="inline-block mt-1 text-xs font-bold bg-[#23A55A]/15 text-[#23A55A] border border-[#23A55A]/30 px-4 py-2 rounded-lg">
            ✅ {joinCta}
          </span>
        </div>
      </div>
    </div>
  );
}
