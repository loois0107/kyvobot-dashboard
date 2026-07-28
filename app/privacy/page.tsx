'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n/LanguageContext';

const CONTACT_EMAIL = 'doyouknow4953@gmail.com';
const LAST_UPDATED = '2026-07-28';

export default function PrivacyPolicyPage() {
  const t = useT();

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-[#dbdee1]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div>
          <Link href="/" className="text-xs font-bold text-[#5865F2] hover:underline">
            {t('privacyPage.backToHome')}
          </Link>
        </div>

        <header className="border-b border-[#2A1F40] pb-6 space-y-2">
          <h1 className="text-2xl md:text-3xl font-black text-white">{t('privacyPage.metaTitle')}</h1>
          <p className="text-xs text-[#57576F]">{t('privacyPage.lastUpdated', { date: LAST_UPDATED })}</p>
        </header>

        <p className="text-sm leading-relaxed text-[#b5bac1]">{t('privacyPage.intro')}</p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">{t('privacyPage.section1Title')}</h2>
          <p className="text-sm leading-relaxed text-[#b5bac1] whitespace-pre-line">{t('privacyPage.section1Body')}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">{t('privacyPage.section2Title')}</h2>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#dbdee1]">{t('privacyPage.section2aTitle')}</h3>
            <p className="text-sm leading-relaxed text-[#b5bac1] whitespace-pre-line">{t('privacyPage.section2aBody')}</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#dbdee1]">{t('privacyPage.section2bTitle')}</h3>
            <p className="text-sm leading-relaxed text-[#b5bac1] whitespace-pre-line">{t('privacyPage.section2bBody')}</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#dbdee1]">{t('privacyPage.section2cTitle')}</h3>
            <p className="text-sm leading-relaxed text-[#b5bac1] whitespace-pre-line">{t('privacyPage.section2cBody')}</p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">{t('privacyPage.section3Title')}</h2>
          <p className="text-sm leading-relaxed text-[#b5bac1] whitespace-pre-line">{t('privacyPage.section3Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">{t('privacyPage.section4Title')}</h2>
          <p className="text-sm leading-relaxed text-[#b5bac1] whitespace-pre-line">{t('privacyPage.section4Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">{t('privacyPage.section5Title')}</h2>
          <p className="text-sm leading-relaxed text-[#b5bac1] whitespace-pre-line">{t('privacyPage.section5Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">{t('privacyPage.section6Title')}</h2>
          <p className="text-sm leading-relaxed text-[#b5bac1] whitespace-pre-line">
            {t('privacyPage.section6Body', { email: CONTACT_EMAIL })}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">{t('privacyPage.section7Title')}</h2>
          <p className="text-sm leading-relaxed text-[#b5bac1] whitespace-pre-line">{t('privacyPage.section7Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">{t('privacyPage.section8Title')}</h2>
          <p className="text-sm leading-relaxed text-[#b5bac1] whitespace-pre-line">{t('privacyPage.section8Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">{t('privacyPage.section9Title')}</h2>
          <p className="text-sm leading-relaxed text-[#b5bac1] whitespace-pre-line">
            {t('privacyPage.section9Body', { email: CONTACT_EMAIL })}
          </p>
        </section>

        <footer className="border-t border-[#2A1F40] pt-6 text-xs text-[#57576F]">
          <Link href="/terms" className="text-[#5865F2] hover:underline">{t('landingPage.footerTerms')}</Link>
        </footer>
      </div>
    </div>
  );
}
