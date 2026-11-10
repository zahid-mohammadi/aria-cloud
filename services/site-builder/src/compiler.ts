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
  const merchantId = s.hesabPayMerchantId || ('HP-AF-' + s.subdomainSlug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
  const products = r.products
    .map((p, i) => {
      const id = p.id || `prd-${i + 1}`;
      return `
    <article class="card product" data-id="${esc(id)}" data-price="${esc(p.priceAfn)}" data-title-fa="${esc(p.name.fa)}" data-title-ps="${esc(p.name.ps)}" data-title-en="${esc(p.name.en)}">
      <h3 class="card-title">${tr(p.name)}</h3>
      <p class="muted">${tr(p.description)}</p>
      <div class="row between">
        <span class="muted">${tr(p.category)}</span>
        <b>${AFN(p.priceAfn)}</b>
      </div>
      <button class="btn primary" data-add="${esc(id)}">${tr({ fa: 'افزودن به سبد', ps: 'سله ته زیات کړئ', en: 'Add to cart' })}</button>
    </article>`;
    })
    .join('\n');

  return `
  <section class="sector">
    <h2 class="section-title">${tr({ fa: 'محصولات', ps: 'محصولات', en: 'Products' })}</h2>
    <div class="grid">${products}</div>
  </section>
  <div class="cart-bar">
    <strong id="cart-summary">${tr({ fa: 'سبد خرید: ۰ قلم (0 افغانی)', ps: 'ستاسو سله: ۰ توکي (0 AFN)', en: 'Cart: 0 items (0 AFN)' })}</strong>
    <div class="cart-actions">
      <button class="btn hp" id="checkout-hp">💳 ${tr({ fa: 'پرداخت با HesabPay', ps: 'د HesabPay تادیه', en: 'Pay with HesabPay' })}</button>
      <button class="btn wa" id="checkout-wa">💬 ${tr({ fa: 'سفارش از طریق واتساپ', ps: 'د واټساپ له لارې سپارښت', en: 'Order via WhatsApp' })}</button>
    </div>
  </div>
  <div class="hp-panel" id="hesabpay-panel" style="display:none">
    <div class="hp-card">
      <h3>${tr({ fa: 'پرداخت آنی HesabPay', ps: 'د HesabPay سمدستي تادیه', en: 'HesabPay Instant Payment' })}</h3>
      <p class="muted">${tr({ fa: 'شناسه پذیرنده', ps: 'د منونکي ID', en: 'Merchant ID' })}: <b>${esc(merchantId)}</b></p>
      <p class="muted">${tr({ fa: 'مبلغ قابل پرداخت', ps: 'د تادیې وړ پیسې', en: 'Amount payable' })}: <b id="hp-amount"></b></p>
      <button class="btn ghost" id="hp-close">${tr({ fa: 'بستن', ps: 'تړل', en: 'Close' })}</button>
    </div>
  </div>`;
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

const CART_SCRIPT = `
(function(){
  var body = document.body;
  function lang(){ return body.getAttribute('data-lang') || 'fa'; }
  function whatsapp(){ return (body.getAttribute('data-whatsapp') || '').replace(/[^0-9]/g, ''); }
  var cart = {};
  var products = {};
  function collect(){
    var els = document.querySelectorAll('.product[data-id]');
    products = {};
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      products[el.getAttribute('data-id')] = {
        price: Number(el.getAttribute('data-price') || 0),
        fa: el.getAttribute('data-title-fa') || '',
        ps: el.getAttribute('data-title-ps') || '',
        en: el.getAttribute('data-title-en') || ''
      };
    }
  }
  function title(p){ var l = lang(); return p[l] || p.fa || ''; }
  function summary(){
    var count = 0, total = 0;
    for (var id in cart) { var p = products[id]; if (p) { count += cart[id]; total += cart[id] * p.price; } }
    return { count: count, total: total };
  }
  function render(){
    var el = document.getElementById('cart-summary'); if (!el) return;
    var s = summary(); var l = lang();
    el.textContent = l === 'en' ? 'Cart: ' + s.count + ' items (' + s.total.toLocaleString() + ' AFN)'
      : l === 'ps' ? 'ستاسو سله: ' + s.count + ' توکي (' + s.total.toLocaleString() + ' AFN)'
      : 'سبد خرید: ' + s.count + ' قلم (' + s.total.toLocaleString() + ' افغانی)';
  }
  function add(id){ cart[id] = (cart[id] || 0) + 1; render(); }
  function wa(){
    var s = summary();
    if (s.count === 0) { alert(lang() === 'en' ? 'Add a product first.' : 'لطفاً ابتدا محصولی انتخاب کنید.'); return; }
    var NL = String.fromCharCode(10);
    var lines = [];
    for (var id in cart) { var p = products[id]; if (p && cart[id] > 0) { lines.push('- ' + title(p) + ' x' + cart[id] + ' = ' + (cart[id] * p.price).toLocaleString() + ' AFN'); } }
    var msg = 'سلام! سفارش جدید:' + NL + lines.join(NL) + NL + 'مجموع کل: ' + s.total.toLocaleString() + ' AFN';
    window.open('https://wa.me/' + whatsapp() + '?text=' + encodeURIComponent(msg), '_blank');
  }
  function hp(){
    var s = summary();
    if (s.total === 0) { alert(lang() === 'en' ? 'Add an item to pay.' : 'لطفاً محصولی انتخاب نمایید.'); return; }
    var amt = document.getElementById('hp-amount'); if (amt) amt.textContent = s.total.toLocaleString() + ' AFN';
    var el = document.getElementById('hesabpay-panel'); if (el) el.style.display = 'flex';
  }
  document.addEventListener('click', function(e){
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-setlang')) { setTimeout(render, 0); return; }
    if (t && t.closest) { var b = t.closest('[data-add]'); if (b) { add(b.getAttribute('data-add')); return; } }
    if (t && t.id === 'checkout-wa') { wa(); return; }
    if (t && t.id === 'checkout-hp') { hp(); return; }
    if (t && t.id === 'hp-close') { var el = document.getElementById('hesabpay-panel'); if (el) el.style.display = 'none'; return; }
  });
  collect(); render();
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
.site-nav{display:inline-flex;gap:16px;align-items:center}
.site-nav a{color:var(--muted);text-decoration:none;font-size:14px;font-weight:600;transition:color .15s}
.site-nav a:hover{color:var(--text)}
@media (max-width:768px){.site-nav{display:none}}
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
body.has-cart{padding-bottom:96px}
.cart-bar{position:fixed;bottom:16px;left:16px;right:16px;z-index:50;max-width:900px;margin:0 auto;background:var(--surface);border:1px solid var(--primary);border-radius:14px;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;box-shadow:0 10px 30px rgba(15,23,42,.18)}
.cart-actions{display:flex;gap:8px;flex-wrap:wrap}
.btn.hp{background:#2563eb;color:#fff}
.hp-panel{position:fixed;inset:0;z-index:60;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;padding:20px}
.hp-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;max-width:380px;width:100%}
.hp-card h3{margin:0 0 12px}
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

  const merchantId = schema.hesabPayMerchantId || ('HP-AF-' + schema.subdomainSlug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));

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
<link rel="manifest" href="/manifest.webmanifest">
<style>${css}</style>
</head>
<body data-layout="${schema.layout}" data-theme="${schema.theme}" data-lang="fa" data-whatsapp="${esc(schema.whatsappCta.phoneNumber)}" data-merchant="${esc(merchantId)}"${schema.industry === 'retail' ? ' class="has-cart"' : ''}>
<header class="site-header"><div class="inner">
  <span class="brand"><span class="dot"></span>${tr(schema.header.businessName)}</span>
  <nav class="site-nav">
    <a href="#hero">${tr({ fa: 'صفحه اصلی', ps: 'اصلي پاڼه', en: 'Home' })}</a>
    ${(schema.pages || []).filter(p => p.showInNav !== false).map(p => `<a href="#page-${esc(p.slug)}">${tr(p.title)}</a>`).join('')}
    <a href="#contact">${tr({ fa: 'تماس', ps: 'اړیکه', en: 'Contact' })}</a>
  </nav>
  <div class="lang-switch">
    <button data-setlang="fa" class="active">دری</button>
    <button data-setlang="ps">پښتو</button>
    <button data-setlang="en">EN</button>
  </div>
  <a class="btn wa" href="${WA(schema.whatsappCta.phoneNumber, schema.whatsappCta.prefilledMessage.en)}">${tr({ fa: 'واتساپ', ps: 'واټساپ', en: 'WhatsApp' })}</a>
</div></header>

<main>
  <section class="hero" id="hero">
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

  ${(schema.pages || []).map(p => `
  <section class="sector site-page" id="page-${esc(p.slug)}">
    <h2 class="section-title">${tr(p.title)}</h2>
    <div class="panel">
      <div style="font-size:15px;line-height:1.8;">
        ${tr(p.content)}
      </div>
    </div>
  </section>
  `).join('')}

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
${schema.industry === 'retail' ? `<script>${CART_SCRIPT}</script>` : ''}
</body>
</html>`;
}
