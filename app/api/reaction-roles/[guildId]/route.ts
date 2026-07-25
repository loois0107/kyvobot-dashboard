import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdministrator } from '@/lib/auth';
import { DiscordRole, computeBotHierarchy, evaluateReactionRoleBinding } from '@/lib/reactionRoles';

export const dynamic = 'force-dynamic';

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

// tier-roles/[guildId]/route.ts와 동일한 헬퍼 3종 - 각 라우트가 자기 완결적이도록 복제한다
// (이 세션 전반의 관례: clean_hex_color, RoleWarningConfirmView 등도 cog마다 복제).
async function fetchGuildRoles(guildId: string): Promise<DiscordRole[] | null> {
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
 * GET: 이 길드의 반응 역할 바인딩 목록 + 선택 가능한 역할 목록을 반환한다.
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdministrator(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const [{ data: bindings, error }, roles] = await Promise.all([
    supabase.from('reaction_roles').select('*').eq('guild_id', guildId).order('created_at', { ascending: false }),
    fetchGuildRoles(guildId),
  ]);

  if (error) {
    console.error('[REACTION_ROLES][ERROR]', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }

  const roleById = new Map((roles || []).map((r) => [r.id, r]));
  const enriched = (bindings || []).map((b) => ({
    ...b,
    role_name: roleById.get(b.role_id)?.name || '(unknown role)',
    role_color: roleById.get(b.role_id)?.color || 0,
    jump_url: `https://discord.com/channels/${guildId}/${b.channel_id}/${b.message_id}`,
  }));

  return NextResponse.json({
    status: 'success',
    bindings: enriched,
    roles: (roles || []).filter((r) => r.id !== guildId && !r.managed),
  });
}

/**
 * POST: 새 반응 역할 바인딩을 만든다. 검증(위험 권한 2단계 확인, tier-roles와 동일한 패턴)까지
 * 통과하면 봇의 내부 웹훅에 위임한다 - 실제 이모지 부착 + DB 저장은 전부 봇 쪽에서 원자적으로
 * 처리되므로, 여기서는 DB에 직접 쓰지 않는다(웹훅 실패 시 유령 매핑이 생기는 걸 막기 위함).
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

  const { channel_id, message_id, emoji, role_id, confirmedDangerous } = body || {};
  if (!channel_id || !message_id || !emoji || !role_id) {
    return NextResponse.json({ status: 'error', message: 'channel_id, message_id, emoji, and role_id are all required.' }, { status: 400 });
  }

  const [roles, botUserId] = await Promise.all([fetchGuildRoles(guildId), fetchBotUserId()]);
  if (!roles || !botUserId) {
    return NextResponse.json({ status: 'error', message: 'Failed to fetch role/bot data from Discord.' }, { status: 502 });
  }
  const botRoleIds = await fetchBotMemberRoleIds(guildId, botUserId);
  if (!botRoleIds) {
    return NextResponse.json({ status: 'error', message: 'Failed to fetch the bot\'s own roles from Discord.' }, { status: 502 });
  }

  const role = roles.find((r) => r.id === role_id);
  if (!role) {
    return NextResponse.json({ status: 'error', message: 'That role no longer exists.' }, { status: 400 });
  }

  const { topPosition, hasManageRoles } = computeBotHierarchy(guildId, roles, botRoleIds);
  const evaluation = evaluateReactionRoleBinding(role, topPosition, hasManageRoles, !!confirmedDangerous);

  if (evaluation.blocked) {
    return NextResponse.json({ status: 'error', message: evaluation.blocked.reason }, { status: 400 });
  }
  if (evaluation.needsConfirmation) {
    return NextResponse.json({
      status: 'needs_confirmation',
      dangerous_permissions: evaluation.needsConfirmation.dangerous_permissions,
    }, { status: 409 });
  }

  const baseUrl = process.env.KYVOBOT_BASE_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!baseUrl || !secret) {
    return NextResponse.json({ status: 'error', message: 'Server configuration error (missing bot integration settings).' }, { status: 500 });
  }

  // requireGuildAdministrator만 유저가 관리자인지 확인할 뿐 유저ID를 안 돌려주므로, 봇 자신을
  // "생성자"로 기록한다(party.py의 다른 내부 웹훅들도 사람 대신 시스템/봇을 행위자로 기록하는 전례가 없어
  // 새로 정하는 값 - created_by는 감사용 정보일 뿐 권한 판단에 쓰이지 않는다).
  let attachRes: Response;
  try {
    attachRes = await fetch(`${baseUrl}/internal/reaction-roles/attach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': secret },
      body: JSON.stringify({
        guild_id: guildId, channel_id, message_id, emoji, role_id, created_by: botUserId,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error('[REACTION_ROLES][ERROR] Attach webhook call failed:', err);
    return NextResponse.json({ status: 'error', message: 'Could not reach the bot to create this binding. Is it online?' }, { status: 502 });
  }

  let attachBody: any = null;
  try {
    attachBody = await attachRes.json();
  } catch {
    // no body
  }

  if (!attachRes.ok) {
    const reasonMap: Record<string, string> = {
      channel_not_found: 'That channel could not be found.',
      message_not_found: 'No message with that ID was found in that channel.',
      admin_role_blocked: 'This role has Administrator permissions and can never be used as a reaction role.',
      no_manage_roles_permission: "Kyvo doesn't have the Manage Roles permission in this server.",
      hierarchy_blocked: "This role is positioned above (or equal to) Kyvo's own role.",
      invalid_emoji: "Discord rejected that emoji - Kyvo couldn't react with it on the target message.",
      db_error: 'Failed to save the binding after attaching the reaction.',
    };
    const message = reasonMap[attachBody?.status] || `The bot rejected this request (${attachRes.status}).`;
    return NextResponse.json({ status: 'error', message }, { status: attachRes.status === 403 ? 502 : 400 });
  }

  return NextResponse.json({ status: 'success' });
}

/**
 * DELETE: ?message_id=&emoji= 로 지정된 바인딩을 지운다. 이미 메시지에 달린 봇의 반응 자체는
 * 건드리지 않는다(매핑이 없으면 어차피 반응해도 역할이 안 붙으니 기능적으로 문제없음) - 의도적
 * 단순화.
 */
export async function DELETE(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdministrator(guildId);
  if (blocked) return blocked;

  const url = new URL(request.url);
  const messageId = url.searchParams.get('message_id');
  const emoji = url.searchParams.get('emoji');
  if (!messageId || !emoji) {
    return NextResponse.json({ status: 'error', message: 'message_id and emoji query parameters are both required.' }, { status: 400 });
  }

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { error } = await supabase
    .from('reaction_roles')
    .delete()
    .eq('guild_id', guildId)
    .eq('message_id', messageId)
    .eq('emoji', emoji);

  if (error) {
    console.error('[REACTION_ROLES][ERROR]', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'success' });
}
