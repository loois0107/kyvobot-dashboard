type HelpTextProps = {
  children: React.ReactNode;
  className?: string;
};

// Shared help/description text style for settings pages. text-[10px] text-[#57576F] (the pattern
// this replaces) sat at ~2.2-2.7:1 contrast against the dashboard panel backgrounds - well under
// WCAG AA's 3:1 floor for small UI text. #8b8d98 clears 4.7:1+ against every panel background in use.
export default function HelpText({ children, className = '' }: HelpTextProps) {
  return <p className={`text-xs text-[#8b8d98] ${className}`}>{children}</p>;
}
