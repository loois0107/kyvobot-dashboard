'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n/LanguageContext';

const CONTACT_EMAIL = 'doyouknow4953@gmail.com';
const LAST_UPDATED = '2026-07-28';

export default function TermsOfServicePage() {
  const t = useT();

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div>
          <Link href="/" className="text-xs font-bold text-brand hover:underline">
            {t('termsPage.backToHome')}
          </Link>
        </div>

        <header className="border-b border-border-default pb-6 space-y-2">
          <h1 className="text-2xl md:text-3xl font-black text-text-primary">{t('termsPage.metaTitle')}</h1>
          <p className="text-xs text-text-muted">{t('termsPage.lastUpdated', { date: LAST_UPDATED })}</p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">{t('termsPage.section1Title')}</h2>
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">{t('termsPage.section1Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">{t('termsPage.section2Title')}</h2>
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">{t('termsPage.section2Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">{t('termsPage.section3Title')}</h2>
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">{t('termsPage.section3Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">{t('termsPage.section4Title')}</h2>
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">{t('termsPage.section4Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">{t('termsPage.section5Title')}</h2>
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">{t('termsPage.section5Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">{t('termsPage.section6Title')}</h2>
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">{t('termsPage.section6Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">{t('termsPage.section7Title')}</h2>
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">{t('termsPage.section7Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">{t('termsPage.section8Title')}</h2>
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">{t('termsPage.section8Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">{t('termsPage.section9Title')}</h2>
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">{t('termsPage.section9Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">{t('termsPage.section10Title')}</h2>
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">{t('termsPage.section10Body')}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">{t('termsPage.section11Title')}</h2>
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">
            {t('termsPage.section11Body', { email: CONTACT_EMAIL })}
          </p>
        </section>

        <footer className="border-t border-border-default pt-6 text-xs text-text-muted">
          <Link href="/privacy" className="text-brand hover:underline">{t('landingPage.footerPrivacy')}</Link>
        </footer>
      </div>
    </div>
  );
}
