type HelpTextProps = {
  children: React.ReactNode;
  className?: string;
};

// Shared help/description text style for settings pages. text-[10px] text-[#57576F] (the pattern
// this replaces) sat at ~2.2-2.7:1 contrast against the dashboard panel backgrounds - well under
// WCAG AA's 3:1 floor for small UI text, and its default font-weight (400) read as thin/washed-out
// on dark panels. font-medium (500) + #a1a1aa clears 6:1+ against every panel background in use and
// sits more neutral against the UI's blue-toned dark backgrounds than the previous #8b8d98.
export default function HelpText({ children, className = '' }: HelpTextProps) {
  return <p className={`text-xs font-medium text-[#a1a1aa] ${className}`}>{children}</p>;
}
