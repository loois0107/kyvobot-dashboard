import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdministrator } from '@/lib/auth';
import { TIER_CHOICES, DiscordRole, computeBotHierarchy, evaluateTierSelections } from '@/lib/tierRoles';

export const dynamic = 'force-dynamic';

function connectSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

async function fetchGuildRoles(guildId: string): Promise<DiscordRole[] | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.error('[TIER_ROLES][ERROR] DISCORD_BOT_TOKEN environment variable is not set');
    return null;
  }
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    console.error('[TIER_ROLES][ERROR] 길드 역할 목록 조회 실패:', res.status);
    return null;
  }
  return res.json();
}

async function fetchBotUserId(): Promise<string | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return null;
  const res = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bot ${botToken}` },
    next: { revalidate: 3600 }, // 봇 자신의 유저ID는 절대 안 바뀐다 - 길게 캐싱
  });
  if (!res.ok) {
    console.error('[TIER_ROLES][ERROR] 봇 유저 정보 조회 실패:', res.status);
    return null;
  }
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
  if (!res.ok) {
    console.error('[TIER_ROLES][ERROR] 봇 멤버 정보 조회 실패:', res.status);
    return null;
  }
  const data = await res.json();
  return data.roles as string[];
}

/**
 * 재매핑/해제로 이전 역할이 남는 티어에 대해, 봇에게 "그 이전 역할을 실제로 갖고 있는 멤버
 * 정리"를 위임한다. 봇 프로세스가 이미 멤버 캐시를 갖고 있어(members intent) 대시보드가 직접
 * 페이지네이션으로 전체 멤버를 훑는 것보다 훨씬 저렴하다. 실패해도(봇이 잠깐 다운 등) 저장
 * 자체는 이미 끝난 뒤라 여기서 막지 않는다 - 로그만 남기고 넘어간다(best-effort side effect).
 */
async function triggerTierRoleCleanup(guildId: string, tier: string, oldRoleId: string): Promise<void> {
  const baseUrl = process.env.KYVOBOT_BASE_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!baseUrl || !secret) {
    console.warn('[TIER_ROLES][WARN] KYVOBOT_BASE_URL/INTERNAL_API_SECRET not set - skipping stale role cleanup trigger');
    return;
  }
  try {
    const res = await fetch(`${baseUrl}/internal/tier-roles/cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': secret },
      body: JSON.stringify({ guild_id: guildId, tier, old_role_id: oldRoleId }),
      signal: AbortSignal.timeout(5000), // 봇은 202만 바로 돌려주므로 5초면 충분 - 실제 정리는 봇 쪽 백그라운드
    });
    if (!res.ok) {
      console.warn(`[TIER_ROLES][WARN] Cleanup trigger for tier '${tier}' returned ${res.status}`);
    }
  } catch (err) {
    console.warn(`[TIER_ROLES][WARN] Cleanup trigger for tier '${tier}' failed:`, err);
  }
}

/**
 * GET: 이 서버의 (선택 가능한) 역할 목록 + 현재 party_tier_roles 매핑을 반환한다.
 */
