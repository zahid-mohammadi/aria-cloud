'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicTranslationSchema } from '../../i18n/publicTranslations';

interface PricingMatrixProps {
  t: PublicTranslationSchema;
}

interface DisplayPlan {
  id: string;
  tierKey: string;
  name: string;
  desc: string;
  priceLabel: string;
  periodLabel: string;
  subLabel?: string;
  featured: boolean;
  features: string[];
}

export function PricingMatrix({ t }: PricingMatrixProps) {
  const [activeTab, setActiveTab] = useState<'business' | 'consumer'>('consumer');

  const businessCards: DisplayPlan[] = [
    {
      id: 'starter',
      tierKey: 'starter_af',
      name: t.pricing.plans.starter.name,
      desc: t.pricing.plans.starter.desc,
      priceLabel: '420 AFN',
      periodLabel: t.pricing.perMonth,
      subLabel: '~$6.45 · 4,200 AFN' + t.pricing.perYear,
      featured: false,
      features: t.pricing.plans.starter.features,
    },
    {
      id: 'professional',
      tierKey: 'business_pro',
      name: t.pricing.plans.professional.name,
      desc: t.pricing.plans.professional.desc,
      priceLabel: '1,100 AFN',
      periodLabel: t.pricing.perMonth,
      subLabel: '~$16.90 · 11,000 AFN' + t.pricing.perYear,
      featured: true,
      features: t.pricing.plans.professional.features,
    },
    {
      id: 'intelligence',
      tierKey: 'agency_af',
      name: t.pricing.plans.intelligence.name,
      desc: t.pricing.plans.intelligence.desc,
      priceLabel: '2,500 AFN',
      periodLabel: t.pricing.perMonth,
      subLabel: '~$38.50 · 25,000 AFN' + t.pricing.perYear,
      featured: false,
      features: t.pricing.plans.intelligence.features,
    },
  ];

  const consumerCards: DisplayPlan[] = [
    {
      id: 'community',
      tierKey: 'free',
      name: t.pricing.plans.community.name,
      desc: t.pricing.plans.community.desc,
      priceLabel: '0 AFN',
      periodLabel: t.pricing.perMonth,
      subLabel: '$0 · Chat Only',
      featured: false,
      features: t.pricing.plans.community.features,
    },
    {
      id: 'student',
      tierKey: 'student_af',
      name: t.pricing.plans.student.name,
      desc: t.pricing.plans.student.desc,
      priceLabel: '120 AFN',
      periodLabel: t.pricing.perMonth,
      subLabel: `~$1.85 · ${t.pricing.plans.student.annualAlt}`,
      featured: true,
      features: t.pricing.plans.student.features,
    },
    {
      id: 'creator',
      tierKey: 'creator_af',
      name: t.pricing.plans.creator.name,
      desc: t.pricing.plans.creator.desc,
      priceLabel: '350 AFN',
      periodLabel: t.pricing.perMonth,
      subLabel: '~$5.40 · 3,500 AFN' + t.pricing.perYear,
      featured: false,
      features: t.pricing.plans.creator.features,
    },
  ];

  const activePlans = activeTab === 'business' ? businessCards : consumerCards;

  return (
    <section id="pricing" className="public-section" aria-labelledby="pricing-heading">
      <div className="section-container">
        <div className="section-header">
          <div className="section-badge">
            <span>{t.pricing.badge}</span>
          </div>
          <h2 id="pricing-heading" className="section-title">
            {t.pricing.title}
          </h2>
          <p className="section-subtitle">{t.pricing.subtitle}</p>
        </div>

        <div className="pricing-controls">
          <div className="pricing-tabs" role="tablist" aria-label="Pricing Categories">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'consumer'}
              onClick={() => setActiveTab('consumer')}
              className={`pricing-tab-btn ${activeTab === 'consumer' ? 'active' : ''}`}
            >
              {t.pricing.tabConsumer}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'business'}
              onClick={() => setActiveTab('business')}
              className={`pricing-tab-btn ${activeTab === 'business' ? 'active' : ''}`}
            >
              {t.pricing.tabBusiness}
            </button>
          </div>
        </div>

        <div className="pricing-grid">
          {activePlans.map((plan) => (
            <article key={plan.id} className={`pricing-card ${plan.featured ? 'featured' : ''}`}>
              {plan.featured && (
                <div className="popular-badge">
                  <span>{t.pricing.popularTag}</span>
                </div>
              )}

              <header className="pricing-card-header">
                <h3 className="plan-name">{plan.name}</h3>
                <p className="plan-desc">{plan.desc}</p>
              </header>

              <div className="price-row">
                <span className="price-val">{plan.priceLabel}</span>
                <span className="price-period">{plan.periodLabel}</span>
              </div>
              <div className="price-period" style={{ marginBottom: '1.25rem', minHeight: '1.25rem' }}>
                {plan.subLabel}
              </div>

              <hr className="plan-divider" />

              <ul className="plan-features-list">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="plan-feature-item">
                    <svg
                      className="feature-check"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/signup?plan=${plan.tierKey}`}
                className={plan.featured ? 'btn-enterprise-primary' : 'btn-enterprise-secondary'}
                style={{ width: '100%', textAlign: 'center' }}
              >
                <span>{t.pricing.deployBtn}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
