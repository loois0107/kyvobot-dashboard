import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type SidebarNavLinkProps = {
  href: string;
  children: React.ReactNode;
  /** 🛡️ [판정 로직은 호출부 책임] layout.tsx가 링크마다 쓰던 판정 기준이 서로 달랐다 -
      Control Hub Home만 `pathname === exactPath`(정확히 일치), 나머지 16개는
      `pathname?.includes('/xxx')`(부분 문자열 포함). 이 컴포넌트가 그 판정 로직까지 떠안으면
      "스타일만 이관"이 아니라 로직도 새로 만드는 셈이 되어 버려서, 계산된 결과(boolean)만
      받는다 - 어떤 링크가 무슨 기준으로 active인지는 호출부(layout.tsx)가 예전 그대로 계산한다. */
  active?: boolean;
  /** 어떤 아이콘을 쓸지도 판정 로직과 같은 이유로 호출부가 정한다 - 이 컴포넌트는 배치만 담당. */
  icon?: LucideIcon;
};

// 예전엔 19개 링크 전부 아래 3항 조건식을 그대로 복붙: pathname?.includes(...) ? 'bg-[#404249]
// text-white' : 'hover:bg-[#35373c] text-[#b5bac1] hover:text-[#dbdee1]'. 이 컴포넌트가 그
// 반복을 대체한다 - active는 배경을 채우는 방식 그대로 유지(bg-elevated + text-primary),
// 기본/hover는 새 토큰(text-secondary -> hover 시 bg-surface + text-primary)으로 옮겼다.
export default function SidebarNavLink({ href, children, active = false, icon: Icon }: SidebarNavLinkProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium border-l-2 transition hover:scale-[1.01] active:scale-[0.99] ${
        active
          ? 'bg-bg-elevated text-text-primary border-brand'
          : 'text-text-secondary border-transparent hover:bg-bg-surface hover:text-text-primary'
      }`}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {children}
    </Link>
  );
}
