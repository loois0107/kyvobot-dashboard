import { NextResponse } from 'next/server';
import { requireGuildAdministrator } from '@/lib/auth';
import { verifyChannelBelongsToGuild } from '@/lib/reactionRoles';

export const dynamic = 'force-dynamic';

/**
 * GET: 채널ID+메시지ID로 실제 메시지가 존재하는지 봇 토큰으로 직접 확인하고, 미리보기(작성자/
 * 내용 일부/시간)를 돌려준다. 저장은 안 하는, 순수 조회용 - 실제 바인딩 생성(이모지 부착)은
 * POST /api/reaction-roles/[guildId]에서 내부 웹훅을 통해 봇이 처리한다.
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdministrator(guildId);
  if (blocked) return blocked;

  const url = new URL(request.url);
  const channelId = url.searchParams.get('channel_id');
  const messageId = url.searchParams.get('message_id');
  if (!channelId || !messageId) {
    return NextResponse.json({ status: 'error', message: 'channel_id and message_id are both required.' }, { status: 400 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ status: 'error', message: 'Server configuration error (missing bot token).' }, { status: 500 });
  }

  // 🛡️ channel_id가 실제로 이 guildId 소속인지 먼저 확인한다 - 안 그러면 봇이 속한 다른 서버의
  // channel_id+message_id를 아는 사람이 그 서버 메시지를 미리볼 수 있다(크로스-테넌트 유출).
  const channelRes = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  const channelData = channelRes.ok ? await channelRes.json() : null;
  const channelCheck = verifyChannelBelongsToGuild(channelData, guildId);
  if (!channelCheck.ok) {
    const message = channelCheck.reason === 'guild_mismatch'
      ? "That channel doesn't belong to this server."
      : 'That channel could not be found.';
    return NextResponse.json({ status: 'error', message }, { status: channelCheck.reason === 'guild_mismatch' ? 403 : 404 });
  }

  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (res.status === 404) {
    return NextResponse.json({ status: 'error', message: 'No message with that ID was found in that channel.' }, { status: 404 });
  }
  if (!res.ok) {
    console.error('[REACTION_ROLES][ERROR] Message preview fetch failed:', res.status);
    return NextResponse.json({ status: 'error', message: `Discord returned an error (${res.status}). Double-check the channel/message IDs.` }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({
    status: 'success',
    message: {
      author: data.author?.username || 'Unknown',
      content: (data.content || '(no text content)').slice(0, 200),
      timestamp: data.timestamp,
      jump_url: `https://discord.com/channels/${guildId}/${channelId}/${messageId}`,
    },
  });
}
