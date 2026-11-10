/**
 * AriaCloud Universal Site Builder Engine
 * Generates structured multilingual site schemas for ANY Afghan sector
 * and deploys single-file offline PWAs to S3 and CloudFront.
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from '@aws-sdk/client-cloudfront';
import { withTenantContext } from '@aria-cloud/database';
import {
  UniversalSiteSchema,
  IndustryType,
  LocalizedString,
  DoctorProfile,
  DiagnosticTestItem,
  CourseCurriculum,
  FreightRoute,
  ExportCommodity,
  CatalogProduct,
  ServiceOffering,
  SiteCustomPage,
} from './types';
import { compileUniversalSiteHtml } from './compiler';
import { claimSlug } from './ownership';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org';
const PRIMARY_REGION = process.env.SES_REGION || 'me-central-1';
const BEDROCK_REGION = process.env.BEDROCK_REGION || 'us-east-1';
const ASSETS_BUCKET = process.env.MERCHANT_SITES_BUCKET || 'ariacloud-merchant-sites-production';
const CLOUDFRONT_DIST_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID || '';

const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION });
const s3 = new S3Client({ region: PRIMARY_REGION });
const cloudfront = new CloudFrontClient({ region: 'us-east-1' });

export interface GenerateUniversalSiteInput {
  tenantId: string;
  subdomainSlug: string;
  industry: IndustryType;
  prompt: string;
  customDomain?: string;
  publishToS3?: boolean;
  businessName?: string;
  whatsappPhone?: string;
  hesabPayId?: string;
  pages?: SiteCustomPage[];
  /** Override the generated design (defaults to the sector blueprint's). */
  layout?: UniversalSiteSchema['layout'];
  theme?: UniversalSiteSchema['theme'];
}

export interface TenantSiteSummary {
  deploymentId: string;
  industry: IndustryType;
  subdomainSlug: string;
  liveUrl: string;
  edgeObjectKey: string;
  currentVersion: number;
  lastUpdatedAt: string;
  businessName?: LocalizedString;
  pages?: SiteCustomPage[];
}

export interface GenerateUniversalSiteResult {
  siteId: string;
  tenantId: string;
  industry: IndustryType;
  subdomainSlug: string;
  liveUrl: string;
  s3Path: string;
  currentVersion: number;
  schema: UniversalSiteSchema;
  compiledHtml: string;
  invalidationId?: string;
}

/**
 * Generates an end-to-end multi-sector website schema, compiles HTML, and deploys to S3.
 */
