'use client';

import React from 'react';
import Link from 'next/link';
import { PublicTranslationSchema } from '../../i18n/publicTranslations';

interface PublicFooterProps {
  t: PublicTranslationSchema;
}

export function PublicFooter({ t }: PublicFooterProps) {
  return (
    <footer className="public-footer">
      <div className="footer-top-grid">
        {/* Brand Column */}
        <div className="footer-brand-col">
          <Link href="/" className="brand-wrapper" aria-label="AriaCloud Home">
            <div className="brand-glyph" aria-hidden="true">
              A
            </div>
            <div>
              <span className="brand-title">AriaCloud</span>
              <span className="brand-badge ms-2">Social Enterprise</span>
            </div>
          </Link>
          <p className="footer-tagline">{t.footer.tagline}</p>
        </div>

        {/* Column 1: Solutions */}
        <div>
          <h4 className="footer-col-title">{t.nav.solutions}</h4>
          <ul className="footer-links-list">
            <li>
              <a href="#pillars" className="footer-link">
                {t.pillars.p1Title}
              </a>
            </li>
            <li>
              <a href="#pillars" className="footer-link">
                {t.pillars.p2Title}
              </a>
            </li>
            <li>
              <a href="#pillars" className="footer-link">
                {t.pillars.p3Title}
              </a>
            </li>
            <li>
              <a href="#pillars" className="footer-link">
                {t.pillars.p4Title}
              </a>
            </li>
          </ul>
        </div>

        {/* Column 2: Governance & Identity */}
        <div>
          <h4 className="footer-col-title">{t.nav.pricingCharter}</h4>
          <ul className="footer-links-list">
            <li>
              <a href="#pricing" className="footer-link">
                {t.pricing.tabBusiness}
              </a>
            </li>
            <li>
              <a href="#pricing" className="footer-link">
                {t.pricing.tabConsumer}
              </a>
            </li>
            <li>
              <a href="#charter-heading" className="footer-link">
                {t.charter.badge}
              </a>
            </li>
            <li>
              <Link href="/login" className="footer-link">
                {t.nav.signIn}
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Sovereign Compliance & Verification */}
        <div>
          <h4 className="footer-col-title">Sovereign Compliance</h4>
          <div className="footer-compliance-box">
            <p style={{ margin: 0, marginBlockEnd: '0.5rem' }}>
              <strong>Domestic Settlement Network</strong>
            </p>
            <p style={{ margin: 0 }}>
              HesabPay digital settlement and verified doorstep cash collection, denominated in Afghanis.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom-bar">
        <div>
          <span>{t.footer.rights}</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <span>ariacloudservices.org</span>
          <span>Kabul · Herat · Mazar-i-Sharif</span>
        </div>
      </div>
    </footer>
  );
}
