'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@aria-cloud/ui';

interface StorefrontDeploymentRow {
  deploymentId: string;
  subdomainSlug: string;
  liveUrl: string;
  edgeObjectKey: string;
  cachePurgeId?: string;
  createdAt?: string;
}

const THEMES = [
  { id: 'emerald', name: 'Emerald (سبز زمردی)', color: '#059669' },
  { id: 'lapis', name: 'Lapis (آبی لاجوردی)', color: '#2563eb' },
  { id: 'saffron', name: 'Saffron (طلایی زعفرانی)', color: '#d97706' },
  { id: 'teal', name: 'Teal (فیروزه‌ای طبی)', color: '#0d9488' },
  { id: 'crimson', name: 'Crimson (یاقوتی انار)', color: '#e11d48' },
  { id: 'slate', name: 'Slate (سربی خنثی)', color: '#475569' },
];

const LAYOUTS = [
  { id: 'aurora', name: 'Aurora (مدرن تجاری)', desc: 'بخش‌های غنی، پالت ترکیبی و هدر شاخص' },
  { id: 'minimal', name: 'Minimal (مینیمال سریع)', desc: 'طراحی فشرده، لود فوق‌العاده سریع با فونت سبک' },
  { id: 'editorial', name: 'Editorial (محتوا محور)', desc: 'مناسب مقالات، صادرات و تشریح محصولات' },
];

const INDUSTRIES = [
  { id: 'retail', name: 'فروشگاه و پرچون‌فروشی / Retail & Products' },
  { id: 'clinic', name: 'کلینیک و خدمات صحی / Clinic & Diagnostic' },
  { id: 'export', name: 'صادرات و تجارت بین‌المللی / Export & Trade' },
  { id: 'school', name: 'مکتب، کورس و آموزش / School & Academy' },
  { id: 'logistics', name: 'باربری و ترانسپورت / Logistics & Freight' },
  { id: 'services', name: 'شرکت خدمات مسلکی / Professional Services' },
];

