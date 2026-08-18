import Link from 'next/link';

export type GroupTab = {
  href: string;
  label: string;
  active: boolean;
};

type GroupTabLayoutProps = {
  tabs: GroupTab[];
  children: React.ReactNode;
};

// 🛡️ /profile/[guildId]/layout.tsx의 탭바 레시피를 그대로 재사용한다. "판정 로직은 호출부
// 책임"(components/ui/SidebarNavLink.tsx와 동일 원칙) - active는 이미 계산된 값만 prop으로
// 받고, 이 컴포넌트는 렌더링만 담당한다. 대시보드 루트 레이아웃(사이드바/헤더/Go Back 버튼)
// 안에 중첩되는 용도라 자체 전체화면 배경 래퍼는 없다 - 그룹별 layout.tsx(예:
// integrations/layout.tsx)가 이 컴포넌트에 자기 tabs 배열만 넘기면, 새 그룹을 추가할 때마다
// 탭바 마크업을 새로 짤 필요 없이 그대로 재사용된다.
export default function GroupTabLayout({ tabs, children }: GroupTabLayoutProps) {
  return (
    <div>
      <div className="flex gap-1 border-b border-border-default mb-6">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-xs font-black tracking-widest uppercase border-b-2 transition-all ${
              tab.active ? 'border-brand text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
