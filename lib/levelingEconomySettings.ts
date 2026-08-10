// cogs/leveling.py·cogs/economy.py의 동명 상수와 반드시 일치해야 한다 - automodSettings.ts와
// 동일한 이유: 여기서 통과시킨 값이 봇 쪽 실제 한계와 어긋나면 저장은 되지만 봇이 조용히 다른
// 동작을 하게 되어(예: 5,000 넘는 min_bet은 Mines/Roulette를 아예 플레이 불가로 만듦) 혼란만 커진다.
export const LEVELING_XP_RATE_MIN = 0.1;
export const LEVELING_XP_RATE_MAX = 10;
export const LEVELING_XP_RATE_DEFAULT = 1.0;

// economy.py의 TABLE_MAX_BET과 동일한 값 - Mines/Roulette 자체의 최대 배팅 한도라, 서버 최소
// 배팅액이 이걸 넘으면 그 두 게임은 아예 플레이할 수 없게 된다.
export const ECONOMY_MIN_BET_FLOOR = 1;
export const ECONOMY_MIN_BET_CEILING = 5000;
export const ECONOMY_MIN_BET_DEFAULT = 10;

// economy.py shop_add()의 4개 규칙과 반드시 일치해야 한다 - /shop add 명령어와 대시보드
// 둘 중 하나로만 걸리는 규칙이 있으면, 그 경로로 우회해서 어길 수 있는 구멍이 된다.
export const SHOP_ITEM_PRICE_MAX = 1_000_000_000;
export const SHOP_ITEM_NAME_MAX_LENGTH = 50;
export const SHOP_ITEM_DESCRIPTION_MAX_LENGTH = 200;

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * shop_items 배열 하나를 통째로 검증한다 - economy.py shop_add()의 4개 규칙(가격 범위, 이름/설명
 * 길이, 대소문자 무시 중복 이름)을 그대로 재현. 명령어는 "새 아이템 하나"만 이 시점에 기존 배열과
 * 비교하지만, 여기선 대시보드가 한 번에 배열 전체를 통째로 저장하는 구조라 배열 안의 모든 항목을
 * 다시 검증한다 - 요청을 조작해서 검증 안 된 항목을 직접 밀어넣는 것까지 막기 위한 authoritative
 * 서버 검증이므로, "새로 추가된 항목만" 봐주면 안 된다.
 */
export function validateShopItems(shopItems: any): ValidationResult {
  const errors: string[] = [];

  if (shopItems === undefined) {
    return { valid: true };
  }
  if (!Array.isArray(shopItems)) {
    return { valid: false, errors: ['Shop items must be a list.'] };
  }

  const seenNames = new Set<string>();
  for (const item of shopItems) {
    if (!item || typeof item !== 'object') {
      errors.push('Every shop item must be an object with a name, price, and description.');
      continue;
    }

    const name = typeof item.name === 'string' ? item.name : '';
    const label = name || '(unnamed item)';

    const price = Number(item.price);
    if (!Number.isFinite(price) || price <= 0) {
      errors.push(`"${label}": price must be a positive number.`);
    } else if (price > SHOP_ITEM_PRICE_MAX) {
      errors.push(`"${label}": price cannot exceed ${SHOP_ITEM_PRICE_MAX.toLocaleString()}.`);
    }

    if (name.length > SHOP_ITEM_NAME_MAX_LENGTH) {
      errors.push(`"${label}": item name cannot exceed ${SHOP_ITEM_NAME_MAX_LENGTH} characters.`);
    }
    const description = typeof item.description === 'string' ? item.description : '';
    if (description.length > SHOP_ITEM_DESCRIPTION_MAX_LENGTH) {
      errors.push(`"${label}": description cannot exceed ${SHOP_ITEM_DESCRIPTION_MAX_LENGTH} characters.`);
    }

    const key = name.toLowerCase();
    if (key && seenNames.has(key)) {
      errors.push(`"${label}": duplicate item name - each item needs a distinct name (case-insensitive).`);
    }
    seenNames.add(key);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true };
}

/**
 * leveling_settings.xp_rate / economy_settings.min_bet / economy_settings.shop_items를 검증한다.
 * 나머지 필드(role_rewards, 랭크 카드 스타일 등)는 기존과 동일하게 그대로 통과시킨다 - 지금까지
 * 문제로 지목된 범위가 아니다.
 */
export function validateLevelingEconomySettings(levelingSettings: any, economySettings: any): ValidationResult {
  const errors: string[] = [];

  if (levelingSettings && levelingSettings.xp_rate !== undefined) {
    const xpRate = Number(levelingSettings.xp_rate);
    if (!Number.isFinite(xpRate) || xpRate < LEVELING_XP_RATE_MIN || xpRate > LEVELING_XP_RATE_MAX) {
      errors.push(`Global XP Multiplier Rate must be between ${LEVELING_XP_RATE_MIN} and ${LEVELING_XP_RATE_MAX}.`);
    }
  }

  if (economySettings && economySettings.min_bet !== undefined) {
    const minBet = Number(economySettings.min_bet);
    if (!Number.isFinite(minBet) || !Number.isInteger(minBet) || minBet < ECONOMY_MIN_BET_FLOOR || minBet > ECONOMY_MIN_BET_CEILING) {
      errors.push(
        `Minimum Casino Bet Amount must be a whole number between ${ECONOMY_MIN_BET_FLOOR} and ${ECONOMY_MIN_BET_CEILING} ` +
        `(Mines/Roulette's own max bet - anything higher makes those games unplayable).`
      );
    }
  }

  if (economySettings && economySettings.shop_items !== undefined) {
    const shopValidation = validateShopItems(economySettings.shop_items);
    if (!shopValidation.valid) {
      errors.push(...shopValidation.errors!);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true };
}
