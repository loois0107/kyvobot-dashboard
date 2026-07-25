// cogs/party.py의 동명 상수와 값이 반드시 일치해야 한다 - 여기서 검증을 통과시켜놓고
// 봇 쪽 범위와 다르면 저장은 되는데 봇이 조용히 다른 값으로 덮어써서 혼란만 커진다.
export const PARTY_CARD_LIFETIME_MIN_MINUTES = 5;
export const PARTY_CARD_LIFETIME_MAX_MINUTES = 1440; // 24시간
export const PARTY_CHANNEL_LIFETIME_MIN_HOURS = 1;
export const PARTY_CHANNEL_LIFETIME_MAX_HOURS = 48;

export const DEFAULT_PARTY_SETTINGS = {
  card_color: '#5865F2',
  card_description: '',
  card_lifetime_minutes: 60,
  channel_lifetime_hours: 6,
  game_name: '',
  card_thumbnail_url: '',
};

export interface PartySettings {
  card_color: string;
  card_description: string;
  card_lifetime_minutes: number;
  channel_lifetime_hours: number;
  game_name: string;
  card_thumbnail_url: string;
}

export interface ValidationResult {
  valid: boolean;
  settings?: PartySettings;
  errors?: string[];
}

function isValidHexColor(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$|^#?[0-9a-fA-F]{8}$/.test(value.trim());
}

function normalizeHexColor(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

/**
 * 저장 요청을 검증한다 - giveaway.py의 duration 범위 체크와 동일한 정신으로, 범위를 벗어나면
 * 조용히 clamp하지 않고 명확한 에러 목록을 돌려준다. 이걸 통과한 값만 guild_settings에 쓴다.
 */
export function validatePartySettings(input: any): ValidationResult {
  const errors: string[] = [];

  const cardColorRaw = input?.card_color;
  if (cardColorRaw !== undefined && cardColorRaw !== '' && !isValidHexColor(cardColorRaw)) {
    errors.push('card_color must be a valid hex color (e.g. #5865F2).');
  }

  const cardDescription = typeof input?.card_description === 'string' ? input.card_description.trim() : '';

  const cardLifetimeMinutes = Number(input?.card_lifetime_minutes);
  if (
    !Number.isFinite(cardLifetimeMinutes) ||
    cardLifetimeMinutes < PARTY_CARD_LIFETIME_MIN_MINUTES ||
    cardLifetimeMinutes > PARTY_CARD_LIFETIME_MAX_MINUTES
  ) {
    errors.push(`card_lifetime_minutes must be between ${PARTY_CARD_LIFETIME_MIN_MINUTES} and ${PARTY_CARD_LIFETIME_MAX_MINUTES}.`);
  }

  const channelLifetimeHours = Number(input?.channel_lifetime_hours);
  if (
    !Number.isFinite(channelLifetimeHours) ||
    channelLifetimeHours < PARTY_CHANNEL_LIFETIME_MIN_HOURS ||
    channelLifetimeHours > PARTY_CHANNEL_LIFETIME_MAX_HOURS
  ) {
    errors.push(`channel_lifetime_hours must be between ${PARTY_CHANNEL_LIFETIME_MIN_HOURS} and ${PARTY_CHANNEL_LIFETIME_MAX_HOURS}.`);
  }

  const gameName = typeof input?.game_name === 'string' ? input.game_name.trim().slice(0, 256) : '';

  const cardThumbnailUrlRaw = typeof input?.card_thumbnail_url === 'string' ? input.card_thumbnail_url.trim() : '';
  if (cardThumbnailUrlRaw && !/^https?:\/\//i.test(cardThumbnailUrlRaw)) {
    errors.push('card_thumbnail_url must start with http:// or https://.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const cardColor = cardColorRaw ? normalizeHexColor(cardColorRaw) : DEFAULT_PARTY_SETTINGS.card_color;

  return {
    valid: true,
    settings: {
      card_color: cardColor,
      card_description: cardDescription,
      card_lifetime_minutes: Math.round(cardLifetimeMinutes),
      channel_lifetime_hours: Math.round(channelLifetimeHours),
      game_name: gameName,
      card_thumbnail_url: cardThumbnailUrlRaw,
    },
  };
}
