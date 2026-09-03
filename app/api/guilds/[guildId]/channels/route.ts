import { NextResponse } from 'next/server';
import { requireGuildAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GUILD_TEXT and GUILD_ANNOUNCEMENT - the only channel types the dashboard's text-input-turned-
// dropdown fields (welcome/goodbye channel, reaction role target, etc.) ever point at.
const TEXT_CHANNEL_TYPES = new Set([0, 5]);
// GUILD_CATEGORY - used only by the party-settings category picker (?type=category).
const CATEGORY_CHANNEL_TYPES = new Set([4]);

interface DiscordChannel {
  id: string;
  type: number;
  name: string;
  position: number;
}

/**
 * GET: 이 서버의 텍스트/공지 채널 목록을 봇 토큰으로 가져온다 - 대시보드 곳곳에 흩어져 있던
 * "채널 ID를 직접 입력하세요" 텍스트 입력을 드롭다운으로 바꾸기 위한 공용 엔드포인트.
 * Discord API는 봇의 채널별 열람 권한과 무관하게 서버의 채널 전체를 돌려주므로, 여기서도
 * 별도 권한 필터링 없이 텍스트/공지 채널이면 전부 포함한다 - 실제로 봇이 접근 못 하는
 * 채널을 골라도, 저장/실행 시점에 지금(수동 ID 입력)과 동일하게 에러로 걸러진다.
 *
 * requireGuildAdmin(MANAGE_GUILD)을 쓴다 - 이 엔드포인트를 쓰는 5개 페이지 중 4개(welcome,
 * voice, anonymous-reports, party-settings)가 이미 그 기준이라, 여기만 reaction-roles의
 * requireGuildAdministrator(ADMINISTRATOR)로 더 엄격하게 걸면 그 4곳에서 정상적으로 페이지에
 * 접근 가능한 유저가 채널 드롭다운만 못 불러오는 회귀가 생긴다. ADMINISTRATOR는 항상
 * MANAGE_GUILD를 내포하므로 reaction-roles 쪽엔 영향 없다.
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const wantCategories = searchParams.get('type') === 'category';
  const allowedTypes = wantCategories ? CATEGORY_CHANNEL_TYPES : TEXT_CHANNEL_TYPES;

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'Server configuration error (missing bot token).' }, { status: 500 });
  }

  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!res.ok) {
    console.error('[GUILD_CHANNELS][ERROR] Discord channel list fetch failed:', res.status);
    return NextResponse.json(
      { error: `Discord returned an error (${res.status}) while listing channels.` },
      { status: 502 }
    );
  }

  const channels: DiscordChannel[] = await res.json();
  const filtered = channels
    .filter((c) => allowedTypes.has(c.type))
    .sort((a, b) => a.position - b.position)
    .map((c) => ({ id: c.id, name: c.name }));

  return NextResponse.json(filtered);
}
