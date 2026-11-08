'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicTranslationSchema, CloudServiceItem } from '../../i18n/publicTranslations';

interface CloudServicesCatalogProps {
  t: PublicTranslationSchema;
}

export function CloudServicesCatalog({ t }: CloudServicesCatalogProps) {
  const [activeCategory, setActiveCategory] = useState<'compute' | 'ai' | 'identity' | 'settlement' | 'edge'>('compute');

  const categories = [
    { id: 'compute', label: t.catalog.tabCompute },
    { id: 'ai', label: t.catalog.tabAI },
    { id: 'identity', label: t.catalog.tabIdentity },
    { id: 'settlement', label: t.catalog.tabSettlement },
    { id: 'edge', label: t.catalog.tabEdge },
  ];

  const currentServices: CloudServiceItem[] = t.catalog.services[activeCategory] || [];

  return (
    <section id="catalog" className="public-section" aria-labelledby="catalog-heading">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-badge">
            <span>{t.catalog.sectionBadge}</span>
          </div>
          <h2 id="catalog-heading" className="section-title">
            {t.catalog.sectionTitle}
          </h2>
          <p className="section-subtitle">{t.catalog.sectionSubtitle}</p>
        </div>

        {/* Enterprise-Style Category Tab Bar */}
        <div className="catalog-tabs-bar" role="tablist" aria-label="Cloud Service Categories">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id as typeof activeCategory)}
              className={`catalog-tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* High-Density Service Cards Grid */}
        <div className="catalog-cards-grid">
          {currentServices.map((service) => (
            <article key={service.id} className="catalog-service-card">
              <div className="catalog-card-header">
                <div className="catalog-card-icon">
                  <span style={{ fontSize: '1.25rem' }}>⬡</span>
                </div>
                <span className="catalog-metric-badge">{service.metric}</span>
              </div>

              <h3 className="catalog-card-title">{service.title}</h3>
              <p className="catalog-card-desc">{service.desc}</p>

              <div className="catalog-card-tag">
                <span style={{ color: 'var(--color-enterprise-emerald)' }}>✔</span>
                <span>{service.tag}</span>
              </div>

              <Link href="/login" className="catalog-card-action">
                <span>{service.linkText}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
