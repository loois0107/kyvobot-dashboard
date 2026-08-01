import { NextResponse } from 'next/server';
import { requireGuildAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

/**
 * GET: 이 서버의 유저가 직접 부여 가능한 역할 목록을 봇 토큰으로 가져온다 - tier-roles/
 * reaction-roles 라우트에 각각 복제되어 있던 "managed 역할과 @everyone 제외, position 역순 정렬"
 * 필터링을 공용 엔드포인트로 뽑아낸 버전. leveling 페이지의 레벨업 역할 보상 드롭다운이 세 번째
 * 소비처가 되는 시점이라 분리했다 - tier-roles/reaction-roles는 위험 권한 평가 등 자기들만의
 * 추가 로직이 있어 그대로 두고, 이 라우트는 "순수 선택 목록"만 필요한 곳에서 쓴다.
 *
 * requireGuildAdmin(MANAGE_GUILD)을 쓴다 - 지금 유일한 소비처인 leveling 페이지의 저장 라우트도
 * 같은 기준이라, ChannelSelect의 /api/guilds/{guildId}/channels 라우트를 만들 때와 동일한 이유로
 * 이 기준을 그대로 따른다.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'Server configuration error (missing bot token).' }, { status: 500 });
  }

  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!res.ok) {
    console.error('[GUILD_ROLES][ERROR] Discord role list fetch failed:', res.status);
    return NextResponse.json(
      { error: `Discord returned an error (${res.status}) while listing roles.` },
      { status: 502 }
    );
  }

  const roles: DiscordRole[] = await res.json();
  const assignableRoles = roles
    .filter((r) => !r.managed && r.id !== guildId)
    .sort((a, b) => b.position - a.position)
    .map((r) => ({ id: r.id, name: r.name, color: r.color }));

  return NextResponse.json(assignableRoles);
}
