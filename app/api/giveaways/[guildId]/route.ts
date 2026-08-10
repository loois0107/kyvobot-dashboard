import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdmin, requireGuildAdministrator } from '@/lib/auth';
import { ADMINISTRATOR, DANGEROUS_PERMS, computeBotHierarchy, type DiscordRole } from '@/lib/tierRoles';
import { GIVEAWAY_MIN_DURATION_MINUTES, GIVEAWAY_MAX_DURATION_MINUTES, GIVEAWAY_PRIZE_MAX_LENGTH } from '@/lib/giveawaySettings';

export const dynamic = 'force-dynamic';

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

// reaction-roles/[guildId]/route.ts와 동일한 패턴 - 각 라우트가 자기 완결적이도록 복제한다.
async function fetchGuildRoles(guildId: string): Promise<Array<{ id: string; name: string }> | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return null;
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  return res.json();
}

// POST 전용 헬퍼 3종 - 위험 권한 평가를 위해 permissions/position/managed까지 포함한 "완전한"
// 역할 목록이 필요하다(위의 fetchGuildRoles는 GET에서 이름만 필요해 {id,name}으로 충분). twitch
// POST 라우트와 동일한 패턴 - 라우트마다 자기 완결적으로 복제.
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

interface WinnerInfo {
  user_id: string;
  username: string | null;
  in_server: boolean;
}

// 길드 멤버 엔드포인트로 조회한다(단순 유저 조회가 아니라) - 404면 "이 서버를 나갔다"는 뜻이라,
// 재추첨 사유(자격 문제/서버 이탈)를 관리자가 바로 판단할 수 있게 해준다.
async function fetchWinnerInfo(guildId: string, userId: string): Promise<WinnerInfo> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return { user_id: userId, username: null, in_server: false };
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
      next: { revalidate: 30 },
    });
    if (!res.ok) return { user_id: userId, username: null, in_server: false };
    const data = await res.json();
    const username = data.user?.global_name || data.user?.username || data.nick || null;
    return { user_id: userId, username, in_server: true };
  } catch {
    return { user_id: userId, username: null, in_server: false };
  }
}

