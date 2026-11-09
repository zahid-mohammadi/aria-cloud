/**
 * AriaCloud Universal HTML Compiler — self-contained, multi-layout.
 *
 * No CDN: all CSS and JS are embedded, so a site works offline and on 2G/3G.
 * Three layout archetypes (`aurora`, `minimal`, `editorial`) share one schema;
 * `theme` controls the palette, `layout` controls the structure. All content is
 * rendered server-side as escaped HTML — no schema JSON is ever inlined into a
 * script, which closes the injection surface entirely.
 */
import { LocalizedString, UniversalSiteSchema } from './types';

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** A localized string rendered as three spans, toggled by `body[data-lang]`. */
function tr(text: LocalizedString): string {
  return `<span class="i18n i18n-fa">${esc(text.fa)}</span><span class="i18n i18n-ps">${esc(text.ps)}</span><span class="i18n i18n-en">${esc(text.en)}</span>`;
}

const AFN = (n: number) => `${Number(n || 0).toLocaleString('en-US')} AFN`;

const PALETTES: Record<string, { primary: string; dark: string; accent: string; bg: string; surface: string; border: string; text: string; muted: string }> = {
  emerald: { primary: '#059669', dark: '#065f46', accent: '#d97706', bg: '#f8fafc', surface: '#ffffff', border: '#e5e7eb', text: '#111827', muted: '#6b7280' },
  lapis: { primary: '#1d4ed8', dark: '#1e3a8a', accent: '#f59e0b', bg: '#f8fafc', surface: '#ffffff', border: '#e5e7eb', text: '#111827', muted: '#6b7280' },
  saffron: { primary: '#d97706', dark: '#92400e', accent: '#059669', bg: '#fffbeb', surface: '#ffffff', border: '#fde68a', text: '#111827', muted: '#6b7280' },
  slate: { primary: '#334155', dark: '#1e293b', accent: '#0284c7', bg: '#f8fafc', surface: '#ffffff', border: '#e5e7eb', text: '#111827', muted: '#6b7280' },
  teal: { primary: '#0d9488', dark: '#115e59', accent: '#e11d48', bg: '#f0fdfa', surface: '#ffffff', border: '#ccfbf1', text: '#111827', muted: '#6b7280' },
  crimson: { primary: '#be123c', dark: '#881337', accent: '#d97706', bg: '#fff1f2', surface: '#ffffff', border: '#fecdd3', text: '#111827', muted: '#6b7280' },
};

