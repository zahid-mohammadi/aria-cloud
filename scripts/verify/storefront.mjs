/**
 * Storefront safety verification.
 *
 *  - generated copy and product data cannot break out of the page (XSS)
 *  - a merchant cannot publish into a slug another merchant owns
 */
import path from 'node:path';
import { ROOT, freshDatabase, makeChecker } from './helpers.mjs';

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

  // ---------------------------------------------------------------- Alpine page
  const schema = site.createSectorBlueprint('clinic', 'xss-clinic', '', undefined);
  const scriptPayload = `</script><script>alert('xss')</script>`;
  const attrPayload = `Kabul's "best" <img src=x onerror=alert(1)>`;

  schema.header.businessName.fa = scriptPayload;
  schema.header.tagline.fa = attrPayload;
  schema.hero.headline.fa = scriptPayload;
  schema.clinic.doctors[0].name.fa = attrPayload;

  const html = site.compileUniversalSiteHtml(schema);

  check('no raw </script> breakout from data', !html.includes('</script><script>alert'));
  check('schema moved into a JSON data block', html.includes('<script type="application/json" id="aria-schema">'));
  check('Alpine no longer inlines schema in an attribute', html.includes('x-data="ariaSite()"'));
  check('no x-data attribute quoting the schema', !html.includes("x-data='ariaSite("));
  check('payload is escaped inside the JSON block', html.includes('\\u003c/script'));
  check('no raw onerror attribute from data', !html.includes('<img src=x onerror'));
  check('page still contains the app script', html.includes('function ariaSite()'));

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
  database.pool.query = (text, params) => db.query(text, params);
  database.pool.connect = async () => ({
    query: (text, params) => db.query(text, params),
    release: () => {},
  });

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

  return failures();
}