/**
 * GET: 이미 마감되고(status='concluded') 당첨자가 있는 추첨 목록을 반환한다 - 재추첨 UI 전용.
 * 진행 중인 추첨은 여기서 다루지 않는다(조기 마감은 /giveaway end 명령어 전용).
 * 당첨자는 이미 채널에 공개 발표된 정보라 익명 제보와 달리 user_id 노출에 제약이 없다.
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdmin(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { data, error } = await supabase
    .from('giveaways')
    .select('id, prize, prize_type, prize_amount, prize_role_id, winners, concluded_at')
    .eq('guild_id', guildId)
    .eq('status', 'concluded')
    .order('concluded_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[GIVEAWAY][ERROR]', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }

  // 컬럼 타입(jsonb array)에 상관없이 안전하게 걸러내기 위해 DB 필터 대신 여기서 빈 배열을 뺀다.
  const rows = (data || []).filter((row) => Array.isArray(row.winners) && row.winners.length > 0);
  const roles = await fetchGuildRoles(guildId);
  const roleById = new Map((roles || []).map((r) => [r.id, r.name]));

  const giveaways = await Promise.all(
    rows.map(async (row) => {
      const winnerIds: string[] = Array.isArray(row.winners) ? row.winners : [];
      const winners = await Promise.all(winnerIds.map((uid) => fetchWinnerInfo(guildId, uid)));
      return {
        id: row.id,
        prize: row.prize,
        prize_type: row.prize_type,
        prize_amount: row.prize_amount,
        prize_role_id: row.prize_role_id,
        prize_role_name: row.prize_role_id ? roleById.get(row.prize_role_id) || null : null,
        concluded_at: row.concluded_at,
        winners,
      };
    })
  );

  return NextResponse.json({ status: 'success', giveaways });
}

/**
 * POST: 새 추첨을 생성한다(대시보드판 /giveaway points, /giveaway role). 이 파일의 다른
 * 라우트(GET/replace-winner)는 requireGuildAdmin(MANAGE_GUILD)을 쓰지만, giveaway_group
 * 커맨드 자체가 default_permissions(administrator=True)라 이 라우트만 그 기준에 맞춰
 * requireGuildAdministrator를 쓴다 - 기존 라우트의 기준은 이번에 건드리지 않는다.
 *
 * prize/entry_cost/winner_count/duration_minutes/prize_amount 범위는 여기서도 즉시 검증하지만,
 * authoritative한 최종 판단은 항상 봇의 _create_giveaway_core()가 다시 한다 - 이 라우트가
 * 조작된 요청으로 우회되더라도 봇 쪽 검증을 통과할 수 없다. 위험 권한 역할만은 여기서 미리
 * 역할 데이터를 당겨와 판정한다(reaction-roles/twitch POST와 동일한 이유 - confirmedDangerous
 * 없이 게이트 없는 웹훅을 호출하면 확인 UI 자체가 뜰 기회가 없기 때문).
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

  const {
    prize, channel_id, entry_cost, winner_count, duration_minutes,
    prize_type, prize_amount, prize_role_id, confirmedDangerous,
  } = body || {};

  if (!prize || !channel_id || (prize_type !== 'points' && prize_type !== 'role')) {
    return NextResponse.json(
      { status: 'error', message: "prize, channel_id, and prize_type ('points' or 'role') are all required.", code: 'missing_fields' },
      { status: 400 }
    );
  }

  if (String(prize).length > GIVEAWAY_PRIZE_MAX_LENGTH) {
    return NextResponse.json(
      { status: 'error', message: `Prize name is too long (max ${GIVEAWAY_PRIZE_MAX_LENGTH} characters).`, code: 'prize_too_long' },
      { status: 400 }
    );
  }

  const entryCostNum = Number(entry_cost);
  const winnerCountNum = Number(winner_count);
  const durationNum = Number(duration_minutes);
  const prizeAmountNum = prize_amount !== undefined && prize_amount !== null ? Number(prize_amount) : null;

  const invalidMetrics =
    !Number.isFinite(entryCostNum) || entryCostNum <= 0 ||
    !Number.isFinite(winnerCountNum) || winnerCountNum <= 0 ||
    (prize_type === 'points' && (!Number.isFinite(prizeAmountNum) || (prizeAmountNum as number) <= 0));
  if (invalidMetrics) {
    return NextResponse.json(
      { status: 'error', message: 'Entry cost, winner count, and (for points prizes) prize amount must all be positive numbers.', code: 'invalid_metrics' },
      { status: 400 }
    );
  }

  if (!Number.isFinite(durationNum) || durationNum < GIVEAWAY_MIN_DURATION_MINUTES || durationNum > GIVEAWAY_MAX_DURATION_MINUTES) {
    return NextResponse.json(
      { status: 'error', message: `Duration must be between ${GIVEAWAY_MIN_DURATION_MINUTES} and ${GIVEAWAY_MAX_DURATION_MINUTES} minutes.`, code: 'duration_out_of_range' },
      { status: 400 }
    );
  }

  if (prize_type === 'role') {
    if (!prize_role_id) {
      return NextResponse.json({ status: 'error', message: 'A prize role is required for role-type giveaways.', code: 'role_required' }, { status: 400 });
    }

    const [roles, botUserId] = await Promise.all([fetchGuildRolesWithPermissions(guildId), fetchBotUserId()]);
    if (!roles || !botUserId) {
      return NextResponse.json({ status: 'error', message: 'Failed to fetch role/bot data from Discord.', code: 'discord_fetch_failed' }, { status: 502 });
    }
    const botRoleIds = await fetchBotMemberRoleIds(guildId, botUserId);
    if (!botRoleIds) {
      return NextResponse.json({ status: 'error', message: "Failed to fetch the bot's own roles from Discord.", code: 'discord_fetch_failed' }, { status: 502 });
    }

    const role = roles.find((r) => r.id === prize_role_id);
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

  let createRes: Response;
  try {
    createRes = await fetch(`${baseUrl}/internal/giveaway/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': secret },
      body: JSON.stringify({
        guild_id: guildId,
        channel_id,
        prize,
        entry_cost: entryCostNum,
        winner_count: winnerCountNum,
        duration_minutes: durationNum,
        prize_type,
        prize_amount: prize_type === 'points' ? prizeAmountNum : null,
        prize_role_id: prize_type === 'role' ? prize_role_id : null,
        created_by: 'dashboard',
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    console.error('[GIVEAWAY][ERROR] Create webhook call failed:', err);
    return NextResponse.json({ status: 'error', message: 'Could not reach Kyvo to create this giveaway. Is it online?', code: 'unreachable' }, { status: 502 });
  }

  let createBody: any = null;
  try {
    createBody = await createRes.json();
  } catch {
    // no body
  }

  if (!createRes.ok) {
    const code = createBody?.status || 'unknown';
    const reasonMap: Record<string, string> = {
      prize_too_long: `Prize name is too long (max ${GIVEAWAY_PRIZE_MAX_LENGTH} characters).`,
      invalid_metrics: 'Entry cost, winner count, and prize amount must all be positive numbers.',
      duration_out_of_range: `Duration must be between ${GIVEAWAY_MIN_DURATION_MINUTES} and ${GIVEAWAY_MAX_DURATION_MINUTES} minutes.`,
      role_required: 'A prize role is required for role-type giveaways.',
      role_is_admin: 'This role has Administrator permissions and can never be used here.',
      bot_missing_manage_roles: "Kyvo doesn't have the Manage Roles permission in this server.",
      role_hierarchy_blocked: "This role is positioned above (or equal to) Kyvo's own role.",
      save_failed: 'Failed to save the giveaway. Please try again.',
      post_failed: "Kyvo couldn't post the giveaway announcement in that channel. Check that it has permission to send messages and embed links there.",
      message_id_save_failed: 'The giveaway was posted, but Kyvo failed to fully save it - the entry button may not work correctly.',
    };
    const message = reasonMap[code] || `Kyvo returned an unexpected error (${createRes.status}).`;
    return NextResponse.json({ status: 'error', message, code }, { status: createRes.status });
  }

  return NextResponse.json({ status: 'success', giveaway_id: createBody?.giveaway_id, ends_at: createBody?.ends_at });
}