export async function generateUniversalSite(
  input: GenerateUniversalSiteInput
): Promise<GenerateUniversalSiteResult> {
  const cleanSlug = input.subdomainSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '') || 'site';

  // Step 1: Generate or derive structured site schema via Aria Core AI (Bedrock Nova Micro / Llama 3.1)
  const schema = await generateSiteSchemaFromPrompt(
    input.industry,
    cleanSlug,
    input.prompt,
    input.customDomain
  );

  // Allow explicit overrides from the Store Builder UI / caller.
  if (input.layout) schema.layout = input.layout;
  if (input.theme) schema.theme = input.theme;
  if (input.businessName?.trim()) {
    const bn = input.businessName.trim();
    schema.header.businessName = { fa: bn, ps: bn, en: bn };
    schema.pwa.name = bn;
    schema.pwa.shortName = bn.slice(0, 18);
  }
  if (input.whatsappPhone?.trim()) {
    const phone = input.whatsappPhone.trim();
    schema.whatsappCta.phoneNumber = phone;
    schema.header.phone = phone;
  }
  if (input.hesabPayId?.trim()) {
    schema.hesabPayMerchantId = input.hesabPayId.trim();
  }
  if (Array.isArray(input.pages)) {
    schema.pages = input.pages
      .filter((p) => p && typeof p.slug === 'string' && p.slug.trim())
      .map((p, idx) => {
        const cleanPageSlug = p.slug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/^-+|-+$/g, '') || `page-${idx + 1}`;
        return {
          id: p.id || cleanPageSlug,
          slug: cleanPageSlug,
          title: coerceLocalized(p.title, { fa: cleanPageSlug, ps: cleanPageSlug, en: cleanPageSlug }),
          content: coerceLocalized(p.content, { fa: '', ps: '', en: '' }),
          showInNav: p.showInNav !== false,
        };
      });
  }

  // Step 2: Claim the subdomain, then compile. The S3 key must match the
  // CloudFront function's /tenants/<subdomain>/... rewrite, otherwise the
  // published site 404s even though the upload succeeded.
  await claimSlug(input.tenantId, cleanSlug, ROOT_DOMAIN);

  const compiledHtml = compileUniversalSiteHtml(schema);

  // Step 3: Deploy compiled bundle to S3 and issue CloudFront cache invalidation
  const s3Key = `tenants/${cleanSlug}/index.html`;
  const s3Path = `s3://${ASSETS_BUCKET}/${s3Key}`;
  let invalidationId: string | undefined;

  if (input.publishToS3 !== false && process.env.AWS_ACCESS_KEY_ID) {
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: ASSETS_BUCKET,
          Key: s3Key,
          Body: Buffer.from(compiledHtml, 'utf-8'),
          ContentType: 'text/html; charset=utf-8',
          CacheControl: 'public, max-age=60, s-maxage=3600',
        })
      );

      if (CLOUDFRONT_DIST_ID) {
        const invRes = await cloudfront.send(
          new CreateInvalidationCommand({
            DistributionId: CLOUDFRONT_DIST_ID,
            InvalidationBatch: {
              CallerReference: `site-gen-${Date.now()}`,
              Paths: {
                Quantity: 1,
                Items: [`/tenants/${cleanSlug}/*`],
              },
            },
          })
        );
        invalidationId = invRes.Invalidation?.Id;
      }
    } catch (s3Err) {
      console.warn('S3/CloudFront upload skipped or failed (using local asset fallback):', s3Err);
    }
  }

  // Step 4: Record or update the site schema in `tenant_sites` under strict RLS context
  const liveUrl = schema.customDomain
    ? `https://${schema.customDomain}`
    : `https://${cleanSlug}.${ROOT_DOMAIN}`;

  const saved = await withTenantContext(input.tenantId, async (client) => {
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM tenant_sites
        WHERE tenant_id = $1 AND site_schema->>'subdomainSlug' = $2
        LIMIT 1`,
      [input.tenantId, cleanSlug]
    );

    if (existing.rows[0]?.id) {
      const updated = await client.query<{ id: string; current_version: number }>(
        `UPDATE tenant_sites
            SET industry_type = $1,
                site_schema = $2,
                current_version = current_version + 1,
                s3_path = $3,
                custom_domain = $4,
                is_live = true,
                last_updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING id, current_version`,
        [
          input.industry,
          JSON.stringify(schema),
          s3Path,
          input.customDomain || null,
          existing.rows[0].id,
        ]
      );
      return {
        siteId: updated.rows[0]?.id || existing.rows[0].id,
        currentVersion: Number(updated.rows[0]?.current_version || 1),
      };
    }

    const res = await client.query<{ id: string; current_version: number }>(
      `INSERT INTO tenant_sites (
        tenant_id,
        industry_type,
        site_schema,
        current_version,
        s3_path,
        custom_domain,
        is_live
      ) VALUES ($1, $2, $3, 1, $4, $5, true)
      RETURNING id, current_version`,
      [
        input.tenantId,
        input.industry,
        JSON.stringify(schema),
        s3Path,
        input.customDomain || null,
      ]
    );

    return {
      siteId: res.rows[0]?.id || `site_${Date.now().toString(36)}`,
      currentVersion: Number(res.rows[0]?.current_version || 1),
    };
  });

  return {
    siteId: saved.siteId,
    tenantId: input.tenantId,
    industry: input.industry,
    subdomainSlug: cleanSlug,
    liveUrl,
    s3Path,
    currentVersion: saved.currentVersion,
    schema,
    compiledHtml,
    invalidationId,
  };
}

/**
 * Lists all deployed sites for a tenant directly from PostgreSQL (RLS-enforced).
 */
export async function listTenantSites(tenantId: string): Promise<TenantSiteSummary[]> {
  return withTenantContext(tenantId, async (client) => {
    const res = await client.query<{
      id: string;
      industry_type: IndustryType;
      site_schema: UniversalSiteSchema;
      current_version: number;
      s3_path: string;
      custom_domain: string | null;
      last_updated_at: string;
    }>(
      `SELECT id, industry_type, site_schema, current_version, s3_path, custom_domain, last_updated_at
         FROM tenant_sites
        WHERE tenant_id = $1 AND is_live = true
        ORDER BY last_updated_at DESC`,
      [tenantId]
    );

    return res.rows.map((row) => {
      const slug = row.site_schema?.subdomainSlug || 'site';
      const domain = row.custom_domain || `${slug}.${ROOT_DOMAIN}`;
      const edgeObjectKey = row.s3_path?.replace(/^s3:\/\/[^/]+\//, '') || `tenants/${slug}/index.html`;
      return {
        deploymentId: row.id,
        industry: row.industry_type,
        subdomainSlug: slug,
        liveUrl: `https://${domain}`,
        edgeObjectKey,
        currentVersion: Number(row.current_version || 1),
        lastUpdatedAt: row.last_updated_at,
        businessName: row.site_schema?.header?.businessName,
        pages: row.site_schema?.pages || [],
      };
    });
  });
}

function coerceLocalized(value: unknown, fallback: LocalizedString): LocalizedString {
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return {
      fa: typeof v.fa === 'string' ? v.fa : fallback.fa,
      ps: typeof v.ps === 'string' ? v.ps : fallback.ps,
      en: typeof v.en === 'string' ? v.en : fallback.en,
    };
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return { fa: value, ps: value, en: value };
  }
  return fallback;
}

