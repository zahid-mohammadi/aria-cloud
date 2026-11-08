'use client';

import React from 'react';
import { PublicTranslationSchema } from '../../i18n/publicTranslations';

interface SocialCharterManifestoProps {
  t: PublicTranslationSchema;
}

export function SocialCharterManifesto({ t }: SocialCharterManifestoProps) {
  const allocationSegments = [
    {
      percentage: '13.0%',
      widthPct: 13.0,
      color: '#2563EB',
      label: t.charter.pctDomain,
    },
    {
      percentage: '3.4%',
      widthPct: 3.4,
      color: '#6366F1',
      label: t.charter.pctInfra,
    },
    {
      percentage: '4.8%',
      widthPct: 4.8,
      color: '#A855F7',
      label: t.charter.pctAI,
    },
    {
      percentage: '4.7%',
      widthPct: 4.7,
      color: '#F59E0B',
      label: t.charter.pctCashFee,
    },
    {
      percentage: '54.1%',
      widthPct: 54.1,
      color: '#10B981',
      label: t.charter.pctWages,
    },
    {
      percentage: '20.0%',
      widthPct: 20.0,
      color: '#64748B',
      label: t.charter.pctReserve,
    },
  ];

  return (
    <section className="public-section" aria-labelledby="charter-heading">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-badge">
            <span>{t.charter.badge}</span>
          </div>
          <h2 id="charter-heading" className="section-title">
            {t.charter.title}
          </h2>
          <p className="section-subtitle">{t.charter.desc}</p>
        </div>

        {/* Visual Allocation Card */}
        <div className="charter-card">
          <div className="charter-bar-header">
            <h3 className="charter-bar-title">{t.charter.barTitle}</h3>
            <span className="charter-bar-subtitle">{t.charter.barSubtitle}</span>
          </div>

          {/* Stacked Percentage Bar */}
          <div
            className="stacked-allocation-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={100}
            aria-label={t.charter.barTitle}
          >
            {allocationSegments.map((segment, index) => (
              <div
                key={index}
                className="bar-segment"
                style={{
                  width: `${segment.widthPct}%`,
                  backgroundColor: segment.color,
                }}
                title={`${segment.label} (${segment.percentage})`}
              />
            ))}
          </div>

          {/* Legend Chips Grid */}
          <div className="charter-legend-grid">
            {allocationSegments.map((segment, index) => (
              <div key={index} className="legend-chip">
                <span
                  className="legend-color-dot"
                  style={{ backgroundColor: segment.color }}
                  aria-hidden="true"
                />
                <div className="legend-text-col">
                  <span className="legend-text-label">{segment.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
