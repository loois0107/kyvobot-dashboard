import { isValidHexColor } from './partySettings';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * cogs/welcome.py의 on_member_join(이제 try/except로 감싸져 안전하긴 하지만)이 channel_id에
 * int()를, card_color/card_bg_color에 discord.Color.from_str()을 쓴다 - 형식이 깨지면 그
 * 서버의 웰컴 카드 기능 전체가 매 멤버 입장마다 계속 조용히 실패한다. 대시보드 UI 자체는 채널
 * ID를 숫자만 입력되게 필터링하고 색상은 프리셋 버튼만 제공하지만, API를 직접 호출하면 이 형식을
 * 우회할 수 있어 저장 시점에 서버 쪽에서도 명확히 거부한다.
 */
export function isValidSnowflakeOrEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  return typeof value === 'string' && /^\d{17,20}$/.test(value);
}

export function validateWelcomeSettings(input: {
  channel_id?: unknown;
  goodbye_channel_id?: unknown;
  card_color?: unknown;
  card_bg_color?: unknown;
}): ValidationResult {
  const errors: string[] = [];

  if (input.channel_id !== undefined && !isValidSnowflakeOrEmpty(input.channel_id)) {
    errors.push('welcome_settings.channel_id must be a valid Discord channel ID (17-20 digits) or empty.');
  }
  if (input.goodbye_channel_id !== undefined && !isValidSnowflakeOrEmpty(input.goodbye_channel_id)) {
    errors.push('goodbye_channel_id must be a valid Discord channel ID (17-20 digits) or empty.');
  }
  if (input.card_color !== undefined && input.card_color !== '' && !isValidHexColor(input.card_color)) {
    errors.push('welcome_settings.card_color must be a valid hex color (e.g. #5865F2).');
  }
  if (input.card_bg_color !== undefined && input.card_bg_color !== '' && !isValidHexColor(input.card_bg_color)) {
    errors.push('welcome_settings.card_bg_color must be a valid hex color (e.g. #1E1F22).');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true };
}
