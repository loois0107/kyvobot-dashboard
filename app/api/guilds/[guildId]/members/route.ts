import { NextResponse } from 'next/server';
import { requireGuildAdministrator } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET: ?q=<검색어>로 이 서버의 멤버를 검색한다 (Discord의 GET /guilds/{id}/members/search 사용).
 * roles/channels 라우트와 달리 "전체 목록"이 아니라 "검색"인 이유는, 대형 서버는 멤버가 수만 명일
 * 수 있어 채널/역할처럼 한 번에 다 내려받는 게 불가능하기 때문 - MemberSelect 컴포넌트가 이 라우트를
 * 타이핑할 때마다(디바운스) 호출한다. query가 비어있으면 Discord API 자체가 400을 반환하므로
 * 여기서도 최소 1글자를 요구한다.
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdministrator(guildId);
  if (blocked) return blocked;

  const url = new URL(request.url);
  const query = (url.searchParams.get('q') || '').trim();
  if (!query) {
    return NextResponse.json([]);
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'Server configuration error (missing bot token).' }, { status: 500 });
  }

  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(query)}&limit=10`,
    { headers: { Authorization: `Bot ${botToken}` } }
  );

  if (!res.ok) {
    console.error('[GUILD_MEMBERS][ERROR] Discord member search failed:', res.status);
    return NextResponse.json(
      { error: `Discord returned an error (${res.status}) while searching members.` },
      { status: 502 }
    );
  }

  const members: Array<{ user: { id: string; username: string; global_name?: string | null }; nick?: string | null }> = await res.json();
  const result = members.map((m) => ({
    id: m.user.id,
    display_name: m.nick || m.user.global_name || m.user.username,
    username: m.user.username,
  }));

  return NextResponse.json(result);
}