function coerceString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function coerceNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function coerceList(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

function coerceStringArray(raw: unknown, fallback: string[]): string[] {
  return Array.isArray(raw) && raw.length ? raw.map((x) => String(x)).slice(0, 8) : fallback;
}

const EMPTY: LocalizedString = { fa: '', ps: '', en: '' };

function hasName(t: LocalizedString): boolean {
  return Boolean(t.fa.trim() || t.en.trim() || t.ps.trim());
}

function coerceItems<T>(
  raw: unknown,
  fallback: T[],
  fn: (item: unknown, i: number) => T | null,
  min = 1
): T[] {
  const out = coerceList(raw)
    .map((item, i) => fn(item, i))
    .filter((x): x is T => x !== null);
  return out.length >= min ? out : fallback;
}

function coerceDoctor(raw: unknown, i: number): DoctorProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, any>;
  const name = coerceLocalized(d.name, EMPTY);
  if (!hasName(name)) return null;
  return {
    id: coerceString(d.id, `dr-${i + 1}`),
    name,
    specialty: coerceLocalized(d.specialty, name),
    qualifications: coerceLocalized(d.qualifications, EMPTY),
    consultationFeeAfn: coerceNumber(d.consultationFeeAfn, 500),
    availableDays: coerceStringArray(d.availableDays, ['Sat', 'Sun', 'Mon', 'Tue', 'Wed']),
    appointmentSlots: coerceStringArray(d.appointmentSlots, ['09:00 - 12:00', '14:00 - 18:00']),
  };
}

function coerceTest(raw: unknown, i: number): DiagnosticTestItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, any>;
  const name = coerceLocalized(d.name, EMPTY);
  if (!hasName(name)) return null;
  return {
    id: coerceString(d.id, `test-${i + 1}`),
    name,
    category: coerceLocalized(d.category, { fa: 'معاینه عمومی', ps: 'عمومي معاینه', en: 'General' }),
    priceAfn: coerceNumber(d.priceAfn, 300),
    turnaroundHours: coerceNumber(d.turnaroundHours, 24),
  };
}

function coerceCourse(raw: unknown, i: number): CourseCurriculum | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, any>;
  const title = coerceLocalized(d.title, EMPTY);
  if (!hasName(title)) return null;
  return {
    id: coerceString(d.id, `course-${i + 1}`),
    title,
    description: coerceLocalized(d.description, title),
    durationMonths: coerceNumber(d.durationMonths, 6),
    feeAfn: coerceNumber(d.feeAfn, 3000),
    instructorName: coerceLocalized(d.instructorName, title),
    schedule: coerceLocalized(d.schedule, EMPTY),
  };
}

function coerceRoute(raw: unknown, i: number): FreightRoute | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, any>;
  const origin = coerceLocalized(d.origin, EMPTY);
  const destination = coerceLocalized(d.destination, EMPTY);
  if (!hasName(origin)) return null;
  return {
    id: coerceString(d.id, `route-${i + 1}`),
    origin,
    destination,
    transitTimeDays: coerceNumber(d.transitTimeDays, 3),
    ratePerKgAfn: coerceNumber(d.ratePerKgAfn, 50),
    cargoType: coerceLocalized(d.cargoType, EMPTY),
  };
}

function coerceCommodity(raw: unknown, i: number): ExportCommodity | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, any>;
  const title = coerceLocalized(d.title, EMPTY);
  if (!hasName(title)) return null;
  return {
    id: coerceString(d.id, `commodity-${i + 1}`),
    title,
    originProvince: coerceLocalized(d.originProvince, EMPTY),
    gradeSpec: coerceLocalized(d.gradeSpec, EMPTY),
    packagingTypes: coerceLocalized(d.packagingTypes, EMPTY),
    minOrderQuantityKg: coerceNumber(d.minOrderQuantityKg, 1),
  };
}

function coerceProduct(raw: unknown, i: number): CatalogProduct | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, any>;
  const name = coerceLocalized(d.name, coerceLocalized(d.title, EMPTY));
  if (!hasName(name)) return null;
  return {
    id: coerceString(d.id, `prod-${i + 1}`),
    name,
    description: coerceLocalized(d.description, name),
    priceAfn: coerceNumber(d.priceAfn, coerceNumber(d.price, coerceNumber(d.price_afn, 100))),
    priceUsd: coerceNumber(d.priceUsd, 0),
    category: coerceLocalized(d.category, EMPTY),
    inStock: typeof d.inStock === 'boolean' ? d.inStock : true,
  };
}

function coerceOffering(raw: unknown, i: number): ServiceOffering | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, any>;
  const title = coerceLocalized(d.title, EMPTY);
  if (!hasName(title)) return null;
  return {
    id: coerceString(d.id, `svc-${i + 1}`),
    title,
    description: coerceLocalized(d.description, title),
    deliverables: coerceList(d.deliverables).map((x) => coerceLocalized(x, EMPTY)).filter(hasName),
    priceRangeAfn: coerceString(d.priceRangeAfn, ''),
  };
}

const THEMES = ['emerald', 'lapis', 'saffron', 'slate', 'teal', 'crimson'];
const LAYOUTS = ['aurora', 'minimal', 'editorial'];

/**
 * Merges untrusted LLM output over a deterministic baseline so the compiler
 * never receives a malformed schema. Only plain text + localized fields are
 * adopted from the model; structure (hours, PWA, sector modules) stays
 * deterministic, so a bad or missing field degrades to a valid site instead of
 * throwing at compile time.
 */