export default function StoreBuilderPage() {
  const { t, dir } = useTranslation();

  const [subdomainSlug, setSubdomainSlug] = useState<string>('kabul-saffron');
  const [businessName, setBusinessName] = useState<string>('Kabul Saffron Co.');
  const [whatsappPhone, setWhatsappPhone] = useState<string>('+93700123456');
  const [hesabPayId, setHesabPayId] = useState<string>('HP-KABUL-9921');
  const [palette, setPalette] = useState<string>('emerald');
  const [layout, setLayout] = useState<string>('aurora');
  const [industry, setIndustry] = useState<string>('retail');
  const [storePrompt, setStorePrompt] = useState<string>(
    'زعفران درجه یک صادراتی هرات با بسته‌بندی هدیه و استانداردهای بین‌المللی همراه با گواهی لابراتوار.'
  );
  const [building, setBuilding] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deployments, setDeployments] = useState<StorefrontDeploymentRow[]>([
    {
      deploymentId: 'dep_aria_kabul01',
      subdomainSlug: 'kabul-saffron',
      liveUrl: 'https://kabul-saffron.ariacloudservices.org',
      edgeObjectKey: 'sites/kabul-saffron/index.html',
      cachePurgeId: 'EDGE-29981ABCDEF',
      createdAt: 'Just now',
    },
  ]);

  const handleBuildStorefront = async (e: React.FormEvent) => {
    e.preventDefault();
    if (building) return;
    setBuilding(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/studio/site-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomainSlug,
          prompt: storePrompt,
          theme: palette,
          layout,
          industry,
          whatsappPhone,
          hesabPayId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || t.common.error);

      setDeployments((prev) => [
        {
          deploymentId: data.deploymentId || `dep_${Date.now()}`,
          subdomainSlug: data.subdomainSlug || subdomainSlug,
          liveUrl: data.liveUrl || `https://${subdomainSlug}.ariacloudservices.org`,
          edgeObjectKey: data.edgeObjectKey || `sites/${subdomainSlug}/index.html`,
          cachePurgeId: data.edgeInvalidationId,
          createdAt: 'Just now',
        },
        ...prev,
      ]);

      setStatusMessage({
        type: 'success',
        text: `وب‌سایت شما با موفقیت تولید و منتشر شد: ${data.liveUrl || `https://${subdomainSlug}.ariacloudservices.org`}`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'خطا در ایجاد وب‌سایت. لطفاً دوباره تلاش کنید.',
      });
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="builder-container" dir={dir}>
      {/* Header */}
      <div className="builder-header">
        <div>
          <h1 className="builder-title">{t.nav.storefront}</h1>
          <p className="builder-subtitle">{t.infra.headerDesc}</p>
        </div>
        <span className="domain-badge">*.ariacloudservices.org</span>
      </div>

      {statusMessage && (
        <div className={`status-banner ${statusMessage.type}`}>
          <span>{statusMessage.type === 'success' ? '✅' : '❌'}</span>
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="builder-grid">
        {/* Form Column */}
        <form className="builder-form-card" onSubmit={handleBuildStorefront}>
          <h2 className="card-title">تنظیمات و مشخصات وب‌سایت / Site Configuration</h2>

          <div className="form-group">
            <label>صنف کسب‌وکار / Business Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="builder-select"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>نام تجاری / Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Kabul Saffron Co."
                className="builder-input"
                required
              />
            </div>

            <div className="form-group">
              <label>زیردامنه / Subdomain Slug</label>
              <input
                type="text"
                value={subdomainSlug}
                onChange={(e) => setSubdomainSlug(e.target.value)}
                placeholder="kabul-saffron"
                className="builder-input"
                dir="ltr"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>شماره تماس واتساپ / WhatsApp</label>
              <input
                type="text"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="+93700123456"
                className="builder-input"
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label>شناسه حساب‌پی / HesabPay ID</label>
              <input
                type="text"
                value={hesabPayId}
                onChange={(e) => setHesabPayId(e.target.value)}
                placeholder="HP-KABUL-9921"
                className="builder-input"
                dir="ltr"
              />
            </div>
          </div>

          {/* Theme Palette */}
          <div className="form-group">
            <label>پالت رنگی / Theme Palette</label>
            <div className="palette-grid">
              {THEMES.map((theme) => (
                <button
                  type="button"
                  key={theme.id}
                  className={`palette-tile ${palette === theme.id ? 'active' : ''}`}
                  onClick={() => setPalette(theme.id)}
                >
                  <span className="color-dot" style={{ background: theme.color }} />
                  <span className="theme-name">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Layout Mode */}
          <div className="form-group">
            <label>قالب و آرایش صفحه / Layout</label>
            <div className="layout-grid">
              {LAYOUTS.map((lay) => (
                <button
                  type="button"
                  key={lay.id}
                  className={`layout-tile ${layout === lay.id ? 'active' : ''}`}
                  onClick={() => setLayout(lay.id)}
                >
                  <div className="layout-name">{lay.name}</div>
                  <div className="layout-desc">{lay.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div className="form-group">
            <label>توصیف محتوای هوش مصنوعی / AI Store Prompt</label>
            <textarea
              rows={3}
              value={storePrompt}
              onChange={(e) => setStorePrompt(e.target.value)}
              className="builder-textarea"
              placeholder="توضیحات محصولات، خدمات، تخصص‌ها و ویژگی‌های کلیدی کسب‌وکار خود را بنویسید..."
            />
          </div>

          <button
            type="submit"
            className="build-btn"
            disabled={building || !subdomainSlug}
          >
            {building ? 'در حال تولید و انتشار به کلاود…' : '🚀 کامپایل و انتشار وب‌سایت / Build Storefront'}
          </button>
        </form>

        {/* Deployments & Preview Column */}
        <div className="builder-side-col">
          <div className="builder-card">
            <h2 className="card-title">وب‌سایت‌های منتشر شده / Live Storefronts</h2>
            <div className="deployments-list">
              {deployments.map((dep) => (
                <div key={dep.deploymentId} className="dep-item">
                  <div className="dep-info">
                    <span className="dep-subdomain">{dep.subdomainSlug}.ariacloudservices.org</span>
                    <span className="dep-status">✅ فعال و متصل به CDN</span>
                  </div>
                  <a
                    href={dep.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dep-link-btn"
                  >
                    مشاهده آنلاین ↗
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className="builder-card info-card">
            <h3 className="info-title">قابلیت‌های وب‌سایت‌های آریا</h3>
            <ul className="info-list">
              <li>📱 <b>اپلیکیشن مستقل (PWA)</b>: امکان نصب روی موبایل و کارکرد بدون اینترنت.</li>
              <li>🌐 <b>سه زبانه (دری، پښتو، English)</b>: سوئیچ آنی بدون بارگذاری دوباره صفحه.</li>
              <li>💳 <b>درگاه مستقیم حساب‌پی</b>: پرداخت فوری در داخل افغانستان بدون ویزا کارت.</li>
              <li>⚡ <b>توزیع ابری Edge CDN</b>: لود فوق سریع در شبکه‌های کم‌سرعت افغانستان.</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .builder-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .builder-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .builder-title {
          font-size: 24px;
          font-weight: 700;
          color: inherit;
          margin: 0;
        }
        .builder-subtitle {
          font-size: 14px;
          color: #94a3b8;
          margin: 4px 0 0 0;
        }
        .domain-badge {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 13px;
          font-family: ui-monospace, SFMono-Regular, monospace;
        }

        .status-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
        }
        .status-banner.success {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
        }
        .status-banner.error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .builder-grid {
          display: grid;
          grid-template-columns: 7fr 5fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 960px) {
          .builder-grid {
            grid-template-columns: 1fr;
          }
        }

        .builder-form-card,
        .builder-card {
          background: rgba(13, 25, 21, 0.8);
          border: 1px solid #162c24;
          border-radius: 12px;
          padding: 24px;
        }
        :global(.portal-root.light) .builder-form-card,
        :global(.portal-root.light) .builder-card {
          background: #ffffff;
          border-color: #e2e8f0;
        }

        .card-title {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 18px;
          color: inherit;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }
        label {
          font-size: 13px;
          font-weight: 500;
          color: #cbd5e1;
        }
        :global(.portal-root.light) label {
          color: #334155;
        }

        .builder-input,
        .builder-select,
        .builder-textarea {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #234338;
          background: #091512;
          color: inherit;
          font-size: 14px;
          outline: none;
          font-family: inherit;
        }
        :global(.portal-root.light) .builder-input,
        :global(.portal-root.light) .builder-select,
        :global(.portal-root.light) .builder-textarea {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .builder-input:focus,
        .builder-select:focus,
        .builder-textarea:focus {
          border-color: #10b981;
        }

        .palette-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 8px;
        }
        .palette-tile {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 7px;
          border: 1px solid #234338;
          background: #091512;
          color: #cbd5e1;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        :global(.portal-root.light) .palette-tile {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #334155;
        }
        .palette-tile.active {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          font-weight: 600;
        }
        .color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .layout-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 8px;
        }
        .layout-tile {
          text-align: start;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #234338;
          background: #091512;
          color: inherit;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        :global(.portal-root.light) .layout-tile {
          background: #f8fafc;
          border-color: #e2e8f0;
        }
        .layout-tile.active {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.15);
        }
        .layout-name {
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .layout-desc {
          font-size: 11px;
          color: #94a3b8;
          line-height: 1.4;
        }

        .build-btn {
          width: 100%;
          padding: 13px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #04120d;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: opacity 0.15s ease;
          margin-top: 8px;
        }
        .build-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .builder-side-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .deployments-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dep-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          border-radius: 8px;
          background: #091512;
          border: 1px solid #1c382e;
        }
        :global(.portal-root.light) .dep-item {
          background: #f8fafc;
          border-color: #e2e8f0;
        }
        .dep-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .dep-subdomain {
          font-size: 14px;
          font-weight: 600;
          font-family: ui-monospace, SFMono-Regular, monospace;
        }
        .dep-status {
          font-size: 12px;
          color: #34d399;
        }
        .dep-link-btn {
          padding: 6px 12px;
          border-radius: 6px;
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.15s ease;
        }
        .dep-link-btn:hover {
          background: rgba(16, 185, 129, 0.25);
        }

        .info-card {
          border-color: #1e3a30;
        }
        .info-title {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 12px;
        }
        .info-list {
          margin: 0;
          padding-inline-start: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}
