'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type ManagedGuild = { id: string; name: string; icon: string | null };

// The dashboard layout already fetches the caller's managed guild list (id + real Discord name) for
// the sidebar's server picker - this just makes that same list available to nested pages, so a
// page needing "what's this guild actually called" doesn't need its own bot-token call or a second
// /api/guilds fetch. No provider in the tree just means an empty list (safe default), so any
// consumer must already tolerate "name not found yet" and fall back to the raw ID.
const GuildsContext = createContext<ManagedGuild[]>([]);

export function GuildsProvider({ guilds, children }: { guilds: ManagedGuild[]; children: ReactNode }) {
  return <GuildsContext.Provider value={guilds}>{children}</GuildsContext.Provider>;
}

export function useGuilds(): ManagedGuild[] {
  return useContext(GuildsContext);
}

/** guildId를 관리 서버 목록에서 찾아 실제 서버 이름을 돌려준다 - 아직 로드 전이거나 목록에 없으면
 * null(호출부가 raw ID 등으로 폴백). */
export function useGuildName(guildId: string | undefined): string | null {
  const guilds = useGuilds();
  if (!guildId) return null;
  return guilds.find((g) => g.id === guildId)?.name ?? null;
}
