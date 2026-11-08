'use client';

import React from 'react';
import Link from 'next/link';
import { PublicTranslationSchema } from '../../i18n/publicTranslations';

interface SolutionBlueprintsProps {
  t: PublicTranslationSchema;
}

export function SolutionBlueprints({ t }: SolutionBlueprintsProps) {
  return (
    <section id="blueprints" className="public-section" aria-labelledby="blueprints-heading">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-badge">
            <span>{t.solutions.sectionBadge}</span>
          </div>
          <h2 id="blueprints-heading" className="section-title">
            {t.solutions.sectionTitle}
          </h2>
          <p className="section-subtitle">{t.solutions.sectionSubtitle}</p>
        </div>

        {/* 2x2 Industry Solution Grid */}
        <div className="solutions-grid">
          {t.solutions.blueprints.map((blueprint) => (
            <article key={blueprint.id} className="solution-card">
              <span className="solution-industry-title">{blueprint.title}</span>
              <h3 className="solution-headline">{blueprint.headline}</h3>
              <p className="solution-desc">{blueprint.desc}</p>

              <ul className="solution-deliverables">
                {blueprint.deliverables.map((item, idx) => (
                  <li key={idx} className="solution-deliverable-item">
                    <span style={{ color: 'var(--color-enterprise-gold)' }}>✔</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className="btn-enterprise-secondary"
                style={{ alignSelf: 'flex-start', marginTop: 'auto' }}
              >
                <span>{blueprint.ctaText}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
