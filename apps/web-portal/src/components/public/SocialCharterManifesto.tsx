'use client';

import React from 'react';
import { PublicTranslationSchema } from '../../i18n/publicTranslations';

interface SocialCharterManifestoProps {
  t: PublicTranslationSchema;
}

export function SocialCharterManifesto({ t }: SocialCharterManifestoProps) {
  return (
    <section className="public-section" aria-labelledby="mission-heading">
      <div className="section-container">
        <div className="section-header">
          <div className="section-badge">
            <span>{t.charter.badge}</span>
          </div>
          <h2 id="mission-heading" className="section-title">
            {t.charter.title}
          </h2>
        </div>

        <div className="charter-card" style={{ maxWidth: 820, marginInline: 'auto' }}>
          <p className="charter-mission-text">{t.charter.desc}</p>
        </div>
      </div>
    </section>
  );
}
