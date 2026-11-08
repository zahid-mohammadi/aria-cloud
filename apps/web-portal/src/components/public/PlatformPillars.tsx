'use client';

import React from 'react';
import { PublicTranslationSchema } from '../../i18n/publicTranslations';

interface PlatformPillarsProps {
  t: PublicTranslationSchema;
}

export function PlatformPillars({ t }: PlatformPillarsProps) {
  const pillars = [
    {
      title: t.pillars.p1Title,
      desc: t.pillars.p1Desc,
      tag: t.pillars.p1Tag,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      title: t.pillars.p2Title,
      desc: t.pillars.p2Desc,
      tag: t.pillars.p2Tag,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      ),
    },
    {
      title: t.pillars.p3Title,
      desc: t.pillars.p3Desc,
      tag: t.pillars.p3Tag,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
    {
      title: t.pillars.p4Title,
      desc: t.pillars.p4Desc,
      tag: t.pillars.p4Tag,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
  ];

  return (
    <section id="pillars" className="public-section" aria-labelledby="pillars-heading">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-badge">
            <span>Sovereign Capabilities</span>
          </div>
          <h2 id="pillars-heading" className="section-title">
            {t.pillars.sectionTitle}
          </h2>
          <p className="section-subtitle">{t.pillars.sectionSubtitle}</p>
        </div>

        {/* 4-Column Capability Grid */}
        <div className="pillars-grid">
          {pillars.map((pillar, index) => (
            <article key={index} className="pillar-card">
              <span className="pillar-tag">{pillar.tag}</span>
              <div className="pillar-icon-box">{pillar.icon}</div>
              <h3 className="pillar-title">{pillar.title}</h3>
              <p className="pillar-desc">{pillar.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
