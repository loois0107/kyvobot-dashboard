import { NextResponse } from 'next/server';
import { requireGuildAdministrator } from '@/lib/auth';
import { verifyChannelBelongsToGuild, extractPreviewText, type DiscordMessage } from '@/lib/reactionRoles';

export const dynamic = 'force-dynamic';

const MESSAGE_LIMIT = 20;
const PREVIEW_MAX_LENGTH = 150;

/**
 * GET: reaction-roles 메시지 선택 UI용 - 이 채널의 최근 20개 메시지를 봇 토큰으로 가져와
 * 작성자/미리보기 텍스트/시간을 목록으로 돌려준다. preview 라우트와 동일하게
 * verifyChannelBelongsToGuild로 channelId가 이 guildId 소속인지 먼저 확인한다(크로스-테넌트
 * 방지) - 이 라우트도 결국 채널 콘텐츠를 노출하므로 preview와 같은 위협 모델이 적용된다.
 * reaction-roles만 쓰는 라우트라 preview와 같은 requireGuildAdministrator를 그대로 쓴다.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ guildId: string; channelId: string }> }) {
  const { guildId, channelId } = await ctx.params;
  const blocked = await requireGuildAdministrator(guildId);
  if (blocked) return blocked;

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'Server configuration error (missing bot token).' }, { status: 500 });
  }

  const channelRes = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  const channelData = channelRes.ok ? await channelRes.json() : null;
  const channelCheck = verifyChannelBelongsToGuild(channelData, guildId);
  if (!channelCheck.ok) {
    const message = channelCheck.reason === 'guild_mismatch'
      ? "That channel doesn't belong to this server."
      : 'That channel could not be found.';
    return NextResponse.json({ error: message }, { status: channelCheck.reason === 'guild_mismatch' ? 403 : 404 });
  }

  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=${MESSAGE_LIMIT}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!res.ok) {
    console.error('[GUILD_CHANNEL_MESSAGES][ERROR] Discord message list fetch failed:', res.status);
    return NextResponse.json(
      { error: `Discord returned an error (${res.status}) while listing messages.` },
      { status: 502 }
    );
  }

  const messages: DiscordMessage[] = await res.json();
  const result = messages.map((m) => ({
    id: m.id,
    author: m.author?.username || 'Unknown',
    preview: extractPreviewText(m).slice(0, PREVIEW_MAX_LENGTH),
    timestamp: m.timestamp,
    jump_url: `https://discord.com/channels/${guildId}/${channelId}/${m.id}`,
  }));

  return NextResponse.json(result);
}
