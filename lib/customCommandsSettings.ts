// cogs/custom_commands.py의 저장/실행 로직과 반드시 맞아야 한다 - automodSettings.ts와 동일한
// 이유. MACRO_RESPONSE_MAX_LENGTH는 디스코드 메시지 자체의 플랫폼 하드 리밋(2,000자)이라 봇
// 상수가 아니라 디스코드 자체 제약값이다 - on_message가 이걸 넘는 응답을 send()하면 예외가
// 발생해서(포괄 except에 잡혀 로그만 남고) 아무 메시지도 안 나가는 문제가 있었다.
export const MACRO_TRIGGER_MAX_LENGTH = 100;
export const MACRO_RESPONSE_MAX_LENGTH = 2000;
export const MACRO_MAX_COUNT = 100;

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * 레거시 문자열 형태({trigger: "응답"})와 신규 dict 형태({trigger: {type, content?, role_id?}})가
 * 섞여 있을 수 있다 (cogs/custom_commands.py의 _normalize_command_entry와 동일한 스키마).
 * text 타입(또는 레거시 문자열)만 응답 길이를 검사한다 - role_add/role_remove는 검사할
 * "응답 텍스트" 자체가 없다(역할 위험 권한/위계 검증은 /api/settings/[guildId]/role-macro
 * 라우트가 별도로 담당 - 이 함수가 받는 벌크 저장 경로에는 role_id의 유효성까지 검증할
 * Discord 역할 데이터가 없다).
 */
function extractTextContent(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && (value as any).type === 'text') {
    return typeof (value as any).content === 'string' ? (value as any).content : '';
  }
  return null;
}

/**
 * 저장하려는 custom_commands 전체를 검증한다 - party_presets.ts와 동일한 정신으로 개수 상한 +
 * 개별 필드 상한을 조용히 자르지 않고 명확한 에러로 거부한다.
 */
export function validateCustomCommands(newCommands: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const entries = Object.entries(newCommands || {});

  if (entries.length > MACRO_MAX_COUNT) {
    errors.push(`You can have at most ${MACRO_MAX_COUNT} custom macros (got ${entries.length}).`);
  }

  for (const [trigger, value] of entries) {
    if (trigger.length > MACRO_TRIGGER_MAX_LENGTH) {
      errors.push(`Macro trigger "${trigger.slice(0, 20)}..." exceeds ${MACRO_TRIGGER_MAX_LENGTH} characters.`);
    }

    const textContent = extractTextContent(value);
    if (textContent !== null && textContent.length > MACRO_RESPONSE_MAX_LENGTH) {
      errors.push(`Macro "${trigger}"'s response is ${textContent.length} characters - Discord's message limit is ${MACRO_RESPONSE_MAX_LENGTH}.`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true };
}