export function sanitizeSiteSchema(
  parsed: unknown,
  baseline: UniversalSiteSchema
): UniversalSiteSchema {
  if (!parsed || typeof parsed !== 'object') return baseline;
  const p = parsed as Record<string, any>;
  const h = p.header && typeof p.header === 'object' ? p.header : {};
  const hero = p.hero && typeof p.hero === 'object' ? p.hero : {};
  const wa = p.whatsappCta && typeof p.whatsappCta === 'object' ? p.whatsappCta : {};

  const theme = THEMES.includes(p.theme) ? (p.theme as UniversalSiteSchema['theme']) : baseline.theme;
  const layout = LAYOUTS.includes(p.layout) ? (p.layout as UniversalSiteSchema['layout']) : baseline.layout;

  const result: UniversalSiteSchema = {
    ...baseline,
    theme,
    layout,
    header: {
      ...baseline.header,
      businessName: coerceLocalized(h.businessName, baseline.header.businessName),
      tagline: coerceLocalized(h.tagline, baseline.header.tagline),
      phone: coerceString(h.phone, baseline.header.phone),
      whatsappPhone: coerceString(h.whatsappPhone, baseline.header.whatsappPhone),
      email: coerceString(h.email, baseline.header.email),
      address: coerceLocalized(h.address, baseline.header.address),
      city: coerceString(h.city, baseline.header.city),
    },
    hero: {
      ...baseline.hero,
      headline: coerceLocalized(hero.headline, baseline.hero.headline),
      subheadline: coerceLocalized(hero.subheadline, baseline.hero.subheadline),
      primaryCtaText: coerceLocalized(hero.primaryCtaText, baseline.hero.primaryCtaText),
      primaryCtaIntent: coerceString(hero.primaryCtaIntent, baseline.hero.primaryCtaIntent),
    },
    whatsappCta: {
      ...baseline.whatsappCta,
      phoneNumber: coerceString(wa.phoneNumber, baseline.whatsappCta.phoneNumber),
      prefilledMessage: coerceLocalized(wa.prefilledMessage, baseline.whatsappCta.prefilledMessage),
    },
  };

  // Adopt LLM-provided sector content when valid; fall back to the blueprint.
  if (baseline.clinic) {
    const c = p.clinic && typeof p.clinic === 'object' ? p.clinic : {};
    result.clinic = {
      ...baseline.clinic,
      doctors: coerceItems(c.doctors, baseline.clinic.doctors, coerceDoctor, 1),
      diagnosticTests: coerceItems(c.diagnosticTests, baseline.clinic.diagnosticTests, coerceTest, 1),
      emergencyContact: coerceString(c.emergencyContact, baseline.clinic.emergencyContact),
    };
  }
  if (baseline.retail) {
    const r = p.retail && typeof p.retail === 'object' ? p.retail : {};
    result.retail = { products: coerceItems(r.products, baseline.retail.products, coerceProduct, 1) };
  }
  if (baseline.school) {
    const sc = p.school && typeof p.school === 'object' ? p.school : {};
    result.school = {
      ...baseline.school,
      courses: coerceItems(sc.courses, baseline.school.courses, coerceCourse, 1),
      accreditation: coerceLocalized(sc.accreditation, baseline.school.accreditation),
      enrollmentDeadline: coerceString(sc.enrollmentDeadline, baseline.school.enrollmentDeadline ?? ''),
    };
  }
  if (baseline.logistics) {
    const l = p.logistics && typeof p.logistics === 'object' ? p.logistics : {};
    result.logistics = {
      ...baseline.logistics,
      routes: coerceItems(l.routes, baseline.logistics.routes, coerceRoute, 1),
      fleetInfo: coerceLocalized(l.fleetInfo, baseline.logistics.fleetInfo),
      trackingHotline: coerceString(l.trackingHotline, baseline.logistics.trackingHotline),
    };
  }
  if (baseline.export) {
    const e = p.export && typeof p.export === 'object' ? p.export : {};
    result.export = {
      ...baseline.export,
      commodities: coerceItems(e.commodities, baseline.export.commodities, coerceCommodity, 1),
      certifications: coerceStringArray(e.certifications, baseline.export.certifications),
      packagingStandards: coerceLocalized(e.packagingStandards, baseline.export.packagingStandards),
    };
  }
  if (baseline.services) {
    const sv = p.services && typeof p.services === 'object' ? p.services : {};
    result.services = {
      ...baseline.services,
      offerings: coerceItems(sv.offerings, baseline.services.offerings, coerceOffering, 1),
    };
  }

  return result;
}

/**
 * Invokes Bedrock Nova Micro / Llama 3.1 or constructs domain-accurate fallback blueprints.
 */
