type SettingsPageContainerProps = {
  children: React.ReactNode;
  className?: string;
};

// Shared content width for /dashboard/[guildId]/* settings pages (and the dashboard home/leaderboard
// pages, which apply the same max-w-7xl directly since their layouts don't otherwise fit this
// wrapper's default space-y-6). Previously every page hardcoded its own max-w-2xl/3xl/4xl/5xl,
// leaving wide screens with a narrow column of content and a lot of dead side margin.
export default function SettingsPageContainer({ children, className = '' }: SettingsPageContainerProps) {
  return <div className={`max-w-7xl mx-auto space-y-6 ${className}`}>{children}</div>;
}