export async function GET(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdministrator(guildId);
  if (blocked) return blocked;

  const roles = await fetchGuildRoles(guildId);
  if (roles === null) {
    return NextResponse.json({ status: 'error', message: "Failed to load this server's roles from Discord." }, { status: 502 });
  }

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  const { data, error } = await supabase.from('party_tier_roles').select('*').eq('guild_id', guildId);
  if (error) {
    console.error('[TIER_ROLES][ERROR]', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }

  const mappings: Record<string, { role_id: string; role_name: string } | null> = {};
  for (const tier of TIER_CHOICES) {
    const row = (data || []).find((r) => r.tier === tier);
    if (row) {
      const role = roles.find((r) => r.id === row.role_id);
      mappings[tier] = { role_id: row.role_id, role_name: role ? role.name : `Unknown role (${row.role_id})` };
    } else {
      mappings[tier] = null;
    }
  }

  // managed(봇 전용/부스트 등 유저가 직접 부여 불가능한) 역할과 @everyone은 선택지에서 제외
  const assignableRoles = roles
    .filter((r) => !r.managed && r.id !== guildId)
    .sort((a, b) => b.position - a.position)
    .map((r) => ({ id: r.id, name: r.name, color: r.color }));

  return NextResponse.json({ status: 'success', tiers: TIER_CHOICES, roles: assignableRoles, mappings });
}

/**
 * POST: 10개 티어를 한 번에 검증+저장한다 (all-or-nothing). 위험권한 역할이 섞여 있으면
 * 저장하지 않고 needs_confirmation으로 목록만 반환 - 프론트가 확인받은 뒤 confirmedDangerous에
 * 해당 tier들을 담아 재요청하면 그때 실제로 반영한다.
 */
export async function POST(request: Request, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const blocked = await requireGuildAdministrator(guildId);
  if (blocked) return blocked;

  const supabase = connectSupabase();
  if (!supabase) return NextResponse.json({ status: 'error', message: 'Server configuration error (missing Supabase credentials).' }, { status: 500 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Invalid request body.' }, { status: 400 });
  }

  const selections: Record<string, string | null> = body.selections || {};
  const confirmedDangerous: string[] = Array.isArray(body.confirmedDangerous) ? body.confirmedDangerous : [];

  for (const tier of Object.keys(selections)) {
    if (!TIER_CHOICES.includes(tier)) {
      return NextResponse.json({ status: 'error', message: `Unknown tier: ${tier}` }, { status: 400 });
    }
  }

  const roles = await fetchGuildRoles(guildId);
  if (roles === null) {
    return NextResponse.json({ status: 'error', message: "Failed to load this server's roles from Discord." }, { status: 502 });
  }

  const botUserId = await fetchBotUserId();
  const botRoleIds = botUserId ? await fetchBotMemberRoleIds(guildId, botUserId) : null;
  if (!botUserId || botRoleIds === null) {
    return NextResponse.json({ status: 'error', message: "Failed to verify Kyvo's own role in this server." }, { status: 502 });
  }
  const { topPosition, hasManageRoles } = computeBotHierarchy(guildId, roles, botRoleIds);

  if (!hasManageRoles) {
    return NextResponse.json(
      { status: 'blocked', blocked: [{ tier: null, role_name: null, reason: "Kyvo doesn't have the Manage Roles permission in this server, so no tier role can be assigned." }] },
      { status: 400 }
    );
  }

  const { blockedItems, needsConfirmation, toUpsert, toDelete } = evaluateTierSelections(roles, topPosition, selections, confirmedDangerous);

  if (blockedItems.length > 0) {
    return NextResponse.json({ status: 'blocked', blocked: blockedItems }, { status: 400 });
  }

  if (needsConfirmation.length > 0) {
    return NextResponse.json({ status: 'needs_confirmation', needsConfirmation }, { status: 409 });
  }

  // 🛡️ 재매핑/해제로 이전 역할이 남는 티어를 미리 파악해둔다(쓰기 전 스냅샷) - 이걸 안 하면
  // "값을 바꿨는데 이전 값을 가진 멤버는 그대로 남는" 문제가 생긴다.
  const { data: existingRows, error: existingError } = await supabase
    .from('party_tier_roles')
    .select('tier, role_id')
    .eq('guild_id', guildId);
  if (existingError) {
    console.error('[TIER_ROLES][ERROR]', existingError);
    return NextResponse.json({ status: 'error', message: existingError.message }, { status: 500 });
  }
  const previousRoleIdByTier = new Map((existingRows || []).map((r) => [r.tier, r.role_id as string]));

  try {
    for (const { tier, role_id } of toUpsert) {
      const { error } = await supabase
        .from('party_tier_roles')
        .upsert({ guild_id: guildId, tier, role_id }, { onConflict: 'guild_id,tier' });
      if (error) throw error;
    }
    for (const tier of toDelete) {
      const { error } = await supabase.from('party_tier_roles').delete().eq('guild_id', guildId).eq('tier', tier);
      if (error) throw error;
    }
  } catch (err: any) {
    console.error('[TIER_ROLES][ERROR]', err);
    return NextResponse.json({ status: 'error', message: err.message || 'Failed to save tier role mappings.' }, { status: 500 });
  }

  // 저장은 이미 끝났다 - 정리 트리거는 best-effort라 여기서부터는 실패해도 응답을 바꾸지 않는다.
  const cleanupTargets = [...toUpsert.map((u) => ({ tier: u.tier, newRoleId: u.role_id })), ...toDelete.map((tier) => ({ tier, newRoleId: null }))];
  for (const { tier, newRoleId } of cleanupTargets) {
    const oldRoleId = previousRoleIdByTier.get(tier);
    if (oldRoleId && oldRoleId !== newRoleId) {
      await triggerTierRoleCleanup(guildId, tier, oldRoleId);
    }
  }

  return NextResponse.json({ status: 'success' });
}
