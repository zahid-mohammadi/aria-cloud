'use client';

import React, { useState } from 'react';
import { PublicTranslationSchema } from '../../i18n/publicTranslations';

interface FrictionKillerFAQProps {
  t: PublicTranslationSchema;
}

export function FrictionKillerFAQ({ t }: FrictionKillerFAQProps) {
  // Allow multiple FAQ items to be open or toggle
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({
    0: true, // First item open by default
  });

  const toggleItem = (index: number) => {
    setOpenItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const faqList = [
    {
      q: t.faq.q1,
      a: t.faq.a1,
    },
    {
      q: t.faq.q2,
      a: t.faq.a2,
    },
    {
      q: t.faq.q3,
      a: t.faq.a3,
    },
  ];

  return (
    <section className="public-section" aria-labelledby="faq-heading">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-badge">
            <span>Enterprise FAQ</span>
          </div>
          <h2 id="faq-heading" className="section-title">
            {t.faq.title}
          </h2>
        </div>

        {/* Accordion FAQ Grid */}
        <div className="faq-grid">
          {faqList.map((item, index) => {
            const isOpen = !!openItems[index];
            return (
              <div
                key={index}
                className={`faq-item ${isOpen ? 'open' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(index)}
                  className="faq-question-btn"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  id={`faq-question-${index}`}
                >
                  <span>{item.q}</span>
                  <svg
                    className="faq-chevron"
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
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${index}`}
                    role="region"
                    aria-labelledby={`faq-question-${index}`}
                    className="faq-answer"
                  >
                    <p style={{ margin: 0 }}>{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
