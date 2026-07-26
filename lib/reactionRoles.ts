import { ADMINISTRATOR, DANGEROUS_PERMS, computeBotHierarchy, type DiscordRole } from './tierRoles';

export { computeBotHierarchy };
export type { DiscordRole };

export interface ReactionRoleBindingEvaluation {
  blocked?: { reason: string };
  needsConfirmation?: { dangerous_permissions: string[] };
  ok?: true;
}

/**
 * 반응 역할 하나를 저장하기 전 검증 - tier-roles의 evaluateTierSelections와 같은 기준
 * (administrator/위계는 확인으로 우회 불가, 위험 권한은 confirmedDangerous로 우회 가능)을
 * 단일 역할 선택에 맞게 적용한 버전. 실제 Discord/Supabase 호출 없이 단독 유닛테스트 가능하다.
 */
export function evaluateReactionRoleBinding(
  role: DiscordRole,
  topPosition: number,
  hasManageRoles: boolean,
  confirmedDangerous: boolean
): ReactionRoleBindingEvaluation {
  const perms = BigInt(role.permissions);

  if ((perms & ADMINISTRATOR) === ADMINISTRATOR) {
    return { blocked: { reason: 'This role has Administrator permissions and can never be used as a reaction role.' } };
  }

  if (!hasManageRoles) {
    return { blocked: { reason: "Kyvo doesn't have the Manage Roles permission in this server." } };
  }

  if (role.position >= topPosition) {
    return { blocked: { reason: "This role is positioned above (or equal to) Kyvo's own role, so Kyvo can't assign it. Move Kyvo's role higher in Server Settings." } };
  }

  const dangerous = Object.entries(DANGEROUS_PERMS)
    .filter(([, bit]) => (perms & bit) === bit)
    .map(([name]) => name);

  if (dangerous.length > 0 && !confirmedDangerous) {
    return { needsConfirmation: { dangerous_permissions: dangerous } };
  }

  return { ok: true };
}

export type ChannelGuildCheck =
  | { ok: true }
  | { ok: false; reason: 'channel_not_found' | 'guild_mismatch' };

/**
 * 미리보기 라우트가 channel_id만 믿고 봇 토큰으로 바로 메시지를 조회하면, 그 채널이 실제로
 * URL의 guildId에 속하는지 전혀 확인이 안 된다 - 봇이 속한 다른 서버의 channel_id+message_id를
 * 알기만 하면 그 서버 메시지 내용을 미리볼 수 있는 크로스-테넌트 정보 유출이었다. 실제 바인딩
 * 생성(POST, 봇 웹훅 경유)은 guild.get_channel()로 이미 스코프가 걸려있어 안전했던 것과 대칭.
 */
export function verifyChannelBelongsToGuild(channelData: { guild_id?: string } | null, guildId: string): ChannelGuildCheck {
  if (!channelData) return { ok: false, reason: 'channel_not_found' };
  if (channelData.guild_id !== guildId) return { ok: false, reason: 'guild_mismatch' };
  return { ok: true };
}

/** 저장된 emoji 문자열이 커스텀 이모지(<:name:id> / <a:name:id>)면 CDN 이미지 URL로, 아니면
 * 유니코드 이모지 그대로 표시할 수 있게 판별한다. */
export function parseEmojiDisplay(emoji: string): { kind: 'custom'; url: string; name: string } | { kind: 'unicode'; value: string } {
  const match = emoji.match(/^<(a)?:(\w+):(\d+)>$/);
  if (match) {
    const [, animated, name, id] = match;
    const ext = animated ? 'gif' : 'png';
    return { kind: 'custom', url: `https://cdn.discordapp.com/emojis/${id}.${ext}`, name };
  }
  return { kind: 'unicode', value: emoji };
}
