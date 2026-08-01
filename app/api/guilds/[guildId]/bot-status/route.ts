import { NextResponse } from 'next/server';
import { requireGuildAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface DiscordGuild {
  id: string;
}

/**
 * GET: 이 guildId에 Kyvo 봇이 실제로 초대되어 있는지 확인한다 - 대시보드 레이아웃이 하위
 * 페이지를 렌더링하기 전에 한 번 거치는 게이트. 유저의 Discord 권한(owner/MANAGE_GUILD)과
 * 봇의 서버 참여 여부는 완전히 별개라, verifyGuildAdmin 계열은 봇이 없어도 그냥 통과시킨다 -
 * 그 결과 채널/역할 드롭다운·통계 등이 이유 설명 없이 조용히 반쪽짜리로 나오던 문제가 있었다.
 *
 * GET /users/@me/guilds(봇 토큰)는 길드별 조회가 아니라 봇이 속한 서버 전체 목록을 한 번에
 * 반환하므로, revalidate 캐시를 걸면 어떤 guildId로 호출되든 60초 창 안에서는 실제 Discord
 * 호출 없이 로컬 배열 비교로 끝난다 - verifyGuildAdmin 등 기존 코드가 이미 쓰는 캐싱 관례를
 * 그대로 재사용.
 *
 * TODO: 이 엔드포인트는 기본 200개 서버까지만 한 페이지로 반환한다. 봇이 200개 서버를 넘기면
 * after 파라미터로 페이지네이션을 처리해야 정확해진다 - 지금은 봇이 그보다 훨씬 적은 서버에만
 * 있어서 보류.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'Server configuration error (missing bot token).' }, { status: 500 });
  }

  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bot ${botToken}` },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    console.error('[BOT_STATUS][ERROR] Discord bot guild list fetch failed:', res.status);
    return NextResponse.json(
      { error: `Discord returned an error (${res.status}) while checking bot membership.` },
      { status: 502 }
    );
  }

  const botGuilds: DiscordGuild[] = await res.json();
  const botPresent = botGuilds.some((g) => g.id === guildId);

  return NextResponse.json({ bot_present: botPresent });
}
