// cogs/automod.py의 동명 상수와 값이 반드시 일치해야 한다 - party_settings 상수들과 동일한 이유:
// 여기서 검증을 통과시켜놓고 봇 쪽 범위와 다르면 저장은 되는데 봇이 조용히 다른 값으로
// 덮어써서 혼란만 커진다.
export const AUTOMOD_SPAM_LIMIT_MIN = 3;
export const AUTOMOD_SPAM_LIMIT_MAX = 20;
export const AUTOMOD_SPAM_LIMIT_DEFAULT = 5;

export const AUTOMOD_SPAM_INTERVAL_MIN_SECONDS = 5;
export const AUTOMOD_SPAM_INTERVAL_MAX_SECONDS = 60;
export const AUTOMOD_SPAM_INTERVAL_DEFAULT_SECONDS = 10;

export const AUTOMOD_TIMEOUT_MIN_SECONDS = 60;
export const AUTOMOD_TIMEOUT_MAX_SECONDS = 3600;
export const AUTOMOD_TIMEOUT_DEFAULT_SECONDS = 600; // 기존 하드코딩값과 동일 - 미설정 길드는 지금과 동작이 같다

export const AUTOMOD_FORBIDDEN_WORD_MAX_LENGTH = 50;
export const AUTOMOD_FORBIDDEN_WORDS_MAX_COUNT = 200;

export const DEFAULT_AUTOMOD_SETTINGS = {
  spam_limit: AUTOMOD_SPAM_LIMIT_DEFAULT,
  spam_interval_seconds: AUTOMOD_SPAM_INTERVAL_DEFAULT_SECONDS,
  timeout_seconds: AUTOMOD_TIMEOUT_DEFAULT_SECONDS,
  forbidden_words: [] as string[],
};

export interface AutomodSettings {
  spam_limit: number;
  spam_interval_seconds: number;
  timeout_seconds: number;
  forbidden_words: string[];
}

export interface ValidationResult {
  valid: boolean;
  settings?: AutomodSettings;
  errors?: string[];
}

/**
 * textarea 원문(줄바꿈 구분)을 배열로 파싱한다 - 줄 단위 trim, 빈 줄 제거, 중복 제거.
 * 실제 매칭(check_forbidden_words)이 대소문자 구분 부분일치라, 중복 제거도 대소문자 구분으로 맞춘다.
 */
export function parseForbiddenWordsText(text: string): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const rawLine of text.split('\n')) {
    const word = rawLine.trim();
    if (!word || seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }
  return words;
}

/**
 * 저장 요청을 검증한다 - party_settings와 동일한 정신으로, 범위를 벗어나면 조용히 clamp하지
 * 않고 명확한 에러 목록을 돌려준다. 이걸 통과한 값만 guild_settings에 쓴다.
 */
export function validateAutomodSettings(input: any): ValidationResult {
  const errors: string[] = [];

  const spamLimit = Number(input?.spam_limit);
  if (!Number.isFinite(spamLimit) || spamLimit < AUTOMOD_SPAM_LIMIT_MIN || spamLimit > AUTOMOD_SPAM_LIMIT_MAX) {
    errors.push(`spam_limit must be between ${AUTOMOD_SPAM_LIMIT_MIN} and ${AUTOMOD_SPAM_LIMIT_MAX}.`);
  }

  const spamInterval = Number(input?.spam_interval_seconds);
  if (!Number.isFinite(spamInterval) || spamInterval < AUTOMOD_SPAM_INTERVAL_MIN_SECONDS || spamInterval > AUTOMOD_SPAM_INTERVAL_MAX_SECONDS) {
    errors.push(`spam_interval_seconds must be between ${AUTOMOD_SPAM_INTERVAL_MIN_SECONDS} and ${AUTOMOD_SPAM_INTERVAL_MAX_SECONDS}.`);
  }

  const timeoutSeconds = Number(input?.timeout_seconds);
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < AUTOMOD_TIMEOUT_MIN_SECONDS || timeoutSeconds > AUTOMOD_TIMEOUT_MAX_SECONDS) {
    errors.push(`timeout_seconds must be between ${AUTOMOD_TIMEOUT_MIN_SECONDS} and ${AUTOMOD_TIMEOUT_MAX_SECONDS}.`);
  }

  const forbiddenWordsText = typeof input?.forbidden_words_text === 'string' ? input.forbidden_words_text : '';
  const forbiddenWords = parseForbiddenWordsText(forbiddenWordsText);

  const tooLong = forbiddenWords.filter((w) => w.length > AUTOMOD_FORBIDDEN_WORD_MAX_LENGTH);
  if (tooLong.length > 0) {
    errors.push(`Each forbidden word must be ${AUTOMOD_FORBIDDEN_WORD_MAX_LENGTH} characters or fewer (${tooLong.length} word(s) exceed this).`);
  }
  if (forbiddenWords.length > AUTOMOD_FORBIDDEN_WORDS_MAX_COUNT) {
    errors.push(`You can have at most ${AUTOMOD_FORBIDDEN_WORDS_MAX_COUNT} forbidden words (got ${forbiddenWords.length}).`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    settings: {
      spam_limit: Math.round(spamLimit),
      spam_interval_seconds: Math.round(spamInterval),
      timeout_seconds: Math.round(timeoutSeconds),
      forbidden_words: forbiddenWords,
    },
  };
}
