'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicTranslationSchema } from '../../i18n/publicTranslations';

interface PricingMatrixProps {
  t: PublicTranslationSchema;
}

interface DisplayPlan {
  id: string;
  name: string;
  desc: string;
  priceAFN: string;
  priceUSD: string;
  period: string;
  featured: boolean;
  altPrice?: string;
  features: string[];
}

export function PricingMatrix({ t }: PricingMatrixProps) {
  const [activeTab, setActiveTab] = useState<'business' | 'consumer'>('business');
  const [currency, setCurrency] = useState<'AFN' | 'USD'>('AFN');

  const businessCards: DisplayPlan[] = [
    {
      id: 'starter',
      name: t.pricing.plans.starter.name,
      desc: t.pricing.plans.starter.desc,
      priceAFN: '۲,۸۰۰',
      priceUSD: '$43',
      period: t.pricing.perYear,
      featured: false,
      features: t.pricing.plans.starter.features,
    },
    {
      id: 'professional',
      name: t.pricing.plans.professional.name,
      desc: t.pricing.plans.professional.desc,
      priceAFN: '۴,۸۰۰',
      priceUSD: '$74',
      period: t.pricing.perYear,
      featured: true,
      features: t.pricing.plans.professional.features,
    },
    {
      id: 'intelligence',
      name: t.pricing.plans.intelligence.name,
      desc: t.pricing.plans.intelligence.desc,
      priceAFN: '۷,۸۰۰',
      priceUSD: '$120',
      period: t.pricing.perYear,
      featured: false,
      features: t.pricing.plans.intelligence.features,
    },
  ];

  const consumerCards: DisplayPlan[] = [
    {
      id: 'community',
      name: t.pricing.plans.community.name,
      desc: t.pricing.plans.community.desc,
      priceAFN: '۰',
      priceUSD: '$0',
      period: t.pricing.lifetime,
      featured: false,
      features: t.pricing.plans.community.features,
    },
    {
      id: 'student',
      name: t.pricing.plans.student.name,
      desc: t.pricing.plans.student.desc,
      priceAFN: '۱۵۰',
      priceUSD: '$2.30',
      altPrice: currency === 'AFN' ? t.pricing.plans.student.annualAlt : 'or $21/year',
      period: t.pricing.perMonth,
      featured: true,
      features: t.pricing.plans.student.features,
    },
    {
      id: 'creator',
      name: t.pricing.plans.creator.name,
      desc: t.pricing.plans.creator.desc,
      priceAFN: '۴۵۰',
      priceUSD: '$6.90',
      period: t.pricing.perMonth,
      featured: false,
      features: t.pricing.plans.creator.features,
    },
  ];

  const activePlans = activeTab === 'business' ? businessCards : consumerCards;

  return (
    <section id="pricing" className="public-section" aria-labelledby="pricing-heading">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-badge">
            <span>{t.pricing.badge}</span>
          </div>
          <h2 id="pricing-heading" className="section-title">
            {t.pricing.title}
          </h2>
          <p className="section-subtitle">{t.pricing.subtitle}</p>
        </div>

        {/* Interactive Controls: Tabs + Currency Selector */}
        <div className="pricing-controls">
          {/* Tab Switcher: Business vs Consumer */}
          <div className="pricing-tabs" role="tablist" aria-label="Pricing Categories">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'business'}
              onClick={() => setActiveTab('business')}
              className={`pricing-tab-btn ${activeTab === 'business' ? 'active' : ''}`}
            >
              {t.pricing.tabBusiness}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'consumer'}
              onClick={() => setActiveTab('consumer')}
              className={`pricing-tab-btn ${activeTab === 'consumer' ? 'active' : ''}`}
            >
              {t.pricing.tabConsumer}
            </button>
          </div>

          {/* Dual Currency Selector */}
          <div className="currency-toggle-wrapper">
            <span>{t.pricing.currencyLabel}</span>
            <button
              type="button"
              onClick={() => setCurrency('AFN')}
              className={`currency-toggle-btn ${currency === 'AFN' ? 'active' : ''}`}
              aria-pressed={currency === 'AFN'}
            >
              AFN (افغانی)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`currency-toggle-btn ${currency === 'USD' ? 'active' : ''}`}
              aria-pressed={currency === 'USD'}
            >
              USD ($)
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="pricing-grid">
          {activePlans.map((plan) => (
            <article
              key={plan.id}
              className={`pricing-card ${plan.featured ? 'featured' : ''}`}
            >
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
                <span className="price-val">
                  {currency === 'AFN' ? `${plan.priceAFN} AFN` : plan.priceUSD}
                </span>
                <span className="price-period">{plan.period}</span>
              </div>

              {'altPrice' in plan && plan.altPrice ? (
                <div className="price-alt">{plan.altPrice}</div>
              ) : (
                <div style={{ height: '1.25rem', marginBottom: '1.5rem' }} />
              )}

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
                href={`/login?plan=${plan.id}`}
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
