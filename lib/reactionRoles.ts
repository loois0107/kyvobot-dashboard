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

export interface DiscordEmbed {
  title?: string;
  description?: string;
}

export interface DiscordMessage {
  id?: string;
  author?: { username?: string };
  content?: string;
  embeds?: DiscordEmbed[];
  attachments?: unknown[];
  timestamp?: string;
}

/**
 * 텍스트 콘텐츠가 없는 메시지(봇 공지, 링크 카드, 이미지 전용 등)를 미리보기·목록 어디서도 빈
 * 줄로 보여주지 않도록 대체 텍스트를 고른다 - 우선순위: 실제 content -> 임베드 title/description
 * -> 첨부파일 개수 -> 마지막 안내 문구. reaction-roles의 메시지 목록(/api/guilds/[guildId]/
 * channels/[channelId]/messages)과 미리보기(/api/reaction-roles/[guildId]/preview)가 이 함수
 * 하나를 공유한다 - 예전엔 preview가 이 로직 없이 content만 보고 비어있으면 그냥
 * "(no text content)"를 보여줘서, 목록에서는 임베드 제목이 잘 보이던 메시지가 미리보기에서는
 * 빈 것처럼 보이는 불일치가 있었다.
 */
export function extractPreviewText(msg: DiscordMessage): string {
  if (msg.content) return msg.content;
  const embed = msg.embeds?.[0];
  if (embed) {
    const parts = [embed.title, embed.description].filter(Boolean);
    if (parts.length > 0) return parts.join(' — ');
  }
  if (msg.attachments && msg.attachments.length > 0) return `[${msg.attachments.length} attachment(s)]`;
  return "This message doesn't have any text — just an image or other content.";
}