export async function generateSiteSchemaFromPrompt(
  industry: IndustryType,
  subdomainSlug: string,
  prompt: string,
  customDomain?: string
): Promise<UniversalSiteSchema> {
  // If AWS Bedrock credentials exist, attempt LLM generation
  if (process.env.AWS_ACCESS_KEY_ID && process.env.BEDROCK_REGION) {
    try {
      const systemPrompt = `You are Aria Core AI, the official site generation intelligence of AriaCloud.
Return a STRICT JSON object representing a UniversalSiteSchema for an Afghan business in the '${industry}' sector, based on the user's prompt. Invent a realistic, specific business (real names, real prices in AFN).

Every localized field is an object { "fa": "Dari", "ps": "Pashto", "en": "English" }.

Top-level fields:
- header: { businessName, tagline, phone, whatsappPhone, email, address, city } — businessName, tagline and address are localized.
- hero: { headline, subheadline, primaryCtaText, primaryCtaIntent } — headline, subheadline and primaryCtaText are localized; primaryCtaIntent is one of appointment|quote|enrollment|order|consultation.
- theme: one of emerald|lapis|saffron|slate|teal|crimson.
- whatsappCta: { phoneNumber, prefilledMessage (localized) }.

Sector content — generate 3-6 REAL, specific items under the sector key '${industry}':
- clinic: { doctors: [{ id, name, specialty, qualifications, consultationFeeAfn, availableDays: ["Sat","Sun"], appointmentSlots: ["09:00 - 12:00"] }], diagnosticTests: [{ id, name, category, priceAfn, turnaroundHours }], emergencyContact }
- retail: { products: [{ id, name, description, priceAfn, priceUsd, category, inStock: true }] }
- school: { courses: [{ id, title, description, durationMonths, feeAfn, instructorName, schedule }], accreditation }
- logistics: { routes: [{ id, origin, destination, transitTimeDays, ratePerKgAfn, cargoType }], fleetInfo, trackingHotline }
- export: { commodities: [{ id, title, originProvince, gradeSpec, packagingTypes, minOrderQuantityKg }], certifications: ["..."] }
- services: { offerings: [{ id, title, description, deliverables: ["..."], priceRangeAfn }] }

All names, titles and descriptions must be localized (fa/ps/en). Respond with JSON only, no markdown backticks.`;

      const cmd = new InvokeModelCommand({
        modelId: 'amazon.nova-micro-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: [{ text: `${systemPrompt}\n\nPrompt: ${prompt}` }] },
          ],
          inferenceConfig: { maxTokens: 6000, temperature: 0.4 },
        }),
      });

      const response = await bedrock.send(cmd);
      const text = new TextDecoder().decode(response.body);
      const parsed = JSON.parse(text);
      const rawJson = parsed.output?.message?.content?.[0]?.text || text;
      const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const generated = JSON.parse(jsonMatch[0]);
          const baseline = createSectorBlueprint(industry, subdomainSlug, prompt, customDomain);
          const safe = sanitizeSiteSchema(generated, baseline);
          safe.subdomainSlug = subdomainSlug;
          safe.industry = industry;
          safe.version = 1;
          safe.customDomain = customDomain;
          safe.generatedAt = new Date().toISOString();
          safe.lastUpdatedAt = new Date().toISOString();
          return safe;
        } catch {
          // Malformed JSON schema — fall through to the deterministic blueprint.
        }
      }
    } catch (bedrockErr) {
      console.warn('Bedrock model invocation failed, using Afghan sector template:', bedrockErr);
    }
  }

  // Domain-accurate blueprint generation
  return createSectorBlueprint(industry, subdomainSlug, prompt, customDomain);
}

/**
 * Creates sector-rich trilingual blueprints for clinics, schools, logistics, export, retail, and services.
 */
