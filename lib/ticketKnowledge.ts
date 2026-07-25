// cogs/ticket_ai.py의 TICKET_KNOWLEDGE_MAX_LENGTH와 반드시 값이 일치해야 한다 - party_settings 등과
// 동일한 관례. 임베딩 생성 자체는 항상 봇 쪽(내부 웹훅)에서 하지만, 빈 값/과도하게 긴 텍스트는
// 봇까지 왕복하기 전에 여기서 먼저 걸러서 불필요한 OpenAI 호출을 막는다.
export const TICKET_KNOWLEDGE_MAX_LENGTH = 4000;

export interface ValidationResult {
  valid: boolean;
  trimmed?: string;
  error?: string;
}

export function validateKnowledgeContent(content: unknown): ValidationResult {
  if (typeof content !== 'string') {
    return { valid: false, error: 'content must be a string.' };
  }
  const trimmed = content.trim();
  if (!trimmed) {
    return { valid: false, error: 'Cannot save an empty knowledge block.' };
  }
  if (trimmed.length > TICKET_KNOWLEDGE_MAX_LENGTH) {
    return { valid: false, error: `Keep it under ${TICKET_KNOWLEDGE_MAX_LENGTH} characters (got ${trimmed.length}).` };
  }
  return { valid: true, trimmed };
}
