'use client';

import React from 'react';

/**
 * Decorative browser-frame mockup of an AI-generated storefront.
 * Replaces the developer terminal with the actual product outcome.
 * Purely presentational (`aria-hidden`).
 */
export function StorefrontMockup() {
  return (
    <div className="storefront-mockup" aria-hidden="true">
      {/* Browser chrome */}
      <div className="sf-browser-bar">
        <span className="sf-dot sf-dot-red" />
        <span className="sf-dot sf-dot-yellow" />
        <span className="sf-dot sf-dot-green" />
        <div className="sf-url" dir="ltr">kabul-saffron.af</div>
      </div>

      {/* Storefront body */}
      <div className="sf-body" dir="rtl">
        <div className="sf-nav">
          <span className="sf-brand">زعفران کابل</span>
          <div className="sf-langs">
            <span className="sf-lang sf-lang-active">دری</span>
            <span className="sf-lang">پښتو</span>
            <span className="sf-lang">EN</span>
          </div>
        </div>

        <div className="sf-hero">
          <h4 className="sf-hero-title">زعفران سوپر نگین هرات</h4>
          <p className="sf-hero-sub">کیفیت صادراتی · تحویل سریع در ۳۴ ولایت</p>
        </div>

        <div className="sf-products">
          {[0, 1, 2].map((i) => (
            <div className="sf-product" key={i}>
              <div className="sf-product-img" />
              <div className="sf-product-meta">
                <div className="sf-product-name">زعفران نگین (۱۰ گرام)</div>
                <div className="sf-product-price">۶۵۰ افغانی</div>
                <span className="sf-order">سفارش در واتساپ</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating WhatsApp action bubble */}
      <div className="sf-wa-bubble" dir="rtl">💬 سفارش از واتساپ</div>
    </div>
  );
}