export function createSectorBlueprint(
  industry: IndustryType,
  subdomainSlug: string,
  prompt: string,
  customDomain?: string
): UniversalSiteSchema {
  const now = new Date().toISOString();

  // Baseline schema
  const baseSchema: UniversalSiteSchema = {
    subdomainSlug,
    industry,
    header: {
      businessName: {
        fa: 'مرکز خدمات تخصصی آریا',
        ps: 'د آریا تخصصي خدمتونو مرکز',
        en: 'Aria Professional Center',
      },
      tagline: {
        fa: 'ارائه باکیفیت‌ترین خدمات در افغانستان با معیارهای بین‌المللی',
        ps: 'په افغانستان کې په نړیوالو معیارونو د لوړ کیفیت خدمتونه',
        en: 'Premier professional services across Afghanistan',
      },
      phone: '+93 20 220 1800',
      whatsappPhone: '+93 70 012 3456',
      email: `info@${subdomainSlug}.${ROOT_DOMAIN}`,
      address: {
        fa: 'کابل، چهارراهی انصاری، شهر نو',
        ps: 'کابل، د انصاري څلورلارې، شهر نو',
        en: 'Ansari Square, Shahr-e-Naw, Kabul, Afghanistan',
      },
      city: 'Kabul',
    },
    hero: {
      headline: {
        fa: 'پیشرو در ارائه خدمات مسلکی و معتبر در کابل',
        ps: 'په کابل کې د مسلکي او باوري خدمتونو مخکښ مرکز',
        en: 'Leading Trusted Professional Services in Kabul',
      },
      subheadline: {
        fa: 'مجهز با کادر مجرب، تجهیزات پیشرفته و سیستم نوبت‌دهی آسان آنلاین از طریق واتساپ.',
        ps: 'په مجربو کادرونو او پرمختللو وسایلو سمبال، د واټساپ له لارې د اسانه وخت نیونې سره.',
        en: 'Equipped with certified Afghan professionals and instant direct WhatsApp booking.',
      },
      primaryCtaText: {
        fa: 'ارتباط مستقیم و رزرو نوبت',
        ps: 'مستقیم اړیکه او وخت نیول',
        en: 'Book Online via WhatsApp',
      },
      primaryCtaIntent: 'consultation',
    },
    operatingHours: {
      regular: {
        days: {
          fa: 'شنبه الی چهارشنبه',
          ps: 'شنبه تر چهارشنبې',
          en: 'Saturday to Wednesday',
        },
        hours: '08:00 AM – 04:00 PM',
      },
      thursday: {
        status: 'half_day',
        hours: '08:00 AM – 01:00 PM',
      },
      friday: {
        status: 'closed',
        note: {
          fa: 'رخصت عمومی (بخش عاجل فعال است)',
          ps: 'عمومي رخصتي (بیړنۍ څانګه فعاله ده)',
          en: 'Public Holiday (Emergency Desk Available)',
        },
      },
    },
    theme: 'emerald',
    layout: 'aurora',
    pages: [
      {
        id: 'about',
        slug: 'about',
        title: { fa: 'درباره ما', ps: 'زموږ په اړه', en: 'About Us' },
        content: {
          fa: 'ما با بیش از یک دهه تجربه، خدمات معیاری و باکیفیت را در سراسر افغانستان ارائه می‌نماییم.',
          ps: 'موږ د یوې لسیزې څخه د ډیرې تجربې سره، په ټول افغانستان کې معیاري او باکیفیته خدمتونه وړاندې کوو.',
          en: 'With over a decade of dedication, we provide trusted, high-standard services across Afghanistan.',
        },
        showInNav: true,
      },
    ],
    whatsappCta: {
      phoneNumber: '+93700123456',
      prefilledMessage: {
        fa: 'سلام، جهت دریافت معلومات و هماهنگی خدمات پیام می‌دهم.',
        ps: 'سلام، د معلوماتو ترلاسه کولو او همغږۍ لپاره پیغام درلیږم.',
        en: 'Hello, I am contacting you regarding your services.',
      },
    },
    pwa: {
      name: 'AriaCloud Enterprise Portal',
      shortName: 'AriaPortal',
      themeColor: '#059669',
      backgroundColor: '#f8fafc',
      startUrl: '/',
      display: 'standalone',
    },
    customDomain,
    generatedAt: now,
    lastUpdatedAt: now,
    version: 1,
  };

  // Sector-Specific Customizations
  if (industry === 'clinic') {
    baseSchema.theme = 'teal';
    baseSchema.pwa.themeColor = '#0d9488';
    baseSchema.header.businessName = {
      fa: 'کلینیک تخصصی و تشخیصیه کابل',
      ps: 'د کابل تخصصي او تشخیصیه کلینیک',
      en: 'Kabul Diagnostic & Specialist Clinic',
    };
    baseSchema.header.tagline = {
      fa: 'مراقبت‌های صحی جامع، معاینات دقیق آزمایشگاهی و داکتران متخصص',
      ps: 'جامع روغتیایي خدمتونه، دقیق لابراتواري معاینات او متخصص ډاکټران',
      en: 'Comprehensive healthcare, precision diagnostic lab & certified doctors',
    };
    baseSchema.hero.headline = {
      fa: 'صحت شما اولویت اول ماست',
      ps: 'ستاسو روغتیا زموږ لومړیتوب دی',
      en: 'Your Health Is Our Utmost Priority',
    };
    baseSchema.hero.subheadline = {
      fa: 'ارائه خدمات عاجل، نوبت‌دهی داکتران فوق تخصص و انجام کلیه تست‌های بیوشیمی و هورمونی.',
      ps: 'بیړني خدمتونه، د متخصصو ډاکټرانو معاینات او ټول بیوشیمي او هورموني ټسټونه.',
      en: 'Emergency medical care, specialist outpatient clinics, and full biochemistry screening.',
    };
    baseSchema.hero.primaryCtaText = {
      fa: 'رزرو نوبت داکتر در واتساپ',
      ps: 'په واټساپ کې د ډاکټر وخت اخیستل',
      en: 'Book Doctor Appointment',
    };
    baseSchema.hero.primaryCtaIntent = 'appointment';

    baseSchema.clinic = {
      emergencyContact: '+93 70 011 2233',
      doctors: [
        {
          id: 'doc-noori',
          name: {
            fa: 'داکتر احسان‌الله نوری',
            ps: 'ډاکټر احسان الله نوري',
            en: 'Dr. Ehsanullah Noori',
          },
          specialty: {
            fa: 'متخصص امراض داخله و قلبی',
            ps: 'د داخله او زړه ناروغیو متخصص',
            en: 'Internal Medicine & Cardiology Specialist',
          },
          qualifications: {
            fa: 'فوق دیپلوم تخصصی، عضو بورد اطبای افغانستان',
            ps: 'د تخصص ډیپلوم، د افغانستان ډاکټرانو بورد غړی',
            en: 'MD, Post-Graduate Cardiology Fellow',
          },
          consultationFeeAfn: 500,
          availableDays: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed'],
          appointmentSlots: ['09:00 - 12:00', '14:00 - 16:30'],
        },
        {
          id: 'doc-karimi',
          name: {
            fa: 'داکتر زهرا کریمی',
            ps: 'ډاکټره زهرا کریمي',
            en: 'Dr. Zahra Karimi',
          },
          specialty: {
            fa: 'متخصص امراض نسایی و ولادی',
            ps: 'د نسایي او ولادي ناروغیو متخصصه',
            en: 'Obstetrics & Gynecology Specialist',
          },
          qualifications: {
            fa: 'بورد تخصصی نسایی ولادی از پوهنتون طبی کابل',
            ps: 'د کابل طبي پوهنتون نسایي متخصصه',
            en: 'MD, OB/GYN Board Certified',
          },
          consultationFeeAfn: 600,
          availableDays: ['Sat', 'Mon', 'Wed'],
          appointmentSlots: ['08:30 - 12:00'],
        },
      ],
      diagnosticTests: [
        {
          id: 'test-cbc',
          name: {
            fa: 'آزمایش مکمل خون (CBC)',
            ps: 'د وینې بشپړ معاینه (CBC)',
            en: 'Complete Blood Count (CBC)',
          },
          category: {
            fa: 'هماتولوژی',
            ps: 'هماتولوژي',
            en: 'Hematology',
          },
          priceAfn: 350,
          turnaroundHours: 2,
        },
        {
          id: 'test-lft',
          name: {
            fa: 'معاینات وظیفوی جگر (LFT)',
            ps: 'د ځیګر دندو معاینات (LFT)',
            en: 'Liver Function Test (LFT)',
          },
          category: {
            fa: 'بیوشیمی',
            ps: 'بیوشیمي',
            en: 'Biochemistry',
          },
          priceAfn: 650,
          turnaroundHours: 4,
        },
        {
          id: 'test-tsh',
          name: {
            fa: 'تست هورمون تیروئید (TSH)',
            ps: 'د تیروئید هورمون معاینه (TSH)',
            en: 'Thyroid Stimulating Hormone (TSH)',
          },
          category: {
            fa: 'هورمون‌شناسی',
            ps: 'هورمون پوهنه',
            en: 'Endocrinology',
          },
          priceAfn: 800,
          turnaroundHours: 6,
        },
      ],
    };
  } else if (industry === 'school') {
    baseSchema.theme = 'lapis';
    baseSchema.pwa.themeColor = '#1d4ed8';
    baseSchema.header.businessName = {
      fa: 'انستیتوت تکنالوژی و زبان‌های بین‌المللی کابل',
      ps: 'د کابل د ټکنالوژۍ او نړیوالو ژبو انسټیټیوټ',
      en: 'Kabul Institute of Technology & Languages',
    };
    baseSchema.school = {
      accreditation: {
        fa: 'ثبت و راجستر وزارت تحصیلات عالی و معارف افغانستان',
        ps: 'د افغانستان د لوړو زده کړو او پوهنې وزارت راجستر شوی',
        en: 'Accredited by the Ministry of Higher Education',
      },
      enrollmentDeadline: '2026-12-01',
      courses: [
        {
          id: 'course-web-dev',
          title: {
            fa: 'دوره جامع مهندسی وب (Full-Stack Web Engineering)',
            ps: 'د وېب بشپړه انجنیري (Full-Stack)',
            en: 'Full-Stack Web Engineering Bootcamp',
          },
          description: {
            fa: 'آموزش تخصصی جاوااسکریپت، ری‌اکت، نود جی‌اس و دیتابیس با پروژه‌های واقعی کاربری.',
            ps: 'د جاواسکریپټ، ری اکټ، نوډ او ډیټابیس مسلکي روزنه په عملي پروژو سره.',
            en: 'Modern JavaScript, Next.js, Node.js, and PostgreSQL for global remote careers.',
          },
          durationMonths: 6,
          feeAfn: 4500,
          instructorName: {
            fa: 'استاد فرید احمدی',
            ps: 'استاد فرید احمدي',
            en: 'Eng. Farid Ahmadi',
          },
          schedule: {
            fa: 'روزهای جفت: ۰۴:۰۰ الی ۰۶:۰۰ شام',
            ps: 'جفتې ورځې: ۴:۰۰ تر ۶:۰۰ مازدیګر',
            en: 'Mon/Wed/Sat 4:00 PM – 6:00 PM',
          },
        },
      ],
    };
  } else if (industry === 'logistics') {
    baseSchema.theme = 'slate';
    baseSchema.pwa.themeColor = '#334155';
    baseSchema.header.businessName = {
      fa: 'شرکت ترانزیت و باربری شاهین افغان',
      ps: 'د شاهین افغان ترانزیت او باربري شرکت',
      en: 'Shaheen Afghan Logistics & Transit Co.',
    };
    baseSchema.logistics = {
      trackingHotline: '+93 79 900 8877',
      fleetInfo: {
        fa: 'بیش از ۶۰ واسطه نقلیه یخچال‌دار و کانتینری برای مسیرهای ولایتی و بین‌المللی',
        ps: 'له ۶۰ ډېر یخچالي او باروړونکي وسایط د ولایتي او نړیوالو لارو لپاره',
        en: 'Over 60 refrigerated and containerized trucks for provincial and regional routes',
      },
      routes: [
        {
          id: 'route-kbl-hrt',
          origin: { fa: 'کابل', ps: 'کابل', en: 'Kabul' },
          destination: { fa: 'هرات', ps: 'هرات', en: 'Herat' },
          transitTimeDays: 2,
          ratePerKgAfn: 15,
          cargoType: { fa: 'اموال تجارتی عمومی', ps: 'عمومي سوداګریز توکي', en: 'General Cargo' },
        },
        {
          id: 'route-kbl-msh',
          origin: { fa: 'کابل', ps: 'کابل', en: 'Kabul' },
          destination: { fa: 'مزارشریف', ps: 'مزارشریف', en: 'Mazar-i-Sharif' },
          transitTimeDays: 1,
          ratePerKgAfn: 12,
          cargoType: { fa: 'مواد اولیه و کالای بسته بندی', ps: 'بسته‌بندي شوي توکي', en: 'Dry Goods' },
        },
      ],
    };
  } else if (industry === 'export') {
    baseSchema.theme = 'saffron';
    baseSchema.pwa.themeColor = '#d97706';
    baseSchema.header.businessName = {
      fa: 'اتحادیه صادرات زعفران و میوه خشک آریا',
      ps: 'د آریا د زعفرانو او وچو میوو د صادراتو ټولنه',
      en: 'Aria Saffron & Dried Fruit Export Syndicate',
    };
    baseSchema.export = {
      certifications: ['ISO 22000 Certified', 'HACCP Standard', 'Afghan Chamber of Commerce (ACCI)'],
      packagingStandards: {
        fa: 'بسته‌بندی صادراتی لوکس فلزی، کارتنی با سیل وکیوم با استاندارد اتحادیه اروپا',
        ps: 'د اروپایي معیارونو سره سم معیاري صادراتي فلزي او کارټني بسته‌بندي',
        en: 'Vacuum-sealed metallic tin & food-grade packaging compliant with EU/GCC standards',
      },
      commodities: [
        {
          id: 'exp-saffron',
          title: {
            fa: 'زعفران سوپر نگین هرات (Super Negin Saffron)',
            ps: 'د هرات سوپر نګین زعفران',
            en: 'Herat Super Negin Grade-A Saffron',
          },
          originProvince: { fa: 'هرات', ps: 'هرات', en: 'Herat' },
          gradeSpec: { fa: 'رنگ‌دهی ۲۶۵+، سورت‌بندی دستی', ps: '۲۶۵+ رنګ ورکول، په لاس سورت شوی', en: 'Crocin 265+, Hand-Selected' },
          packagingTypes: { fa: 'قوطی ۱۰، ۲۵ و ۱۰۰ گرام', ps: '۱۰، ۲۵ او ۱۰۰ ګرامه قوطۍ', en: '10g, 25g, 100g, 1kg Tins' },
          minOrderQuantityKg: 1,
        },
      ],
    };
  } else if (industry === 'retail') {
    baseSchema.theme = 'emerald';
    baseSchema.retail = {
      products: [
        {
          id: 'prod-saffron-10g',
          name: {
            fa: 'زعفران سوپر نگین هرات (۱۰ گرام)',
            ps: 'د هرات سوپر نګین زعفران (۱۰ ګرامه)',
            en: 'Herat Super Negin Saffron (10g Tin)',
          },
          description: {
            fa: 'زعفران درجه یک صادراتی با رنگ و عطر خالص طبیعی',
            ps: 'د لوړ کیفیت خالص صادراتي زعفران',
            en: 'Export-grade saffron with natural crimson threads and intense aroma',
          },
          priceAfn: 1250,
          priceUsd: 17.5,
          category: { fa: 'زعفران صادراتی', ps: 'زعفران', en: 'Saffron' },
          inStock: true,
        },
      ],
    };
  } else {
    baseSchema.theme = 'slate';
    baseSchema.services = {
      offerings: [
        {
          id: 'srv-legal-advisory',
          title: {
            fa: 'مشاوره حقوقی، تجارتی و سرمایه‌گذاری در افغانستان',
            ps: 'په افغانستان کې حقوقي او سوداګریزې مشورې',
            en: 'Commercial & Corporate Legal Advisory',
          },
          description: {
            fa: 'ثبت شرکت‌ها، اخذ جواز، قراردادهای تجارتی و تصفیه مالیاتی با وکلای مجرب.',
            ps: 'د شرکتونو ثبت، د جوازونو اخیستل او سوداګریز قراردادونه.',
            en: 'Company registration, licensing, contracts, and cross-border trade compliance.',
          },
          deliverables: [
            { fa: 'ثبت رسمی در ریاست ثبت مرکزی', ps: 'په مرکزي ثبت کې رسمي راجستر', en: 'Official ACBR Registration' },
            { fa: 'تهیه اساسنامه و قراردادهای محلی', ps: 'د اساسنامې او قراردادونو برابرول', en: 'Bilingual Articles of Association' },
          ],
          priceRangeAfn: '15,000 – 45,000 AFN',
        },
      ],
    };
  }

  return baseSchema;
}