const WA = (phone: string, msg: string) =>
  `https://wa.me/${String(phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;

// --- sector renderers -------------------------------------------------------

function clinicSection(s: UniversalSiteSchema): string {
  const c = s.clinic;
  if (!c) return '';
  const doctors = c.doctors
    .map(
      (d) => `
    <article class="card">
      <h3 class="card-title">${tr(d.name)}</h3>
      <p class="card-sub">${tr(d.specialty)}</p>
      <p class="muted">${tr(d.qualifications)}</p>
      <div class="row between"><span class="muted">${tr({ fa: 'فیس معاینه', ps: 'د لیدنې فیس', en: 'Consultation fee' })}</span><b>${AFN(d.consultationFeeAfn)}</b></div>
      <a class="btn wa" target="_blank" rel="noopener" href="${WA(s.whatsappCta.phoneNumber, `${d.name.en} — ${d.name.fa}`)}">${tr({ fa: 'رزرو نوبت', ps: 'وخت اخیستل', en: 'Book' })}</a>
    </article>`
    )
    .join('\n');

  const tests = c.diagnosticTests
    .map(
      (t) => `
      <div class="row between"><span>${tr(t.name)}</span><span class="muted">${tr(t.category)}</span><b>${AFN(t.priceAfn)}</b></div>`
    )
    .join('\n');

  return `
  <section class="sector">
    <h2 class="section-title">${tr({ fa: 'داکتران و متخصصین', ps: 'ډاکټران او متخصصین', en: 'Doctors & specialists' })}</h2>
    <div class="grid">${doctors}</div>
    <h2 class="section-title">${tr({ fa: 'خدمات تشخیصیه', ps: 'د معایناتو خدمتونه', en: 'Diagnostic services' })}</h2>
    <div class="panel">${tests}</div>
  </section>`;
}

function retailSection(s: UniversalSiteSchema): string {
  const r = s.retail;
  if (!r) return '';
  const products = r.products
    .map((p) => {
      const msg = `${p.name.en} — ${p.priceAfn} AFN`;
      return `
    <article class="card">
      <h3 class="card-title">${tr(p.name)}</h3>
      <p class="muted">${tr(p.description)}</p>
      <div class="row between"><span class="muted">${tr(p.category)}</span><b>${AFN(p.priceAfn)}</b></div>
      <a class="btn wa" target="_blank" rel="noopener" href="${WA(s.whatsappCta.phoneNumber, msg)}">${tr({ fa: 'سفارش', ps: 'سپارښت', en: 'Order' })}</a>
    </article>`;
    })
    .join('\n');
  return `<section class="sector"><h2 class="section-title">${tr({ fa: 'محصولات', ps: 'محصولات', en: 'Products' })}</h2><div class="grid">${products}</div></section>`;
}

function schoolSection(s: UniversalSiteSchema): string {
  const sc = s.school;
  if (!sc) return '';
  const courses = sc.courses
    .map(
      (c) => `
    <article class="card">
      <h3 class="card-title">${tr(c.title)}</h3>
      <p class="muted">${tr(c.description)}</p>
      <div class="row between"><span class="muted">${c.durationMonths} ${tr({ fa: 'ماه', ps: 'میاشتې', en: 'months' })}</span><b>${AFN(c.feeAfn)}</b></div>
    </article>`
    )
    .join('\n');
  return `<section class="sector"><h2 class="section-title">${tr({ fa: 'کورس‌ها', ps: 'کورسونه', en: 'Courses' })}</h2><div class="grid">${courses}</div><p class="muted">${tr(sc.accreditation)}</p></section>`;
}

function logisticsSection(s: UniversalSiteSchema): string {
  const l = s.logistics;
  if (!l) return '';
  const routes = l.routes
    .map(
      (r) => `
      <div class="row between"><span>${tr(r.origin)} → ${tr(r.destination)}</span><span class="muted">${r.transitTimeDays} ${tr({ fa: 'روز', ps: 'ورځې', en: 'days' })}</span><b>${AFN(r.ratePerKgAfn)}/kg</b></div>`
    )
    .join('\n');
  return `<section class="sector"><h2 class="section-title">${tr({ fa: 'مسیرها', ps: 'لارې', en: 'Routes' })}</h2><div class="panel">${routes}</div><p class="muted">${tr(l.fleetInfo)}</p></section>`;
}

function exportSection(s: UniversalSiteSchema): string {
  const e = s.export;
  if (!e) return '';
  const commodities = e.commodities
    .map(
      (c) => `
    <article class="card">
      <h3 class="card-title">${tr(c.title)}</h3>
      <p class="muted">${tr(c.gradeSpec)}</p>
      <p class="muted">${tr(c.originProvince)} · ${tr(c.packagingTypes)}</p>
    </article>`
    )
    .join('\n');
  return `<section class="sector"><h2 class="section-title">${tr({ fa: 'محصولات صادراتی', ps: 'صادراتي محصولات', en: 'Export commodities' })}</h2><div class="grid">${commodities}</div></section>`;
}

function servicesSection(s: UniversalSiteSchema): string {
  const sv = s.services;
  if (!sv) return '';
  const offerings = sv.offerings
    .map(
      (o) => `
    <article class="card">
      <h3 class="card-title">${tr(o.title)}</h3>
      <p class="muted">${tr(o.description)}</p>
      ${o.priceRangeAfn ? `<b>${esc(o.priceRangeAfn)}</b>` : ''}
    </article>`
    )
    .join('\n');
  return `<section class="sector"><h2 class="section-title">${tr({ fa: 'خدمات', ps: 'خدمتونه', en: 'Services' })}</h2><div class="grid">${offerings}</div></section>`;
}

// --- lang-switch script (static, no user data) -----------------------------

const LANG_SCRIPT = `
(function(){
  var root = document.documentElement, body = document.body;
  function setLang(lang){
    body.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'en' ? 'ltr' : 'rtl');
    try { localStorage.setItem('aria_lang', lang); } catch(e){}
  }
  document.querySelectorAll('[data-setlang]').forEach(function(b){
    b.addEventListener('click', function(){ setLang(b.getAttribute('data-setlang')); });
  });
  try { var saved = localStorage.getItem('aria_lang'); if (saved) setLang(saved); } catch(e){}
})();
`;

// --- shared stylesheet ------------------------------------------------------

const CSS = `
:root{--primary:PRIMARY;--primary-dark:DARK;--accent:ACCENT;--bg:BG;--surface:SURFACE;--border:BORDER;--text:TEXT;--muted:MUTED}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,'Segoe UI',Tahoma,'Noto Naskh Arabic',sans-serif;line-height:1.65}
[dir="rtl"] body{direction:rtl}
img{max-width:100%}
a{color:inherit}
.muted{color:var(--muted)}
.i18n-ps,.i18n-en{display:none}
[data-lang="fa"] .i18n-ps,[data-lang="fa"] .i18n-en{display:none}
[data-lang="fa"] .i18n-fa{display:inline}
[data-lang="ps"] .i18n-fa,[data-lang="ps"] .i18n-en{display:none}
[data-lang="ps"] .i18n-ps{display:inline}
[data-lang="en"] .i18n-fa,[data-lang="en"] .i18n-ps{display:none}
[data-lang="en"] .i18n-en{display:inline}
.site-header{position:sticky;top:0;z-index:10;background:var(--surface);border-bottom:1px solid var(--border);padding:12px 20px}
.site-header .inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.brand{font-weight:800;font-size:18px}
.brand .dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--primary);margin-inline-end:6px}
.lang-switch{display:inline-flex;gap:2px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:2px}
.lang-switch button{border:0;background:transparent;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;color:var(--muted)}
.lang-switch button.active{background:var(--primary);color:#fff}
main{max-width:1100px;margin:0 auto;padding:0 20px}
.hero{padding:64px 0 40px}
.section-badge{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--primary);background:color-mix(in srgb,var(--primary) 10%,transparent);border:1px solid color-mix(in srgb,var(--primary) 30%,transparent);padding:4px 10px;border-radius:999px;margin-bottom:14px}
h1.hero-title{font-size:clamp(28px,5vw,46px);line-height:1.15;margin:0 0 14px;letter-spacing:-.02em}
.hero-sub{font-size:17px;color:var(--muted);max-width:640px;margin:0 0 22px}
.cta-row{display:flex;gap:10px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:6px;padding:11px 18px;border-radius:9px;font-weight:700;font-size:14px;text-decoration:none;cursor:pointer;border:1px solid transparent}
.btn.primary{background:var(--primary);color:#fff}
.btn.wa{background:#16a34a;color:#fff}
.btn.ghost{background:var(--surface);border-color:var(--border);color:var(--text)}
.specs{display:flex;gap:18px;flex-wrap:wrap;margin-top:26px;padding-top:20px;border-top:1px solid var(--border)}
.spec{font-size:13px;color:var(--muted)}
.spec b{display:block;color:var(--text);font-size:15px}
.sector{padding:34px 0}
.section-title{font-size:22px;margin:0 0 16px;letter-spacing:-.01em}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px;box-shadow:0 1px 3px rgba(15,23,42,.05)}
.card-title{font-size:16px;margin:0 0 4px}
.card-sub{color:var(--primary);font-size:13px;font-weight:600;margin:0 0 8px}
.panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px 16px}
.row{display:flex;gap:10px;align-items:center}
.row.between{justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border)}
.row.between:last-child{border-bottom:0}
.site-footer{border-top:1px solid var(--border);margin-top:40px;padding:26px 20px;text-align:center;color:var(--muted);font-size:13px}
/* ---- layout archetypes ---- */
[data-layout="aurora"] .hero{background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;border-radius:18px;padding:52px 40px}
[data-layout="aurora"] .hero .hero-sub{color:rgba(255,255,255,.85)}
[data-layout="aurora"] .hero .section-badge{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);color:#fff}
[data-layout="aurora"] .hero .btn.primary{background:#fff;color:var(--primary-dark)}
[data-layout="minimal"] .hero{text-align:center;padding:72px 0 44px}
[data-layout="minimal"] .hero-sub{margin-inline:auto}
[data-layout="minimal"] .cta-row{justify-content:center}
[data-layout="minimal"] .specs{justify-content:center}
[data-layout="minimal"] .section-title{text-align:center}
[data-layout="editorial"] .hero{border-bottom:2px solid var(--text);padding:48px 0 28px}
[data-layout="editorial"] h1.hero-title{font-family:Georgia,'Times New Roman',serif}
[data-layout="editorial"] .section-title{font-family:Georgia,'Times New Roman',serif}
[data-layout="editorial"] .card{border-radius:0;border-inline-start:3px solid var(--primary)}
@media(max-width:640px){.hero{padding:40px 0}.grid{grid-template-columns:1fr}}
`;

export function compileUniversalSiteHtml(schema: UniversalSiteSchema): string {
  const palette = PALETTES[schema.theme] || PALETTES.emerald;
  const css = CSS.replace(/PRIMARY/g, palette.primary)
    .replace(/DARK/g, palette.dark)
    .replace(/ACCENT/g, palette.accent)
    .replace(/BG/g, palette.bg)
    .replace(/SURFACE/g, palette.surface)
    .replace(/BORDER/g, palette.border)
    .replace(/TEXT/g, palette.text)
    .replace(/MUTED/g, palette.muted);

  const sector =
    schema.industry === 'clinic' ? clinicSection(schema)
      : schema.industry === 'retail' ? retailSection(schema)
        : schema.industry === 'school' ? schoolSection(schema)
          : schema.industry === 'logistics' ? logisticsSection(schema)
            : schema.industry === 'export' ? exportSection(schema)
              : servicesSection(schema);

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(schema.header.businessName.fa)} — ${esc(schema.header.tagline.fa)}</title>
<meta name="description" content="${esc(schema.hero.subheadline.fa)}">
<meta name="theme-color" content="${palette.primary}">
<style>${css}</style>
</head>
<body data-layout="${schema.layout}" data-theme="${schema.theme}" data-lang="fa">
<header class="site-header"><div class="inner">
  <span class="brand"><span class="dot"></span>${tr(schema.header.businessName)}</span>
  <div class="lang-switch">
    <button data-setlang="fa" class="active">دری</button>
    <button data-setlang="ps">پښتو</button>
    <button data-setlang="en">EN</button>
  </div>
  <a class="btn wa" href="${WA(schema.whatsappCta.phoneNumber, schema.whatsappCta.prefilledMessage.en)}">${tr({ fa: 'واتساپ', ps: 'واټساپ', en: 'WhatsApp' })}</a>
</div></header>

<main>
  <section class="hero">
    <span class="section-badge">${tr({ fa: 'کسب‌وکار افغان', ps: 'افغان سوداګري', en: 'Afghan business' })}</span>
    <h1 class="hero-title">${tr(schema.hero.headline)}</h1>
    <p class="hero-sub">${tr(schema.hero.subheadline)}</p>
    <div class="cta-row">
      <a class="btn primary" href="#contact">${tr(schema.hero.primaryCtaText)}</a>
      <a class="btn ghost" href="${WA(schema.whatsappCta.phoneNumber, schema.whatsappCta.prefilledMessage.en)}">${tr({ fa: 'تماس', ps: 'اړیکه', en: 'Contact' })}</a>
    </div>
    <div class="specs">
      <span class="spec"><b>${esc(schema.header.city)}</b>${tr({ fa: 'موقعیت', ps: 'ځای', en: 'Location' })}</span>
      <span class="spec"><b>${esc(schema.header.phone)}</b>${tr({ fa: 'تماس', ps: 'اړیکه', en: 'Phone' })}</span>
      <span class="spec"><b>${esc(schema.header.email)}</b>${tr({ fa: 'ایمیل', ps: 'ایمیل', en: 'Email' })}</span>
    </div>
  </section>

  ${sector}

  <section class="sector" id="contact">
    <h2 class="section-title">${tr({ fa: 'تماس با ما', ps: 'موږ سره اړیکه', en: 'Contact us' })}</h2>
    <div class="panel">
      <div class="row between"><span class="muted">${tr({ fa: 'آدرس', ps: 'پته', en: 'Address' })}</span><span>${tr(schema.header.address)}</span></div>
      <div class="row between"><span class="muted">${tr({ fa: 'تلیفون', ps: 'ټیلیفون', en: 'Phone' })}</span><span>${esc(schema.header.phone)}</span></div>
      <div class="row between"><span class="muted">${tr({ fa: 'ایمیل', ps: 'ایمیل', en: 'Email' })}</span><span>${esc(schema.header.email)}</span></div>
    </div>
  </section>
</main>

<footer class="site-footer">${tr({ fa: 'ساخته‌شده توسط آریا کلاود', ps: 'د آریا کلاوډ لخوا جوړ شوی', en: 'Built with AriaCloud' })}</footer>
<script>${LANG_SCRIPT}</script>
</body>
</html>`;
}
