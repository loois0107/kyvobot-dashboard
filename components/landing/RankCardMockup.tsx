type RankCardMockupProps = {
  name: string;
};

// Static mock-up of the /level rank card's colour pickers - not a screenshot, so it never needs
// to be re-captured when the real profile card editor's UI changes.
export default function RankCardMockup({ name }: RankCardMockupProps) {
  return (
    <div className="bg-[#111214] border border-[#232428] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5865F2] to-[#9146FF] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{name}</p>
          <p className="text-[10px] text-[#949ba4]">Lv. 12</p>
        </div>
      </div>
      <div className="w-full h-2 rounded-full bg-[#2b2d31] overflow-hidden">
        <div className="h-full w-[60%] bg-[#5865F2] rounded-full" />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <span className="w-5 h-5 rounded-full bg-[#5865F2] border-2 border-white/20" />
        <span className="w-5 h-5 rounded-full bg-[#FFD700] border-2 border-white/20" />
        <span className="w-5 h-5 rounded-full bg-[#23A55A] border-2 border-white/20" />
        <span className="text-[10px] text-[#5f6570] ml-1">🎨</span>
      </div>
    </div>
  );
}
