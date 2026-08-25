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

// automodSettings.ts와 동일한 code 기반 패턴 - lib/automodSettings.ts의 AutomodValidationError 참고.
export interface LevelingValidationError {
  code: string;
  params?: Record<string, string | number>;
}

export interface ValidationResult {
  valid: boolean;
  errors?: LevelingValidationError[];
}

/**
 * shop_items 배열 하나를 통째로 검증한다 - economy.py shop_add()의 4개 규칙(가격 범위, 이름/설명
 * 길이, 대소문자 무시 중복 이름)을 그대로 재현. 명령어는 "새 아이템 하나"만 이 시점에 기존 배열과
 * 비교하지만, 여기선 대시보드가 한 번에 배열 전체를 통째로 저장하는 구조라 배열 안의 모든 항목을
 * 다시 검증한다 - 요청을 조작해서 검증 안 된 항목을 직접 밀어넣는 것까지 막기 위한 authoritative
 * 서버 검증이므로, "새로 추가된 항목만" 봐주면 안 된다.
 */
export function validateShopItems(shopItems: any): ValidationResult {
  const errors: LevelingValidationError[] = [];

  if (shopItems === undefined) {
    return { valid: true };
  }
  if (!Array.isArray(shopItems)) {
    // 🛡️ [코드화 최소 적용] 클라이언트가 항상 배열을 보내는 UI라 사실상 도달 불가능한 경로 -
    // 매핑 테이블에 없는 코드로 남겨서 클라이언트가 일반 에러 문구로 폴백하게 둔다.
    return { valid: false, errors: [{ code: 'shop_items_invalid_type' }] };
  }

  const seenNames = new Set<string>();
  for (const item of shopItems) {
    if (!item || typeof item !== 'object') {
      errors.push({ code: 'shop_item_malformed' });
      continue;
    }

    const name = typeof item.name === 'string' ? item.name : '';

    // 🛡️ [코드화 최소 적용] injectShopItem()에 이미 있는 클라이언트 사전 검증(itemErr* 키)과
    // 동일한 조건으로 매핑한다 - 아이템 이름 등 동적 값 보간까지는 이번 라운드에서 맞추지 않는다
    // (이 벌크 저장 경로는 클라이언트 사전 검증을 우회한 요청에 대한 최후 방어선이라 실사용
    // 빈도가 낮다).
    const price = Number(item.price);
    if (!Number.isFinite(price) || price <= 0) {
      errors.push({ code: 'shop_item_price_invalid' });
    } else if (price > SHOP_ITEM_PRICE_MAX) {
      errors.push({ code: 'shop_item_price_too_high' });
    }

    if (name.length > SHOP_ITEM_NAME_MAX_LENGTH) {
      errors.push({ code: 'shop_item_bounds_overflow' });
    }
    const description = typeof item.description === 'string' ? item.description : '';
    if (description.length > SHOP_ITEM_DESCRIPTION_MAX_LENGTH) {
      errors.push({ code: 'shop_item_bounds_overflow' });
    }

    const key = name.toLowerCase();
    if (key && seenNames.has(key)) {
      errors.push({ code: 'shop_item_duplicate' });
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
  const errors: LevelingValidationError[] = [];

  if (levelingSettings && levelingSettings.xp_rate !== undefined) {
    const xpRate = Number(levelingSettings.xp_rate);
    if (!Number.isFinite(xpRate) || xpRate < LEVELING_XP_RATE_MIN || xpRate > LEVELING_XP_RATE_MAX) {
      errors.push({ code: 'xp_rate_out_of_range' });
    }
  }

  if (economySettings && economySettings.min_bet !== undefined) {
    const minBet = Number(economySettings.min_bet);
    if (!Number.isFinite(minBet) || !Number.isInteger(minBet) || minBet < ECONOMY_MIN_BET_FLOOR || minBet > ECONOMY_MIN_BET_CEILING) {
      errors.push({ code: 'min_bet_out_of_range' });
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
