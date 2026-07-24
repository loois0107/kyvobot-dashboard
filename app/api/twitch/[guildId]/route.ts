import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdministrator } from '@/lib/auth';
import { computePollHealth } from '@/lib/twitchStatus';

export const dynamic = 'force-dynamic';

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

async function fetchChannelName(channelId: string): Promise<string | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return null;
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
    headers: { Authorization: `Bot ${botToken}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.name || null;
}

async function fetchMemberDisplayName(guildId: string, userId: string): Promise<string | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return null;
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.nick || data.user?.global_name || data.user?.username || null;
}

/**
 * GET: 이 서버에 등록된 트위치 스트리머 목록 + 라이브 상태 + 폴링 건강 배지 + 채널/멤버 표시명.
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdministrator(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { data: configs, error: configError } = await supabase
    .from('twitch_guild_configs')
    .select('*')
    .eq('guild_id', guildId);
  if (configError) {
    console.error('[TWITCH_ADMIN][ERROR]', configError);
    return NextResponse.json({ status: 'error', message: configError.message }, { status: 500 });
  }

  if (!configs || configs.length === 0) {
    return NextResponse.json({ status: 'success', streamers: [] });
  }

  const broadcasterIds = configs.map((c) => c.broadcaster_id);
  const { data: streamers, error: streamerError } = await supabase
    .from('twitch_streamers')
    .select('*')
    .in('broadcaster_id', broadcasterIds);
  if (streamerError) {
    console.error('[TWITCH_ADMIN][ERROR]', streamerError);
    return NextResponse.json({ status: 'error', message: streamerError.message }, { status: 500 });
  }

  const streamerByBroadcasterId = new Map((streamers || []).map((s) => [s.broadcaster_id, s]));

  const result = await Promise.all(
    configs.map(async (cfg) => {
      const streamer = streamerByBroadcasterId.get(cfg.broadcaster_id);
      const health = computePollHealth(streamer?.last_checked_at ?? null);

      const [channelName, memberName] = await Promise.all([
        fetchChannelName(cfg.announcement_channel_id),
        cfg.member_id ? fetchMemberDisplayName(guildId, cfg.member_id) : Promise.resolve(null),
      ]);

      return {
        broadcaster_id: cfg.broadcaster_id,
        broadcaster_login: streamer?.broadcaster_login || '(unknown)',
        is_live: streamer?.is_live ?? false,
        last_checked_at: streamer?.last_checked_at ?? null,
        poll_health: health.status,
        minutes_since_last_check: health.minutesSinceLastCheck,
        announcement_channel_id: cfg.announcement_channel_id,
        announcement_channel_name: channelName,
        member_id: cfg.member_id,
        member_display_name: memberName,
        live_role_id: cfg.live_role_id,
      };
    })
  );

  return NextResponse.json({ status: 'success', streamers: result });
}

/**
 * DELETE: 이 서버에서 스트리머 등록을 해제한다. 실제 취소 로직(다른 서버 참조 없으면 구독까지
 * 취소)은 봇에게 위임한다 - /twitch_channel_remove와 동일한 로직을 여기서 재구현하지 않는다.
 */
export async function DELETE(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdministrator(guildId);
  if (blocked) return blocked;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid request body.' }, { status: 400 });
  }

  const broadcasterId = body.broadcaster_id;
  if (!broadcasterId) {
    return NextResponse.json({ status: 'error', message: 'broadcaster_id is required.' }, { status: 400 });
  }

  const baseUrl = process.env.KYVOBOT_BASE_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!baseUrl || !secret) {
    return NextResponse.json(
      { status: 'error', message: 'Server configuration error (KYVOBOT_BASE_URL/INTERNAL_API_SECRET not set).' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${baseUrl}/internal/twitch/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': secret },
      body: JSON.stringify({ guild_id: guildId, broadcaster_id: broadcasterId }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 404) {
      return NextResponse.json({ status: 'error', message: 'This streamer is not registered in this server.' }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ status: 'error', message: `Kyvo returned an unexpected error (${res.status}).` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ status: 'success', subscriptions_also_removed: data.subscriptions_also_removed });
  } catch (err) {
    console.error('[TWITCH_ADMIN][ERROR] Removal request to bot failed:', err);
    return NextResponse.json({ status: 'error', message: "Failed to reach Kyvo to process the removal. It may be temporarily unavailable." }, { status: 502 });
  }
}
