type SettingsPageContainerProps = {
  children: React.ReactNode;
  className?: string;
};

// Shared content width for /dashboard/[guildId]/* settings pages. Previously every page hardcoded
// its own max-w-2xl/3xl/4xl/5xl, leaving wide screens with a narrow column of content and a lot of
// dead side margin. max-w-6xl gives multi-column forms (welcome, leveling, ticket-settings) room to
// breathe without going as wide as the dashboard home grid (max-w-[1300px]), which is a looser
// card layout rather than dense form fields.
export default function SettingsPageContainer({ children, className = '' }: SettingsPageContainerProps) {
  return <div className={`max-w-6xl mx-auto space-y-6 ${className}`}>{children}</div>;
}
