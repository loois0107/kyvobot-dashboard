import { isValidHexColor, normalizeHexColor } from './partySettings';

// cogs/party.py의 party_game_presets 테이블(guild_id, game_name)에 맞는 값과 반드시 일치해야
// 한다 - party_tier_roles와 동일한 패턴(자연키에 unique 제약, 길드당 여러 행).
export const PARTY_GAME_PRESET_MAX_COUNT = 25; // Discord 자동완성 응답 상한과 맞춤
export const PARTY_GAME_PRESET_NAME_MAX_LENGTH = 100;

export interface PartyGamePreset {
  game_name: string;
  card_color: string;
  card_description: string;
  card_thumbnail_url: string;
}

export interface ValidationResult {
  valid: boolean;
  preset?: PartyGamePreset;
  errors?: string[];
}

export function validatePartyGamePreset(input: any): ValidationResult {
  const errors: string[] = [];

  const gameName = typeof input?.game_name === 'string' ? input.game_name.trim() : '';
  if (!gameName) {
    errors.push('game_name is required.');
  } else if (gameName.length > PARTY_GAME_PRESET_NAME_MAX_LENGTH) {
    errors.push(`game_name must be ${PARTY_GAME_PRESET_NAME_MAX_LENGTH} characters or fewer.`);
  }

  const cardColorRaw = input?.card_color;
  if (cardColorRaw !== undefined && cardColorRaw !== '' && !isValidHexColor(cardColorRaw)) {
    errors.push('card_color must be a valid hex color (e.g. #5865F2).');
  }

  const cardDescription = typeof input?.card_description === 'string' ? input.card_description.trim() : '';

  const cardThumbnailUrlRaw = typeof input?.card_thumbnail_url === 'string' ? input.card_thumbnail_url.trim() : '';
  if (cardThumbnailUrlRaw && !/^https?:\/\//i.test(cardThumbnailUrlRaw)) {
    errors.push('card_thumbnail_url must start with http:// or https://.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const cardColor = cardColorRaw ? normalizeHexColor(cardColorRaw) : '#5865F2';

  return {
    valid: true,
    preset: {
      game_name: gameName,
      card_color: cardColor,
      card_description: cardDescription,
      card_thumbnail_url: cardThumbnailUrlRaw,
    },
  };
}

export interface CapCheckResult {
  ok: boolean;
  error?: string;
}

/**
 * 새 프리셋을 추가하려는 경우에만 상한을 검사한다 - 기존 프리셋 수정(같은 game_name upsert)은
 * 총 개수가 안 늘어나므로 상한 대상이 아니다.
 */
export function checkPresetCountCap(currentCount: number, isNewPreset: boolean): CapCheckResult {
  if (isNewPreset && currentCount >= PARTY_GAME_PRESET_MAX_COUNT) {
    return {
      ok: false,
      error: `This server already has the maximum of ${PARTY_GAME_PRESET_MAX_COUNT} game presets. Delete one before adding another.`,
    };
  }
  return { ok: true };
}
