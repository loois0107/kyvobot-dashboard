'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n/LanguageContext';
import { BOT_INVITE_URL } from '@/lib/botInvite';

type BotNotInvitedNoticeProps = {
  onRecheck: () => Promise<void>;
};

// Full-content-area replacement shown by the dashboard layout when Kyvo isn't a member of the
// guild being viewed - distinct from (and never shown alongside) the onboarding checklist banner,
// which only ever renders once this notice is no longer active.
export default function BotNotInvitedNotice({ onRecheck }: BotNotInvitedNoticeProps) {
  const t = useT();
  const [isRechecking, setIsRechecking] = useState(false);

  const handleRecheck = async () => {
    setIsRechecking(true);
    try {
      await onRecheck();
    } finally {
      setIsRechecking(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-20 text-center space-y-5">
      <span className="text-5xl block">🤖</span>
      <h2 className="text-lg font-black text-white">{t('botNotInvited.title')}</h2>
      <p className="text-sm text-[#949ba4] leading-relaxed">{t('botNotInvited.body')}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <a
          href={BOT_INVITE_URL}
          target="_blank"
          rel="noreferrer"
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-black px-6 py-3 rounded-xl shadow-[0_0_30px_rgba(88,101,242,0.35)] transition-all"
        >
          {t('botNotInvited.inviteCta')}
        </a>
        <button
          type="button"
          onClick={handleRecheck}
          disabled={isRechecking}
          className="border border-[#5865F2]/40 hover:border-[#5865F2] disabled:opacity-50 text-[#b5bac1] hover:text-white text-sm font-bold px-6 py-3 rounded-xl transition-all"
        >
          {isRechecking ? t('botNotInvited.rechecking') : t('botNotInvited.recheckCta')}
        </button>
      </div>
    </div>
  );
}
