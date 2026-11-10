import {
  generateUniversalSite,
  listTenantSites,
  type IndustryType,
  type SiteCustomPage,
} from '@aria-cloud/site-builder';
import { ApiError } from './errors';

export interface StorefrontInput {
  subdomainSlug?: string;
  businessName?: string;
  whatsappPhone?: string;
  hesabPayId?: string;
  prompt?: string;
  industry?: IndustryType;
  layout?: 'aurora' | 'minimal' | 'editorial';
  theme?: 'emerald' | 'lapis' | 'saffron' | 'slate' | 'teal' | 'crimson';
  pages?: SiteCustomPage[];
  publishToS3?: boolean;
}

/**
 * Generates a site through the unified multi-sector engine (the same one that
 * produces clinics, schools, exporters and shops), with an optional explicit
 * layout/theme/pages choice.
 */
export async function buildStorefront(tenantId: string, input: StorefrontInput): Promise<unknown> {
  try {
    const publishToS3 = input.publishToS3 ?? true;
    const result = await generateUniversalSite({
      tenantId,
      subdomainSlug: input.subdomainSlug || 'my-business',
      industry: input.industry || 'retail',
      prompt: input.prompt || 'فروشگاه آنلاین محصولات افغانی',
      businessName: input.businessName,
      whatsappPhone: input.whatsappPhone,
      hesabPayId: input.hesabPayId,
      pages: input.pages,
      layout: input.layout,
      theme: input.theme,
      publishToS3,
    });

    return {
      ok: true,
      deploymentId: result.siteId,
      siteId: result.siteId,
      subdomainSlug: result.subdomainSlug,
      industry: result.industry,
      fqdn: `${result.subdomainSlug}.ariacloudservices.org`,
      liveUrl: result.liveUrl,
      edgeObjectKey: result.s3Path.replace(/^s3:\/\/[^/]+\//, ''),
      s3Path: result.s3Path,
      edgeInvalidationId: result.invalidationId,
      currentVersion: result.currentVersion,
      layout: result.schema.layout,
      theme: result.schema.theme,
      pages: result.schema.pages || [],
      published: publishToS3,
      previewHtml: result.compiledHtml,
    };
  } catch (error) {
    if (error && typeof error === 'object' && (error as { code?: string }).code === 'SUBDOMAIN_TAKEN') {
      throw new ApiError(409, 'SUBDOMAIN_TAKEN', (error as Error).message);
    }
    throw error;
  }
}

/** Lists existing deployed storefronts/sites for the current tenant. */
export async function listTenantStorefronts(tenantId: string) {
  return listTenantSites(tenantId);
}
