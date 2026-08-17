'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const LANGUAGE_OPTIONS = [
  { code: 'ko' as const, flag: '🇰🇷', label: '한국어' },
  { code: 'en' as const, flag: '🇺🇸', label: 'English' },
];

// Same click-toggle + full-screen-overlay-for-outside-click pattern as AccountMenu.tsx - reused
// verbatim so the two dropdowns (this one sits immediately left of AccountMenu in every header)
// behave identically and never need separate outside-click wiring. Panel opens `right-0` (anchored
// to this trigger's own right edge, expanding leftward) specifically so it never extends toward
// AccountMenu's trigger a few pixels to the right.
export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const current = LANGUAGE_OPTIONS.find((o) => o.code === lang) ?? LANGUAGE_OPTIONS[1];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 bg-bg-elevated hover:bg-bg-elevated/70 rounded-full px-3 py-1.5 text-xs font-black tracking-wider text-text-primary transition-colors"
      >
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <span className="text-text-muted text-[10px]">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-40 bg-bg-surface border border-border-default rounded-xl shadow-2xl overflow-hidden z-20">
            {LANGUAGE_OPTIONS.map((o) => (
              <button
                key={o.code}
                type="button"
                onClick={() => { setLang(o.code); setOpen(false); }}
                className={`flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${
                  o.code === lang ? 'bg-brand/15 text-text-primary' : 'text-text-secondary hover:bg-bg-elevated'
                }`}
              >
                <span>{o.flag}</span>
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
