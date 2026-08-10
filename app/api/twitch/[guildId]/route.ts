import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdministrator } from '@/lib/auth';
import { computePollHealth, computeRoleGrantStatus } from '@/lib/twitchStatus';
import { ADMINISTRATOR, DANGEROUS_PERMS, computeBotHierarchy, type DiscordRole } from '@/lib/tierRoles';

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

async function fetchGuildRoles(guildId: string): Promise<{ id: string; name: string }[] | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return null;
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  return res.json();
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

// POST 전용 헬퍼 3종 - reaction-roles/[guildId]/route.ts와 동일한 패턴(위험 권한 평가를 위해
// permissions/position/managed까지 포함한 "완전한" 역할 목록이 필요하다). 위의 fetchGuildRoles는
// GET에서 표시명만 필요해 {id,name}으로 충분하지만, 여긴 별도로 둔다 - 세션 전반의 관례대로
// 라우트마다 자기 완결적으로 복제.
async function fetchGuildRolesWithPermissions(guildId: string): Promise<DiscordRole[] | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return null;
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchBotUserId(): Promise<string | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return null;
  const res = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bot ${botToken}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.id as string;
}

async function fetchBotMemberRoleIds(guildId: string, botUserId: string): Promise<string[] | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return null;
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${botUserId}`, {
    headers: { Authorization: `Bot ${botToken}` },
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.roles as string[];
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
  const roles = await fetchGuildRoles(guildId);
  const roleById = new Map((roles || []).map((r) => [r.id, r]));

  const result = await Promise.all(
    configs.map(async (cfg) => {
      const streamer = streamerByBroadcasterId.get(cfg.broadcaster_id);
      const health = computePollHealth(streamer?.last_checked_at ?? null);

      const [channelName, memberName] = await Promise.all([
        fetchChannelName(cfg.announcement_channel_id),
        cfg.member_id ? fetchMemberDisplayName(guildId, cfg.member_id) : Promise.resolve(null),
      ]);
      const liveRoleName = cfg.live_role_id ? (roleById.get(cfg.live_role_id)?.name || `Unknown role (${cfg.live_role_id})`) : null;

      return {
        broadcaster_id: cfg.broadcaster_id,
        broadcaster_login: streamer?.broadcaster_login || '(unknown)',
        is_live: streamer?.is_live ?? false,
        last_checked_at: streamer?.last_checked_at ?? null,
        poll_health: health.status,
        minutes_since_last_check: health.minutesSinceLastCheck,
        announcement_channel_id: cfg.announcement_channel_id,
        announcement_channel_name: channelName,
        live_role_name: liveRoleName,
        role_grant_status: computeRoleGrantStatus(cfg.member_id, cfg.live_role_id),
        member_id: cfg.member_id,
        member_display_name: memberName,
        live_role_id: cfg.live_role_id,
      };
    })
  );

  return NextResponse.json({ status: 'success', streamers: result });
}

/**
 * POST: 새 스트리머를 등록한다(대시보드판 /twitch_channel_set). role_needs_member/channel 권한/
 * 트위치 존재 여부 등 "봇이 아니면 확인 불가능한" 검증은 여기서 하지 않고 그대로 봇의
 * /internal/twitch/set 웹훅에 위임한다 - reaction-roles POST와 동일한 정신(웹훅 실패 시 유령
 * 등록이 생기는 걸 막기 위해 여기서 DB에 직접 쓰지 않음). 다만 위험 권한 2단계 확인만은 역할
 * 데이터를 미리 당겨와 웹훅 호출 전에 여기서 판정한다 - confirmedDangerous 없이 게이트 없는
 * 웹훅을 호출하면 확인 UI 자체가 뜰 기회가 없기 때문(reaction-roles POST와 동일한 이유).
 */
export async function POST(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdministrator(guildId);
  if (blocked) return blocked;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid request body.' }, { status: 400 });
  }

  const { streamer, channel_id, member_id, role_id, confirmedDangerous } = body || {};
  if (!streamer || !channel_id) {
    return NextResponse.json({ status: 'error', message: 'streamer and channel_id are required.', code: 'missing_fields' }, { status: 400 });
  }
  if (role_id && !member_id) {
    return NextResponse.json({ status: 'error', message: 'A live role requires a linked member too.', code: 'role_needs_member' }, { status: 400 });
  }

  if (role_id) {
    const [roles, botUserId] = await Promise.all([fetchGuildRolesWithPermissions(guildId), fetchBotUserId()]);
    if (!roles || !botUserId) {
      return NextResponse.json({ status: 'error', message: 'Failed to fetch role/bot data from Discord.', code: 'discord_fetch_failed' }, { status: 502 });
    }
    const botRoleIds = await fetchBotMemberRoleIds(guildId, botUserId);
    if (!botRoleIds) {
      return NextResponse.json({ status: 'error', message: "Failed to fetch the bot's own roles from Discord.", code: 'discord_fetch_failed' }, { status: 502 });
    }

    const role = roles.find((r) => r.id === role_id);
    if (!role) {
      return NextResponse.json({ status: 'error', message: 'That role no longer exists.', code: 'role_not_found' }, { status: 400 });
    }

    const perms = BigInt(role.permissions);
    const { topPosition, hasManageRoles } = computeBotHierarchy(guildId, roles, botRoleIds);

    if ((perms & ADMINISTRATOR) === ADMINISTRATOR) {
      return NextResponse.json({ status: 'error', message: 'This role has Administrator permissions and can never be used here.', code: 'role_is_admin' }, { status: 400 });
    }
    if (!hasManageRoles) {
      return NextResponse.json({ status: 'error', message: "Kyvo doesn't have the Manage Roles permission in this server.", code: 'bot_missing_manage_roles' }, { status: 400 });
    }
    if (role.position >= topPosition) {
      return NextResponse.json({ status: 'error', message: "This role is positioned above (or equal to) Kyvo's own role.", code: 'role_hierarchy_blocked' }, { status: 400 });
    }

    const dangerous = Object.entries(DANGEROUS_PERMS)
      .filter(([, bit]) => (perms & bit) === bit)
      .map(([name]) => name);
    if (dangerous.length > 0 && !confirmedDangerous) {
      return NextResponse.json({ status: 'needs_confirmation', dangerous_permissions: dangerous }, { status: 409 });
    }
  }

  const baseUrl = process.env.KYVOBOT_BASE_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!baseUrl || !secret) {
    return NextResponse.json(
      { status: 'error', message: 'Server configuration error (KYVOBOT_BASE_URL/INTERNAL_API_SECRET not set).', code: 'server_config' },
      { status: 500 }
    );
  }

  let setRes: Response;
  try {
    setRes = await fetch(`${baseUrl}/internal/twitch/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': secret },
      body: JSON.stringify({
        guild_id: guildId,
        channel_id,
        streamer,
        member_id: member_id || null,
        role_id: role_id || null,
        created_by: 'dashboard',
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    console.error('[TWITCH_ADMIN][ERROR] Set webhook call failed:', err);
    return NextResponse.json({ status: 'error', message: 'Could not reach Kyvo to add this streamer. Is it online?', code: 'unreachable' }, { status: 502 });
  }

  let setBody: any = null;
  try {
    setBody = await setRes.json();
  } catch {
    // no body
  }

  if (!setRes.ok) {
    const code = setBody?.status || 'unknown';
    const reasonMap: Record<string, string> = {
      role_needs_member: 'A live role requires a linked member too.',
      channel_permission_denied: "Kyvo can't send messages/embeds in that channel.",
      role_is_admin: 'This role has Administrator permissions and can never be used here.',
      bot_missing_manage_roles: "Kyvo doesn't have the Manage Roles permission in this server.",
      role_hierarchy_blocked: "This role is positioned above (or equal to) Kyvo's own role.",
      streamer_not_found: `No Twitch channel found for "${setBody?.streamer || streamer}". Double-check the spelling.`,
      subscription_failed: 'Failed to set up Twitch notifications right now. Please try again later.',
      save_failed: 'Failed to save. Please try again.',
    };
    const message = reasonMap[code] || `Kyvo returned an unexpected error (${setRes.status}).`;
    return NextResponse.json({ status: 'error', message, code, streamer: setBody?.streamer || streamer }, { status: setRes.status });
  }

  return NextResponse.json({ status: 'success', streamer: setBody?.streamer || streamer });
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
