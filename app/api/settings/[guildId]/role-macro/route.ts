import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdministrator } from '@/lib/auth';
import { invalidateGuildSettings } from '@/lib/redis';
import { ADMINISTRATOR, DANGEROUS_PERMS, computeBotHierarchy, type DiscordRole } from '@/lib/tierRoles';
import { MACRO_TRIGGER_MAX_LENGTH, MACRO_MAX_COUNT } from '@/lib/customCommandsSettings';

export const dynamic = 'force-dynamic';

/** Creates a server-only Supabase client on demand to prevent build-time crashes (settings/route.ts와 동일 패턴). */
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('[SUPABASE][ERROR] Missing Supabase Environment Variables on Server!');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// giveaways/[guildId]/route.ts POST와 동일한 헬퍼 3종 - 각 라우트가 자기 완결적이도록 복제한다.
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
 * POST: 역할 지급/제거형 커스텀 매크로를 생성한다 (대시보드판 /cc_add role_add·role_remove).
 * 텍스트 매크로와 달리 웹훅으로 봇에 위임하지 않는다 - 생성 시점엔 Discord 쪽 액션이 전혀 필요
 * 없고(역할 부여/회수는 나중에 트리거될 때만 발생) custom_commands JSON을 쓰는 게 전부라, 상점
 * 아이템과 같은 이유로 이 라우트가 직접 Supabase에 쓴다.
 *
 * 🛡️ cogs/custom_commands.py의 _create_role_command와 반드시 같은 기준을 유지해야 한다(둘 다
 * 오늘 같은 이유로 생성 시점 체크를 새로 추가했다) - administrator 역할 차단(role_add만),
 * manage_roles 보유 확인, 역할 위계 확인(둘 다 role_add/role_remove 공통), 위험 권한 2차 확인
 * (role_add만, 409 needs_confirmation → confirmedDangerous 재전송).
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;

  if (!/^\d{17,20}$/.test(guildId)) {
    return NextResponse.json({ error: 'Invalid server ID.', code: 'invalid_guild_id' }, { status: 400 });
  }

  const blocked = await requireGuildAdministrator(guildId);
  if (blocked) return blocked;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.', code: 'invalid_body' }, { status: 400 });
  }

  const { name, action, role_id: roleId, confirmedDangerous } = body || {};

  if (action !== 'role_add' && action !== 'role_remove') {
    return NextResponse.json({ error: 'action must be "role_add" or "role_remove".', code: 'invalid_action' }, { status: 400 });
  }
  if (!roleId || typeof roleId !== 'string') {
    return NextResponse.json({ error: 'A role is required.', code: 'role_required' }, { status: 400 });
  }

  // 🛡️ cc_add_group._resolve_cmd_name과 동일한 정규화: strip → lower → "/" 접두어 제거 →
  // "!" 접두어 제거 (Python removeprefix와 동일하게 순서대로 한 번씩만 벗긴다).
  let cmdName = typeof name === 'string' ? name.trim().toLowerCase() : '';
  if (cmdName.startsWith('/')) cmdName = cmdName.slice(1);
  if (cmdName.startsWith('!')) cmdName = cmdName.slice(1);

  if (!cmdName) {
    return NextResponse.json({ error: 'Enter a trigger name.', code: 'name_required' }, { status: 400 });
  }
  if (cmdName.length > MACRO_TRIGGER_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Trigger name must be ${MACRO_TRIGGER_MAX_LENGTH} characters or fewer.`, code: 'trigger_too_long' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseClient();
  const { data, error: fetchError } = await supabase
    .from('guild_settings')
    .select('custom_commands')
    .eq('guild_id', guildId)
    .maybeSingle();

  if (fetchError) {
    console.error('[ROLE_MACRO][ERROR] Supabase fetch failed:', fetchError);
    return NextResponse.json({ error: 'Failed to fetch current macros.', code: 'fetch_failed' }, { status: 500 });
  }

  const customCommands: Record<string, any> = (data?.custom_commands as Record<string, any>) || {};
  const existing = customCommands[cmdName];
  const isNewTrigger = existing === undefined;

  if (isNewTrigger && Object.keys(customCommands).length >= MACRO_MAX_COUNT) {
    return NextResponse.json(
      { error: `This server already has the maximum of ${MACRO_MAX_COUNT} custom macros. Delete one before adding another.`, code: 'max_macros' },
      { status: 400 }
    );
  }

  // 🛡️ 다른 타입의 매크로를 같은 이름으로 조용히 덮어쓰지 않는다 - 같은 타입(예: role_add를
  // role_add로, 역할만 바꿔서)끼리는 "갱신"으로 취급해 허용한다.
  const existingType = existing === undefined ? null : typeof existing === 'string' ? 'text' : existing?.type;
  if (existingType !== null && existingType !== action) {
    return NextResponse.json(
      { error: `"${cmdName}" already exists as a different macro type - delete it first if you want to replace it.`, code: 'name_conflict' },
      { status: 400 }
    );
  }

  const [roles, botUserId] = await Promise.all([fetchGuildRolesWithPermissions(guildId), fetchBotUserId()]);
  if (!roles || !botUserId) {
    return NextResponse.json({ error: 'Failed to fetch role/bot data from Discord.', code: 'discord_fetch_failed' }, { status: 502 });
  }
  const botRoleIds = await fetchBotMemberRoleIds(guildId, botUserId);
  if (!botRoleIds) {
    return NextResponse.json({ error: "Failed to fetch the bot's own roles from Discord.", code: 'discord_fetch_failed' }, { status: 502 });
  }

  const role = roles.find((r) => r.id === roleId);
  if (!role) {
    return NextResponse.json({ error: 'That role no longer exists.', code: 'role_not_found' }, { status: 400 });
  }

  const perms = BigInt(role.permissions);
  const { topPosition, hasManageRoles } = computeBotHierarchy(guildId, roles, botRoleIds);

  // A/1: 관리자 권한 역할 차단 (role_add에만 해당 - role_remove는 권한을 뺏는 것이므로 안전)
  if (action === 'role_add' && (perms & ADMINISTRATOR) === ADMINISTRATOR) {
    return NextResponse.json({ error: 'This role has Administrator permissions and can never be used here.', code: 'role_is_admin' }, { status: 400 });
  }
  // manage_roles 보유/역할 위계 - role_add/role_remove 둘 다 해당 (봇의 _create_role_command와 동일)
  if (!hasManageRoles) {
    return NextResponse.json({ error: "Kyvo doesn't have the Manage Roles permission in this server.", code: 'bot_missing_manage_roles' }, { status: 400 });
  }
  if (role.position >= topPosition) {
    return NextResponse.json({ error: "This role is positioned above (or equal to) Kyvo's own role.", code: 'role_hierarchy_blocked' }, { status: 400 });
  }

  // A/2: 위험 권한 보유 시 2차 확인 (role_add에만 해당)
  if (action === 'role_add') {
    const dangerous = Object.entries(DANGEROUS_PERMS)
      .filter(([, bit]) => (perms & bit) === bit)
      .map(([permName]) => permName);
    if (dangerous.length > 0 && !confirmedDangerous) {
      return NextResponse.json({ status: 'needs_confirmation', dangerous_permissions: dangerous }, { status: 409 });
    }
  }

  customCommands[cmdName] = { type: action, role_id: roleId };

  const { error: upsertError } = await supabase
    .from('guild_settings')
    .upsert({ guild_id: guildId, custom_commands: customCommands }, { onConflict: 'guild_id' });

  if (upsertError) {
    console.error('[ROLE_MACRO][ERROR] Supabase upsert failed:', upsertError);
    return NextResponse.json({ error: 'Failed to save. Please try again.', code: 'save_failed' }, { status: 500 });
  }

  await invalidateGuildSettings(guildId);

  return NextResponse.json({ ok: true, name: cmdName, role_name: role.name });
}
