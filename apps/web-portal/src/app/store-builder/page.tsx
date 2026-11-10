'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@aria-cloud/ui';

interface LocalizedText {
  fa: string;
  ps: string;
  en: string;
}

interface CustomPageDraft {
  id: string;
  slug: string;
  title: LocalizedText;
  content: LocalizedText;
  showInNav: boolean;
}

interface StorefrontDeploymentRow {
  deploymentId: string;
  subdomainSlug: string;
  industry?: string;
  liveUrl: string;
  edgeObjectKey: string;
  cachePurgeId?: string;
  currentVersion?: number;
  lastUpdatedAt?: string;
  pages?: CustomPageDraft[];
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

const DEFAULT_PAGES: CustomPageDraft[] = [
  {
    id: 'about',
    slug: 'about',
    title: { fa: 'درباره ما', ps: 'زموږ په اړه', en: 'About Us' },
    content: {
      fa: 'ما با بیش از یک دهه تجربه، خدمات و محصولات معیاری را در سراسر افغانستان ارائه می‌نماییم.',
      ps: 'موږ د یوې لسیزې څخه د ډېرې تجربې سره په ټول افغانستان کې معیاري خدمتونه وړاندې کوو.',
      en: 'With over a decade of experience, we deliver trusted products and services across Afghanistan.',
    },
    showInNav: true,
  },
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
  const [pages, setPages] = useState<CustomPageDraft[]>(DEFAULT_PAGES);

  const [building, setBuilding] = useState<boolean>(false);
  const [loadingDeployments, setLoadingDeployments] = useState<boolean>(true);
  const [deployments, setDeployments] = useState<StorefrontDeploymentRow[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function fetchDeployments() {
    setLoadingDeployments(true);
    try {
      const res = await fetch('/api/studio/site-builder');
      const data = await res.json();
      if (res.ok && Array.isArray(data.deployments)) {
        setDeployments(data.deployments);
      }
    } catch {
      // keep silent if offline
    } finally {
      setLoadingDeployments(false);
    }
  }

  useEffect(() => {
    fetchDeployments();
  }, []);

  function addCustomPage() {
    const idx = pages.length + 1;
    setPages((prev) => [
      ...prev,
      {
        id: `page-${Date.now().toString(36)}`,
        slug: `page-${idx}`,
        title: { fa: `صفحه ${idx}`, ps: `پاڼه ${idx}`, en: `Page ${idx}` },
        content: {
          fa: 'محتوای اختصاصی این صفحه را اینجا بنویسید.',
          ps: 'د دې پاڼې ځانګړې منځپانګه دلته ولیکئ.',
          en: 'Enter custom page content here.',
        },
        showInNav: true,
      },
    ]);
  }

  function updatePage(index: number, patch: Partial<CustomPageDraft>) {
    setPages((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function removePage(index: number) {
    setPages((prev) => prev.filter((_, i) => i !== index));
  }

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
          businessName,
          prompt: storePrompt,
          theme: palette,
          layout,
          industry,
          whatsappPhone,
          hesabPayId,
          pages,
          publishToS3: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || t.common.error);

      if (data.previewHtml) {
        setPreviewHtml(data.previewHtml);
      }

      await fetchDeployments();

      setStatusMessage({
        type: 'success',
        text: `وب‌سایت شما با موفقیت تولید و منتشر شد (v${data.currentVersion || 1}): ${
          data.liveUrl || `https://${subdomainSlug}.ariacloudservices.org`
        }`,
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

          {/* Multi-Page Editor */}
          <div className="pages-editor">
            <div className="pages-head">
              <label>صفحات اضافی سایت / Custom Pages ({pages.length})</label>
              <button type="button" className="add-page-btn" onClick={addCustomPage}>
                + افزودن صفحه / Add Page
              </button>
            </div>
            {pages.map((p, idx) => (
              <div key={p.id} className="page-item-card">
                <div className="page-item-top">
                  <input
                    type="text"
                    value={p.slug}
                    onChange={(e) => updatePage(idx, { slug: e.target.value })}
                    placeholder="about"
                    className="builder-input page-slug"
                    dir="ltr"
                  />
                  <label className="nav-check">
                    <input
                      type="checkbox"
                      checked={p.showInNav}
                      onChange={(e) => updatePage(idx, { showInNav: e.target.checked })}
                    />
                    <span>Show in header nav</span>
                  </label>
                  <button
                    type="button"
                    className="remove-page-btn"
                    onClick={() => removePage(idx)}
                  >
                    حذف
                  </button>
                </div>
                <div className="form-row">
                  <input
                    type="text"
                    value={p.title.fa}
                    onChange={(e) => updatePage(idx, { title: { ...p.title, fa: e.target.value } })}
                    placeholder="عنوان دری"
                    className="builder-input"
                  />
                  <input
                    type="text"
                    value={p.title.en}
                    onChange={(e) => updatePage(idx, { title: { ...p.title, en: e.target.value } })}
                    placeholder="English Title"
                    className="builder-input"
                    dir="ltr"
                  />
                </div>
                <div className="form-row" style={{ marginTop: 8 }}>
                  <textarea
                    rows={2}
                    value={p.content.fa}
                    onChange={(e) => updatePage(idx, { content: { ...p.content, fa: e.target.value } })}
                    placeholder="متن صفحه (دری)..."
                    className="builder-textarea"
                  />
                  <textarea
                    rows={2}
                    value={p.content.en}
                    onChange={(e) => updatePage(idx, { content: { ...p.content, en: e.target.value } })}
                    placeholder="Page content (English)..."
                    className="builder-textarea"
                    dir="ltr"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="build-btn"
            disabled={building || !subdomainSlug}
          >
            {building ? 'در حال تولید و انتشار به کلاود…' : '🚀 کامپایل و انتشار وب‌سایت / Build & Publish Storefront'}
          </button>
        </form>

        {/* Deployments & Preview Column */}
        <div className="builder-side-col">
          <div className="builder-card">
            <h2 className="card-title">وب‌سایت‌های منتشر شده / Live Storefronts</h2>
            {loadingDeployments ? (
              <p className="muted-empty">در حال بارگذاری سایت‌ها...</p>
            ) : deployments.length === 0 ? (
              <p className="muted-empty">هنوز وب‌سایتی منتشر نشده است. فرم را تکمیل و منتشر کنید.</p>
            ) : (
              <div className="deployments-list">
                {deployments.map((dep) => (
                  <div key={dep.deploymentId} className="dep-item">
                    <div className="dep-info">
                      <span className="dep-subdomain">{dep.subdomainSlug}.ariacloudservices.org</span>
                      <span className="dep-status">
                        ✅ فعال · v{dep.currentVersion ?? 1} · {dep.industry || 'retail'}
                      </span>
                    </div>
                    <div className="dep-actions">
                      {Array.isArray(dep.pages) && dep.pages.length > 0 && (
                        <button
                          type="button"
                          className="dep-load-btn"
                          onClick={() => {
                            setSubdomainSlug(dep.subdomainSlug);
                            if (dep.industry) setIndustry(dep.industry);
                            if (dep.pages) setPages(dep.pages);
                          }}
                        >
                          ویرایش
                        </button>
                      )}
                      <a
                        href={dep.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dep-link-btn"
                      >
                        مشاهده ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {previewHtml && (
            <div className="builder-card">
              <div className="preview-head">
                <h2 className="card-title" style={{ margin: 0 }}>پیش‌نمایش زنده / Live Preview</h2>
                <div className="device-toggle">
                  <button
                    type="button"
                    className={previewDevice === 'desktop' ? 'active' : ''}
                    onClick={() => setPreviewDevice('desktop')}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    className={previewDevice === 'mobile' ? 'active' : ''}
                    onClick={() => setPreviewDevice('mobile')}
                  >
                    Mobile
                  </button>
                </div>
              </div>
              <div className={`preview-frame-wrap ${previewDevice}`}>
                <iframe
                  title="Storefront Preview"
                  srcDoc={previewHtml}
                  sandbox="allow-scripts"
                  className="preview-iframe"
                />
              </div>
            </div>
          )}

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
        .builder-container { display: flex; flex-direction: column; gap: 24px; }
        .builder-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .builder-title { font-size: 24px; font-weight: 700; color: inherit; margin: 0; }
        .builder-subtitle { font-size: 14px; color: #94a3b8; margin: 4px 0 0 0; }
        .domain-badge { background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 12px; border-radius: 999px; font-size: 13px; font-family: ui-monospace, SFMono-Regular, monospace; }

        .status-banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 14px; }
        .status-banner.success { background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; }
        .status-banner.error { background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; }

        .builder-grid { display: grid; grid-template-columns: 7fr 5fr; gap: 24px; align-items: start; }
        @media (max-width: 960px) { .builder-grid { grid-template-columns: 1fr; } }

        .builder-form-card, .builder-card { background: rgba(13, 25, 21, 0.8); border: 1px solid #162c24; border-radius: 12px; padding: 24px; }
        :global(.portal-root.light) .builder-form-card, :global(.portal-root.light) .builder-card { background: #ffffff; border-color: #e2e8f0; }

        .card-title { font-size: 16px; font-weight: 700; margin: 0 0 18px; color: inherit; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } }
        .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        label { font-size: 13px; font-weight: 500; color: #cbd5e1; }
        :global(.portal-root.light) label { color: #334155; }

        .builder-input, .builder-select, .builder-textarea { padding: 10px 12px; border-radius: 8px; border: 1px solid #234338; background: #091512; color: inherit; font-size: 14px; outline: none; font-family: inherit; width: 100%; box-sizing: border-box; }
        :global(.portal-root.light) .builder-input, :global(.portal-root.light) .builder-select, :global(.portal-root.light) .builder-textarea { background: #f8fafc; border-color: #cbd5e1; }
        .builder-input:focus, .builder-select:focus, .builder-textarea:focus { border-color: #10b981; }

        .palette-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
        .palette-tile { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 7px; border: 1px solid #234338; background: #091512; color: #cbd5e1; font-size: 12px; cursor: pointer; transition: all 0.15s ease; }
        :global(.portal-root.light) .palette-tile { background: #f8fafc; border-color: #e2e8f0; color: #334155; }
        .palette-tile.active { border-color: #10b981; background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: 600; }
        .color-dot { width: 12px; height: 12px; border-radius: 50%; }

        .layout-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
        .layout-tile { text-align: start; padding: 10px; border-radius: 8px; border: 1px solid #234338; background: #091512; color: inherit; cursor: pointer; transition: all 0.15s ease; }
        :global(.portal-root.light) .layout-tile { background: #f8fafc; border-color: #e2e8f0; }
        .layout-tile.active { border-color: #10b981; background: rgba(16, 185, 129, 0.15); }
        .layout-name { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
        .layout-desc { font-size: 11px; color: #94a3b8; line-height: 1.4; }

        .pages-editor { margin-bottom: 16px; border: 1px solid #1e3a30; border-radius: 10px; padding: 14px; background: rgba(9, 21, 18, 0.45); }
        :global(.portal-root.light) .pages-editor { background: #f8fafc; border-color: #e2e8f0; }
        .pages-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .add-page-btn { padding: 5px 10px; border-radius: 6px; border: 1px solid #10b981; background: rgba(16, 185, 129, 0.14); color: #34d399; font-size: 12px; font-weight: 600; cursor: pointer; }
        .page-item-card { border: 1px solid #1c382e; border-radius: 8px; padding: 12px; margin-bottom: 10px; background: rgba(4, 15, 12, 0.5); }
        :global(.portal-root.light) .page-item-card { background: #fff; border-color: #e2e8f0; }
        .page-item-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
        .page-slug { max-width: 140px; padding: 6px 10px; font-size: 13px; }
        .nav-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; }
        .remove-page-btn { margin-inline-start: auto; padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.4); background: transparent; color: #f87171; font-size: 12px; cursor: pointer; }

        .build-btn { width: 100%; padding: 13px; border-radius: 8px; border: none; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #04120d; font-weight: 700; font-size: 14px; cursor: pointer; transition: opacity 0.15s ease; margin-top: 8px; }
        .build-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .builder-side-col { display: flex; flex-direction: column; gap: 20px; }
        .muted-empty { font-size: 13px; color: #94a3b8; margin: 0; }
        .deployments-list { display: flex; flex-direction: column; gap: 12px; }
        .dep-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px; border-radius: 8px; background: #091512; border: 1px solid #1c382e; flex-wrap: wrap; }
        :global(.portal-root.light) .dep-item { background: #f8fafc; border-color: #e2e8f0; }
        .dep-info { display: flex; flex-direction: column; gap: 4px; }
        .dep-subdomain { font-size: 13px; font-weight: 600; font-family: ui-monospace, SFMono-Regular, monospace; }
        .dep-status { font-size: 12px; color: #34d399; }
        .dep-actions { display: flex; align-items: center; gap: 6px; }
        .dep-load-btn { padding: 6px 10px; border-radius: 6px; border: 1px solid #234338; background: transparent; color: inherit; font-size: 12px; cursor: pointer; }
        .dep-link-btn { padding: 6px 12px; border-radius: 6px; background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 12px; font-weight: 600; text-decoration: none; }

        .preview-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .device-toggle { display: inline-flex; gap: 4px; border: 1px solid #234338; border-radius: 6px; padding: 2px; }
        .device-toggle button { border: none; background: transparent; color: #94a3b8; padding: 4px 10px; font-size: 11px; border-radius: 4px; cursor: pointer; }
        .device-toggle button.active { background: #10b981; color: #04120d; font-weight: 700; }
        .preview-frame-wrap { border: 1px solid #1c382e; border-radius: 10px; overflow: hidden; background: #fff; margin: 0 auto; transition: width 0.2s ease; }
        .preview-frame-wrap.desktop { width: 100%; }
        .preview-frame-wrap.mobile { width: 375px; max-width: 100%; }
        .preview-iframe { width: 100%; height: 480px; border: none; display: block; }

        .info-card { border-color: #1e3a30; }
        .info-title { font-size: 14px; font-weight: 700; margin: 0 0 12px; }
        .info-list { margin: 0; padding-inline-start: 18px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #94a3b8; line-height: 1.6; }
      `}</style>
    </div>
  );
}
