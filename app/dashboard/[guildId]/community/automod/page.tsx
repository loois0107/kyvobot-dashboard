'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import {
  AUTOMOD_SPAM_LIMIT_MIN,
  AUTOMOD_SPAM_LIMIT_MAX,
  AUTOMOD_SPAM_INTERVAL_MIN_SECONDS,
  AUTOMOD_SPAM_INTERVAL_MAX_SECONDS,
  AUTOMOD_TIMEOUT_MIN_SECONDS,
  AUTOMOD_TIMEOUT_MAX_SECONDS,
  AUTOMOD_MAX_CHARS_MIN,
  AUTOMOD_MAX_CHARS_MAX,
  AUTOMOD_MAX_LINES_MIN,
  AUTOMOD_MAX_LINES_MAX,
  AUTOMOD_FORBIDDEN_WORD_MAX_LENGTH,
  AUTOMOD_FORBIDDEN_WORDS_MAX_COUNT,
  DEFAULT_AUTOMOD_SETTINGS,
} from '@/lib/automodSettings';
import { normalizeNumericFieldOnBlur, parseNumericFieldValue } from '@/lib/numericInput';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { TranslationKey } from '@/lib/i18n';

// giveaways/page.tsx의 CREATE_ERROR_CODE_KEY와 동일한 패턴 - 서버가 내려주는 검증 실패
// code를 로컬라이즈된 i18n 키로 매핑한다.
const AUTOMOD_ERROR_CODE_KEY: Record<string, TranslationKey> = {
  spam_limit_out_of_range: 'automodPage.errSpamLimitRange',
  spam_interval_out_of_range: 'automodPage.errSpamIntervalRange',
  timeout_out_of_range: 'automodPage.errTimeoutRange',
  max_chars_out_of_range: 'automodPage.errMaxCharsRange',
  max_lines_out_of_range: 'automodPage.errMaxLinesRange',
  banned_word_too_long: 'automodPage.errBannedWordTooLong',
  banned_words_too_many: 'automodPage.errBannedWordsTooMany',
};

// min/max 같은 정적 상수는 서버가 다시 내려주지 않는다(automodSettings.ts를 여기서도
// import해서 쓰므로 중복) - 서버는 count처럼 자기만 아는 동적 값만 params로 보낸다.
// 여기서 그 둘을 code별로 합쳐서 t()에 넘긴다.
const AUTOMOD_ERROR_CODE_STATIC_PARAMS: Record<string, Record<string, number>> = {
  spam_limit_out_of_range: { min: AUTOMOD_SPAM_LIMIT_MIN, max: AUTOMOD_SPAM_LIMIT_MAX },
  spam_interval_out_of_range: { min: AUTOMOD_SPAM_INTERVAL_MIN_SECONDS, max: AUTOMOD_SPAM_INTERVAL_MAX_SECONDS },
  timeout_out_of_range: { min: AUTOMOD_TIMEOUT_MIN_SECONDS, max: AUTOMOD_TIMEOUT_MAX_SECONDS },
  max_chars_out_of_range: { min: AUTOMOD_MAX_CHARS_MIN, max: AUTOMOD_MAX_CHARS_MAX },
  max_lines_out_of_range: { min: AUTOMOD_MAX_LINES_MIN, max: AUTOMOD_MAX_LINES_MAX },
  banned_word_too_long: { maxLen: AUTOMOD_FORBIDDEN_WORD_MAX_LENGTH },
  banned_words_too_many: { max: AUTOMOD_FORBIDDEN_WORDS_MAX_COUNT },
};

type LoadStatus = 'loading' | 'loaded' | 'error';

