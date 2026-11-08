'use client';

import React from 'react';
import { PublicTranslationSchema } from '../../i18n/publicTranslations';

interface RegionalInfrastructureProps {
  t: PublicTranslationSchema;
}

export function RegionalInfrastructure({ t }: RegionalInfrastructureProps) {
  const edgeNodes = [
    {
      name: t.infrastructure.primaryRegionName,
      latency: t.infrastructure.primaryRegionLatency,
      type: 'Primary region',
      status: 'success',
    },
    {
      name: t.infrastructure.kabulEdgeName,
      latency: t.infrastructure.kabulEdgeLatency,
      type: 'Delivery network',
      status: 'success',
    },
    {
      name: t.infrastructure.heratEdgeName,
      latency: t.infrastructure.heratEdgeLatency,
      type: 'Database',
      status: 'success',
    },
    {
      name: t.infrastructure.mazarEdgeName,
      latency: t.infrastructure.mazarEdgeLatency,
      type: 'Storage',
      status: 'success',
    },
    {
      name: t.infrastructure.kandaharEdgeName,
      latency: t.infrastructure.kandaharEdgeLatency,
      type: 'Email',
      status: 'success',
    },
  ];

  return (
    <section id="infra" className="public-section" aria-labelledby="infra-heading">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-badge">
            <span>{t.infrastructure.sectionBadge}</span>
          </div>
          <h2 id="infra-heading" className="section-title">
            {t.infrastructure.sectionTitle}
          </h2>
          <p className="section-subtitle">{t.infrastructure.sectionSubtitle}</p>
        </div>

        {/* Enterprise-Style Infrastructure & Metrics Layout */}
        <div className="infra-grid">
          {/* Active Nodes List */}
          <div className="infra-nodes-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-enterprise-navy)' }}>
                Platform architecture
              </span>
              <span className="status-dot-active" aria-hidden="true" />
            </div>

            {edgeNodes.map((node, index) => (
              <div key={index} className="infra-node-item">
                <div className="infra-node-info">
                  <span style={{ color: 'var(--color-enterprise-emerald)' }}>●</span>
                  <div>
                    <div className="infra-node-name">{node.name}</div>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-enterprise-text-muted)' }}>
                      {node.type}
                    </span>
                  </div>
                </div>
                <span className="infra-node-latency">{node.latency}</span>
              </div>
            ))}
          </div>

          {/* SLA & Performance Stat Cards */}
          <div className="infra-stats-card">
            <div className="stat-box">
              <span className="stat-value">{t.infrastructure.statSla}</span>
              <span className="stat-label">{t.infrastructure.statSlaLabel}</span>
            </div>

            <div className="stat-box">
              <span className="stat-value">{t.infrastructure.statLatency}</span>
              <span className="stat-label">{t.infrastructure.statLatencyLabel}</span>
            </div>

            <div className="stat-box">
              <span className="stat-value">{t.infrastructure.statDeliverability}</span>
              <span className="stat-label">{t.infrastructure.statDeliverabilityLabel}</span>
            </div>

            <div className="stat-box">
              <span className="stat-value">{t.infrastructure.statCurrency}</span>
              <span className="stat-label">{t.infrastructure.statCurrencyLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
