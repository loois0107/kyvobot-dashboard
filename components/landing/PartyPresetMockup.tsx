type PartyPresetMockupProps = {
  preset1: string;
  preset2: string;
};

export default function PartyPresetMockup({ preset1, preset2 }: PartyPresetMockupProps) {
  return (
    <div className="bg-[#111214] border border-[#232428] rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between bg-[#5865F2]/15 border border-[#5865F2]/40 rounded-lg px-3 py-2">
        <span className="text-xs font-bold text-white truncate">🔫 {preset1}</span>
        <span className="text-[10px] text-[#5865F2] font-black shrink-0">✓</span>
      </div>
      <div className="flex items-center justify-between bg-[#1e1f22] border border-[#2b2d31] rounded-lg px-3 py-2">
        <span className="text-xs font-bold text-[#b5bac1] truncate">⚔️ {preset2}</span>
      </div>
    </div>
  );
}
