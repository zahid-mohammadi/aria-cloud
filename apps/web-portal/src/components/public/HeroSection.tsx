'use client';

import React from 'react';
import Link from 'next/link';
import { PublicTranslationSchema } from '../../i18n/publicTranslations';
import { HeroTopologyViz } from './HeroTopologyViz';
import { StorefrontMockup } from './StorefrontMockup';

interface HeroSectionProps {
  t: PublicTranslationSchema;
}

export function HeroSection({ t }: HeroSectionProps) {
  return (
    <section className="public-section hero-wrapper" aria-labelledby="hero-heading">
      <HeroTopologyViz />

      <div className="section-container">
        <div className="hero-two-col-grid">
          {/* Left Column: Enterprise Headline & Actions */}
          <div className="hero-left-col">
            <div className="section-badge">
              <span className="status-dot-active" aria-hidden="true" />
              <span>{t.hero.badge}</span>
            </div>

            <h1 id="hero-heading" className="hero-headline">
              <span>{t.hero.headlineMain}</span>
              <span className="hero-headline-highlight">{t.hero.headlineHighlight}</span>
            </h1>

            <p className="hero-subheadline">{t.hero.subheadline}</p>

            <div className="hero-specs-bar" role="region" aria-label="Platform capabilities">
              {t.hero.quickSpecs.map((spec, index) => (
                <div key={index} className="spec-item">
                  <span className="spec-icon" aria-hidden="true">✔</span>
                  <span>{spec}</span>
                </div>
              ))}
            </div>

            <div className="hero-actions">
              <Link href="/login" className="btn-enterprise-primary">
                <span>{t.hero.ctaBusiness}</span>
                <span aria-hidden="true">→</span>
              </Link>

              <a
                href="https://wa.me/93700000000?text=Salam%20AriaCloud"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-enterprise-whatsapp"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>{t.hero.ctaWhatsApp}</span>
              </a>
            </div>
          </div>

          {/* Right Column: AI-generated storefront showcase */}
          <div className="hero-visual-col">
            <StorefrontMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
