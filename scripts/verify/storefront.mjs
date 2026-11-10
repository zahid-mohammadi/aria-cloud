/**
 * Storefront safety verification.
 *
 *  - generated copy and product data cannot break out of the page (XSS)
 *  - a merchant cannot publish into a slug another merchant owns
 */
import path from 'node:path';
import { ROOT, freshDatabase, makeChecker, bindDatabaseToPglite } from './helpers.mjs';

const TENANT_A = '88888888-8888-8888-8888-888888888888';
const TENANT_B = '99999999-9999-9999-9999-999999999999';
const ROOT_DOMAIN = 'ariacloudservices.org';

export async function run() {
  console.log('\n── storefront safety ' + '─'.repeat(43));
  const { check, failures } = makeChecker();

  process.env.DATABASE_URL = 'postgresql://pglite/aria_cloud';
  delete process.env.AWS_ACCESS_KEY_ID;

  const database = await import(path.join(ROOT, 'packages/database/dist/index.js'));
  const site = await import(path.join(ROOT, 'services/site-builder/dist/index.js'));

  // ------------------------------------------------- universal compiler page
  const schema = site.createSectorBlueprint('clinic', 'xss-clinic', '', undefined);
  const scriptPayload = `</script><script>alert('xss')</script>`;
  const attrPayload = `Kabul's "best" <img src=x onerror=alert(1)>`;

  schema.header.businessName.fa = scriptPayload;
  schema.header.tagline.fa = attrPayload;
  schema.hero.headline.fa = scriptPayload;
  schema.clinic.doctors[0].name.fa = attrPayload;

  const html = site.compileUniversalSiteHtml(schema);

  check('no raw </script> breakout from data', !html.includes('</script><script>alert'));
  check('no raw onerror attribute from data', !html.includes('<img src=x onerror'));
  check('payload is HTML-escaped in markup', html.includes('&lt;script&gt;'));
  check('self-contained: no Tailwind CDN', !html.includes('cdn.tailwindcss.com'));
  check('self-contained: no Alpine CDN', !html.includes('cdn.jsdelivr.net'));
  check('no schema JSON inlined into the page', !html.includes('application/json'));
  check('page declares layout + language', html.includes('data-layout="aurora"') && html.includes('data-lang="fa"'));
  check('trilingual spans rendered', html.includes('i18n-fa') && html.includes('i18n-ps') && html.includes('i18n-en'));
  check('language switcher present', html.includes('data-setlang="fa"') && html.includes('data-setlang="en"'));
  check('multi-page nav rendered in header', html.includes('site-nav') && html.includes('href="#page-about"'));
  check('custom page section rendered with content', html.includes('id="page-about"') && html.includes('site-page'));

  // ------------------------------------------------------------ storefront page
  const blueprint = await site.generateStorefrontBlueprint({
    tenantId: TENANT_A,
    subdomainSlug: 'saffron-house',
    prompt: 'saffron and dried fruit',
  });

  blueprint.storeName.fa = scriptPayload;
  blueprint.tagline.fa = attrPayload;
  blueprint.products[0].title_fa = `<img src=x onerror=alert(1)>`;
  blueprint.products[0].image_url = `javascript:alert(1)`;
  blueprint.trustBadges.fa = [`<script>alert(2)</script>`];
  blueprint.hesabPayMerchantId = `"><script>alert(3)</script>`;

  const store = site.compileStorefrontHtml(blueprint);

  check('storefront title escaped server-side', !store.includes('<title></script>'));
  check('blueprint JSON cannot close its script tag', !store.includes('</script><script>alert(1)'));
  check('client renderer escapes values', store.includes('function esc('));
  check('image URLs go through safeUrl', store.includes('esc(safeUrl(p.image_url))'));
  check('no inline onclick carrying a product id', !store.includes(`onclick="addToCart(`));
  check('product buttons use data attributes + delegation', store.includes('data-add=') && store.includes(`closest('[data-add]')`));
  check('trust badges escaped at render', store.includes('esc(b)'));
  check('hesabpay id escaped server-side', !store.includes('"><script>alert(3)'));

  // ------------------------------------------------------------- slug ownership
  const { db } = await freshDatabase();
  bindDatabaseToPglite(database, db);

  await db.exec(`
    INSERT INTO tenants (id, business_name, subdomain) VALUES
      ('${TENANT_A}', 'A Co', 'a-co'),
      ('${TENANT_B}', 'B Co', 'b-co')
  `);

  await site.claimSlug(TENANT_A, 'saffron-house', ROOT_DOMAIN);
  const row = await db.query(
    `SELECT tenant_id FROM domains WHERE domain_name = $1`,
    [`saffron-house.${ROOT_DOMAIN}`]
  );
  check('first claim registers the subdomain', row.rows[0]?.tenant_id === TENANT_A);

  let taken = null;
  try {
    await site.claimSlug(TENANT_B, 'saffron-house', ROOT_DOMAIN);
  } catch (error) {
    taken = error;
  }
  check('another tenant cannot claim the same slug', taken?.code === 'SUBDOMAIN_TAKEN', taken?.message?.slice(0, 60));

  await site.claimSlug(TENANT_A, 'saffron-house', ROOT_DOMAIN);
  check('owner re-claiming its own slug is idempotent', true);

  const count = await db.query(
    `SELECT count(*)::int AS n FROM domains WHERE domain_name = $1`,
    [`saffron-house.${ROOT_DOMAIN}`]
  );
  check('exactly one domain row exists', count.rows[0].n === 1, `rows=${count.rows[0].n}`);

  // ------------------------------------------------------ LLM schema sanitization
  const baseline = site.createSectorBlueprint('clinic', 'xss-clinic', '', undefined);

  const nullSafe = site.sanitizeSiteSchema(null, baseline);
  check('sanitize: null input returns baseline', nullSafe.header.businessName.fa === baseline.header.businessName.fa);

  const malformed = site.sanitizeSiteSchema(
    { header: { businessName: 'Plain String Co' }, theme: 'hotpink', hero: null, whatsappCta: {} },
    baseline
  );
  check('sanitize: string businessName coerced to all locales',
    malformed.header.businessName.fa === 'Plain String Co' && malformed.header.businessName.ps === 'Plain String Co' && malformed.header.businessName.en === 'Plain String Co');
  check('sanitize: invalid theme rejected', malformed.theme === baseline.theme);
  check('sanitize: invalid layout rejected', malformed.layout === baseline.layout);
  check('sanitize: missing hero falls back to baseline', malformed.hero.headline.fa === baseline.hero.headline.fa);
  check('sanitize: clinic module preserved from baseline', Array.isArray(malformed.clinic?.doctors) && malformed.clinic.doctors.length >= 2);

  const partial = site.sanitizeSiteSchema(
    { header: { businessName: { fa: 'کابل', ps: 'کابل', en: 'Kabul' } }, layout: 'editorial' },
    baseline
  );
  check('sanitize: valid localized override applied', partial.header.businessName.en === 'Kabul' && partial.header.businessName.fa === 'کابل');
  check('sanitize: valid layout override applied', partial.layout === 'editorial');

  // LLM sector content adoption
  const adopted = site.sanitizeSiteSchema(
    {
      header: { businessName: { fa: 'کابل', ps: 'کابل', en: 'Kabul' } },
      retail: { products: [
        { name: 'عسل وحشی', priceAfn: 950 },
        { name: 'زعفران', priceAfn: 5000, inStock: true },
        { name: 'بادام', priceAfn: 800 },
      ] },
    },
    site.createSectorBlueprint('retail', 'xss-clinic', '', undefined)
  );
  check('sanitize: LLM products adopted', adopted.retail.products.length === 3 && adopted.retail.products[0].name.en === 'عسل وحشی');
  const malformedProducts = site.sanitizeSiteSchema(
    { retail: { products: [{ priceAfn: 10 }] } },
    site.createSectorBlueprint('retail', 'x', '', undefined)
  );
  check('sanitize: nameless products fall back to baseline', malformedProducts.retail.products.length >= 1 && malformedProducts.retail.products[0].id.startsWith('prod-'));

  // --------------------------------------------------- end-to-end site overrides + listing
  const gen = await site.generateUniversalSite({
    tenantId: TENANT_A,
    subdomainSlug: 'herat-silk',
    industry: 'retail',
    prompt: 'Herat handmade silk textiles',
    businessName: 'Herat Silk Co.',
    whatsappPhone: '+93799112233',
    hesabPayId: 'HP-HERAT-777',
    publishToS3: false,
    pages: [
      {
        id: 'shipping',
        slug: 'shipping-policy',
        title: { fa: 'ارسال', ps: 'لېږد', en: 'Shipping' },
        content: { fa: 'ارسال به ۳۴ ولایت', ps: 'ټولو ولایتونو ته لېږد', en: 'Nationwide 34 provinces' },
        showInNav: true,
      },
    ],
  });
  check('generateUniversalSite applies businessName, hesabPayId and custom pages',
    gen.compiledHtml.includes('Herat Silk Co.') &&
      gen.compiledHtml.includes('HP-HERAT-777') &&
      gen.compiledHtml.includes('href="#page-shipping-policy"') &&
      gen.compiledHtml.includes('Nationwide 34 provinces')
  );

  const sitesList = await site.listTenantSites(TENANT_A);
  check('listTenantSites returns persisted tenant deployments',
    sitesList.length === 1 && sitesList[0].subdomainSlug === 'herat-silk' && sitesList[0].pages?.[0]?.slug === 'shipping-policy'
  );

  return failures();
}
