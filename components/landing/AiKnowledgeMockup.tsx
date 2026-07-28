type AiKnowledgeMockupProps = {
  question: string;
  answer: string;
  tag: string;
};

export default function AiKnowledgeMockup({ question, answer, tag }: AiKnowledgeMockupProps) {
  return (
    <div className="bg-[#111214] border border-[#232428] rounded-xl p-4 space-y-2">
      <div className="ml-auto max-w-[85%] bg-[#5865F2]/20 text-[#dbdee1] text-[10px] leading-relaxed rounded-lg rounded-br-sm px-3 py-2">
        {question}
      </div>
      <div className="max-w-[85%] bg-[#1e1f22] border border-[#2b2d31] text-[#dbdee1] text-[10px] leading-relaxed rounded-lg rounded-bl-sm px-3 py-2 space-y-1">
        <p>{answer}</p>
        <p className="text-[9px] text-[#5865F2] font-bold">📚 {tag}</p>
      </div>
    </div>
  );
}
