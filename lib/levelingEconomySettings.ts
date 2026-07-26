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

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * leveling_settings.xp_rate / economy_settings.min_bet만 검증한다 (이 두 필드만 서버 검증이
 * 없어서 범위 밖 값이 조용히 저장되던 문제였음). 나머지 필드(role_rewards, shop_items, 랭크
 * 카드 스타일 등)는 기존과 동일하게 그대로 통과시킨다 - 이번에 문제로 지목된 범위는 아니다.
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

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true };
}
