// party.py TIER_CHOICES와 동일한 목록 - 봇 쪽이 정본, 여긴 표시/검증용으로 복제
export const TIER_CHOICES = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger'];

export const ADMINISTRATOR = BigInt(0x8);
// party.py DANGEROUS_ROLE_PERMISSIONS와 동일한 목록/정신 - 이 라우트도 커맨드와 같은 기준을 써야 한다
export const DANGEROUS_PERMS: Record<string, bigint> = {
  kick_members: BigInt(0x2),
  ban_members: BigInt(0x4),
  manage_channels: BigInt(0x10),
  manage_guild: BigInt(0x20),
  manage_messages: BigInt(0x2000),
  manage_roles: BigInt(0x10000000),
  manage_webhooks: BigInt(0x20000000),
};
export const MANAGE_ROLES = DANGEROUS_PERMS.manage_roles;

export interface DiscordRole {
  id: string;
  name: string;
  position: number;
  permissions: string;
  color: number;
  managed: boolean;
}

export interface BlockedItem {
  tier: string;
  role_name: string;
  reason: string;
}

export interface NeedsConfirmationItem {
  tier: string;
  role_id: string;
  role_name: string;
  dangerous_permissions: string[];
}

export interface EvaluationResult {
  blockedItems: BlockedItem[];
  needsConfirmation: NeedsConfirmationItem[];
  toUpsert: { tier: string; role_id: string }[];
  toDelete: string[];
}

/** 봇의 실효 권한/최고 역할 위치를 계산한다 - @everyone(id === guildId) 기본 권한도 합산해야
 * 정확하다 (party.py의 bot_member.top_role/guild_permissions.manage_roles와 동일한 개념). */
export function computeBotHierarchy(guildId: string, roles: DiscordRole[], botRoleIds: string[]) {
  const everyoneRole = roles.find((r) => r.id === guildId);
  const botRoles = roles.filter((r) => botRoleIds.includes(r.id));
  const allRoles = everyoneRole ? [everyoneRole, ...botRoles] : botRoles;

  let permissions = BigInt(0);
  for (const r of allRoles) permissions |= BigInt(r.permissions);

  const topPosition = botRoles.length > 0 ? Math.max(...botRoles.map((r) => r.position)) : 0;
  const hasManageRoles = (permissions & ADMINISTRATOR) === ADMINISTRATOR || (permissions & MANAGE_ROLES) === MANAGE_ROLES;

  return { topPosition, hasManageRoles };
}

/**
 * 10개 티어 선택값을 검증해서 (막힘/확인필요/저장할것/지울것)으로 분류하는 순수 함수.
 * 실제 Discord/Supabase 호출 없이 이 로직만 단독으로 유닛테스트할 수 있도록 라우트에서 분리했다.
 *
 * - roleId가 비어있으면(빈 선택) -> 해당 tier는 명시적 해제(toDelete)
 * - administrator 권한 역할 -> 무조건 blocked (확인으로 우회 불가)
 * - 봇보다 높거나 같은 위치의 역할 -> 무조건 blocked (확인으로 우회 불가)
 * - 위험권한(관리채널 등) 있는 역할인데 confirmedDangerous에 그 tier가 없으면 -> needsConfirmation
 * - 그 외 -> toUpsert
 */
export function evaluateTierSelections(
  roles: DiscordRole[],
  topPosition: number,
  selections: Record<string, string | null | undefined>,
  confirmedDangerous: string[]
): EvaluationResult {
  const blockedItems: BlockedItem[] = [];
  const needsConfirmation: NeedsConfirmationItem[] = [];
  const toUpsert: { tier: string; role_id: string }[] = [];
  const toDelete: string[] = [];

  for (const tier of TIER_CHOICES) {
    if (!(tier in selections)) continue;
    const roleId = selections[tier];

    if (!roleId) {
      toDelete.push(tier);
      continue;
    }

    const role = roles.find((r) => r.id === roleId);
    if (!role) {
      blockedItems.push({ tier, role_name: '(unknown)', reason: 'This role no longer exists.' });
      continue;
    }

    const perms = BigInt(role.permissions);

    if ((perms & ADMINISTRATOR) === ADMINISTRATOR) {
      blockedItems.push({ tier, role_name: role.name, reason: 'This role has Administrator permissions and can never be used as a tier reward.' });
      continue;
    }

    if (role.position >= topPosition) {
      blockedItems.push({ tier, role_name: role.name, reason: "This role is positioned above (or equal to) Kyvo's own role, so Kyvo can't assign it. Move Kyvo's role higher in Server Settings." });
      continue;
    }

    const dangerous = Object.entries(DANGEROUS_PERMS)
      .filter(([, bit]) => (perms & bit) === bit)
      .map(([name]) => name);

    if (dangerous.length > 0 && !confirmedDangerous.includes(tier)) {
      needsConfirmation.push({ tier, role_id: roleId, role_name: role.name, dangerous_permissions: dangerous });
      continue;
    }

    toUpsert.push({ tier, role_id: roleId });
  }

  return { blockedItems, needsConfirmation, toUpsert, toDelete };
}
