'use client';

import React from 'react';
import Link from 'next/link';
import { PublicLanguage, PublicTranslationSchema } from '../../i18n/publicTranslations';

interface PublicHeaderProps {
  t: PublicTranslationSchema;
  currentLang: PublicLanguage;
  onLanguageChange: (lang: PublicLanguage) => void;
}

export function PublicHeader({ t, currentLang, onLanguageChange }: PublicHeaderProps) {
  return (
    <header className="start-0 end-0">
      {/* Top Announcement Bar (Enterprise Micro Status Ribbon) */}
      <div className="public-ticker" role="region" aria-label="System Status">
        <div className="public-ticker-content">
          <div className="public-ticker-status">
            <span className="status-dot-active" aria-hidden="true" />
            <span>{t.ticker}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="region-pill">
              <span style={{ color: 'var(--color-enterprise-gold)' }}>●</span> me-central-1 (46ms)
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-enterprise-text-subtle)' }}>
              ariacloudservices.org
            </span>
          </div>
        </div>
      </div>

      {/* Global Navigation Bar (Enterprise Cloudscape Style) */}
      <nav className="public-header" aria-label="Main Navigation">
        <div className="public-header-container">
          {/* Brand Identity */}
          <Link href="/" className="brand-wrapper" aria-label="AriaCloud Home">
            <div className="brand-glyph" aria-hidden="true">
              A
            </div>
            <div>
              <span className="brand-title">AriaCloud</span>
              <span className="brand-badge ms-2">Enterprise</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <ul className="public-nav-links">
            <li>
              <a href="#catalog" className="public-nav-link">
                <span>{t.nav.solutions}</span>
                <span style={{ fontSize: '0.625rem', opacity: 0.6 }}>▾</span>
              </a>
            </li>
            <li>
              <a href="#infra" className="public-nav-link">
                <span>{t.nav.infra}</span>
              </a>
            </li>
            <li>
              <a href="#blueprints" className="public-nav-link">
                <span>{t.nav.identity}</span>
              </a>
            </li>
            <li>
              <a href="#pricing" className="public-nav-link">
                <span>{t.nav.pricingCharter}</span>
              </a>
            </li>
          </ul>

          {/* Actions & Language Switcher */}
          <div className="public-header-actions">
            {/* Trilingual Selector */}
            <div className="lang-switcher" role="group" aria-label="Language selection">
              <button
                type="button"
                onClick={() => onLanguageChange('da')}
                className={`lang-btn ${currentLang === 'da' ? 'active' : ''}`}
                aria-pressed={currentLang === 'da'}
              >
                دری
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('ps')}
                className={`lang-btn ${currentLang === 'ps' ? 'active' : ''}`}
                aria-pressed={currentLang === 'ps'}
              >
                پښتو
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`lang-btn ${currentLang === 'en' ? 'active' : ''}`}
                aria-pressed={currentLang === 'en'}
              >
                EN
              </button>
            </div>

            {/* Portal Console Sign In */}
            <Link href="/login" className="btn-enterprise-secondary">
              {t.nav.signIn}
            </Link>

            {/* Direct Activation CTA (Enterprise Orange) */}
            <a href="#pricing" className="btn-enterprise-primary">
              {t.nav.getStarted}
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
}
