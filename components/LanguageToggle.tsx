'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center bg-[#232428] rounded-full p-0.5 text-[10px] font-black tracking-wider">
      <button
        type="button"
        onClick={() => setLang('ko')}
        aria-pressed={lang === 'ko'}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          lang === 'ko' ? 'bg-[#5865F2] text-white' : 'text-[#949ba4] hover:text-white'
        }`}
      >
        KR
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          lang === 'en' ? 'bg-[#5865F2] text-white' : 'text-[#949ba4] hover:text-white'
        }`}
      >
        EN
      </button>
    </div>
  );
}