export default function AutomodSettingsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const t = useT();
  const guildId = (params?.guildId as string) || '';

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // 🛡️ [leading zero 버그 수정] number가 아니라 string state - 입력 중엔 그대로 반영해서 필드를
  // 지우면 진짜 빈 칸으로 보인다. blur/저장 시점에만 lib/numericInput.ts 헬퍼로 숫자화한다.
  const [spamLimit, setSpamLimit] = useState(String(DEFAULT_AUTOMOD_SETTINGS.spam_limit));
  const [spamIntervalSeconds, setSpamIntervalSeconds] = useState(String(DEFAULT_AUTOMOD_SETTINGS.spam_interval_seconds));
  const [timeoutSeconds, setTimeoutSeconds] = useState(String(DEFAULT_AUTOMOD_SETTINGS.timeout_seconds));
  const [maxChars, setMaxChars] = useState(String(DEFAULT_AUTOMOD_SETTINGS.max_chars));
  const [maxLines, setMaxLines] = useState(String(DEFAULT_AUTOMOD_SETTINGS.max_lines));
  const [forbiddenWordsText, setForbiddenWordsText] = useState('');

  useEffect(() => {
    if (!guildId) return;
    loadData();
  }, [guildId]);

  const extractErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data = await res.json();
      return data.message || t('common.requestFailed', { status: res.status });
    } catch {
      return t('common.requestFailed', { status: res.status });
    }
  };

  // 저장(POST) 검증 실패 전용 - 서버가 { errors: {code, params?}[] } 형태로 여러 위반을 한 번에
  // 돌려주면(giveaways의 단일 code와 달리 automod는 누적형이다), 각각을 번역+보간한 뒤
  // 줄바꿈으로 합쳐서 하나의 토스트에 전부 보여준다("한 번에 다 보여주기" 기존 UX 유지.
  const extractSaveErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data = await res.json();
      const errors = Array.isArray(data.errors) ? data.errors : null;
      if (errors && errors.length > 0) {
        return errors
          .map((e: { code: string; params?: Record<string, string | number> }) => {
            const key = AUTOMOD_ERROR_CODE_KEY[e.code];
            if (!key) return data.message || t('automodPage.errGeneric');
            return t(key, { ...(AUTOMOD_ERROR_CODE_STATIC_PARAMS[e.code] || {}), ...(e.params || {}) });
          })
          .join('\n');
      }
      return data.message || t('automodPage.errGeneric');
    } catch {
      return t('automodPage.errGeneric');
    }
  };

  const loadData = async () => {
    setLoadStatus('loading');
    setLoadErrorMsg('');
    try {
      const res = await fetch(`/api/automod-settings/${guildId}`);
      if (!res.ok) {
        setLoadErrorMsg(await extractErrorMessage(res));
        setLoadStatus('error');
        return;
      }
      const data = await res.json();
      const s = data.automod_settings || DEFAULT_AUTOMOD_SETTINGS;
      setSpamLimit(String(s.spam_limit));
      setSpamIntervalSeconds(String(s.spam_interval_seconds));
      setTimeoutSeconds(String(s.timeout_seconds));
      setMaxChars(String(s.max_chars ?? DEFAULT_AUTOMOD_SETTINGS.max_chars));
      setMaxLines(String(s.max_lines ?? DEFAULT_AUTOMOD_SETTINGS.max_lines));
      setForbiddenWordsText((s.forbidden_words || []).join('\n'));
      setIsDirty(false);
      setLoadStatus('loaded');
    } catch (err) {
      console.error(err);
      setLoadErrorMsg(t('automodPage.loadNetworkError'));
      setLoadStatus('error');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/automod-settings/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spam_limit: parseNumericFieldValue(spamLimit),
          spam_interval_seconds: parseNumericFieldValue(spamIntervalSeconds),
          timeout_seconds: parseNumericFieldValue(timeoutSeconds),
          max_chars: parseNumericFieldValue(maxChars),
          max_lines: parseNumericFieldValue(maxLines),
          forbidden_words_text: forbiddenWordsText,
        }),
      });
      if (res.ok) {
        showToast(t('automodPage.saveSuccess'), 'success');
        setIsDirty(false);
      } else {
        showToast(await extractSaveErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('automodPage.networkError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-text-secondary text-base">
        {t('automodPage.loading')}
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-danger font-bold">{t('automodPage.loadFailed')}</p>
        <p className="text-base text-text-secondary">{loadErrorMsg}</p>
        <Button type="button" variant="primary" onClick={loadData}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const wordCount = forbiddenWordsText.split('\n').map((w) => w.trim()).filter(Boolean).length;

  return (
    <SettingsPageContainer className="pb-28">
      <header className="border-b border-border-default pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-wider text-brand">{t('automodPage.title')}</h1>
          <HelpText className="mt-1 tracking-widest uppercase">
            {t('automodPage.subtitle')}
          </HelpText>
        </div>
        <Button type="button" variant="primary" onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? t('common.saving') : t('common.save')}
        </Button>
      </header>

      <Card className="space-y-4">
        <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
          {t('automodPage.spamDetectionTitle')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-text-secondary">
              {t('automodPage.messageLimitLabel', { min: AUTOMOD_SPAM_LIMIT_MIN, max: AUTOMOD_SPAM_LIMIT_MAX })}
            </label>
            <input
              type="number"
              min={AUTOMOD_SPAM_LIMIT_MIN}
              max={AUTOMOD_SPAM_LIMIT_MAX}
              value={spamLimit}
              onChange={(e) => { setSpamLimit(e.target.value); setIsDirty(true); }}
              onBlur={(e) => setSpamLimit(normalizeNumericFieldOnBlur(e.target.value))}
              className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-brand"
            />
            <HelpText>{t('automodPage.messageLimitHelp')}</HelpText>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-text-secondary">
              {t('automodPage.timeWindowLabel', { min: AUTOMOD_SPAM_INTERVAL_MIN_SECONDS, max: AUTOMOD_SPAM_INTERVAL_MAX_SECONDS })}
            </label>
            <input
              type="number"
              min={AUTOMOD_SPAM_INTERVAL_MIN_SECONDS}
              max={AUTOMOD_SPAM_INTERVAL_MAX_SECONDS}
              value={spamIntervalSeconds}
              onChange={(e) => { setSpamIntervalSeconds(e.target.value); setIsDirty(true); }}
              onBlur={(e) => setSpamIntervalSeconds(normalizeNumericFieldOnBlur(e.target.value))}
              className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-brand"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-text-secondary">
              {t('automodPage.timeoutDurationLabel', { min: AUTOMOD_TIMEOUT_MIN_SECONDS, max: AUTOMOD_TIMEOUT_MAX_SECONDS })}
            </label>
            <input
              type="number"
              min={AUTOMOD_TIMEOUT_MIN_SECONDS}
              max={AUTOMOD_TIMEOUT_MAX_SECONDS}
              value={timeoutSeconds}
              onChange={(e) => { setTimeoutSeconds(e.target.value); setIsDirty(true); }}
              onBlur={(e) => setTimeoutSeconds(normalizeNumericFieldOnBlur(e.target.value))}
              className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-brand"
            />
            <HelpText>{t('automodPage.timeoutDurationHelp')}</HelpText>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
          {t('automodPage.messageShapeTitle')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-text-secondary">
              {t('automodPage.maxCharsLabel', { min: AUTOMOD_MAX_CHARS_MIN, max: AUTOMOD_MAX_CHARS_MAX })}
            </label>
            <input
              type="number"
              min={AUTOMOD_MAX_CHARS_MIN}
              max={AUTOMOD_MAX_CHARS_MAX}
              value={maxChars}
              onChange={(e) => { setMaxChars(e.target.value); setIsDirty(true); }}
              onBlur={(e) => setMaxChars(normalizeNumericFieldOnBlur(e.target.value))}
              className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-brand"
            />
            <HelpText>{t('automodPage.maxCharsHelp')}</HelpText>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-text-secondary">
              {t('automodPage.maxLinesLabel', { min: AUTOMOD_MAX_LINES_MIN, max: AUTOMOD_MAX_LINES_MAX })}
            </label>
            <input
              type="number"
              min={AUTOMOD_MAX_LINES_MIN}
              max={AUTOMOD_MAX_LINES_MAX}
              value={maxLines}
              onChange={(e) => { setMaxLines(e.target.value); setIsDirty(true); }}
              onBlur={(e) => setMaxLines(normalizeNumericFieldOnBlur(e.target.value))}
              className="w-full bg-bg-elevated border border-border-default rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-brand"
            />
            <HelpText>{t('automodPage.maxLinesHelp')}</HelpText>
          </div>
        </div>
      </Card>

      <Card className="space-y-2">
        <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
          {t('automodPage.forbiddenWordsTitle')}
        </h3>
        <label className="text-sm font-bold text-text-secondary block">
          {t('automodPage.forbiddenWordsLabel', { count: wordCount, max: AUTOMOD_FORBIDDEN_WORDS_MAX_COUNT, maxLen: AUTOMOD_FORBIDDEN_WORD_MAX_LENGTH })}
        </label>
        <textarea
          value={forbiddenWordsText}
          onChange={(e) => { setForbiddenWordsText(e.target.value); setIsDirty(true); }}
          rows={8}
          placeholder={t('automodPage.forbiddenWordsPlaceholder')}
          className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary font-mono focus:outline-none focus:border-brand"
        />
        <HelpText>{t('automodPage.forbiddenWordsHelp')}</HelpText>
      </Card>

      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-bg-surface/95 border border-brand/50 px-6 py-3.5 rounded-xl shadow-2xl flex items-center justify-between gap-8 backdrop-blur-md w-[90%] max-w-xl">
          <span className="text-sm font-bold text-text-primary">{t('common.unsavedChanges')}</span>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={loadData} className="!px-0">
              {t('common.discard')}
            </Button>
            <Button type="button" variant="success" onClick={handleSave}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      )}
    </SettingsPageContainer>
  );
}
