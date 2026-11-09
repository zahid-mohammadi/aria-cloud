import { generateUniversalSite, type IndustryType } from '@aria-cloud/site-builder';
import { ApiError } from './errors';

export interface StorefrontInput {
  subdomainSlug?: string;
  prompt?: string;
  industry?: IndustryType;
  layout?: 'aurora' | 'minimal' | 'editorial';
  theme?: 'emerald' | 'lapis' | 'saffron' | 'slate' | 'teal' | 'crimson';
  publishToS3?: boolean;
}

/**
 * Generates a site through the unified multi-sector engine (the same one that
 * produces clinics, schools, exporters and shops), with an optional explicit
 * layout/theme choice.
 */
export async function buildStorefront(tenantId: string, input: StorefrontInput): Promise<unknown> {
  try {
    const result = await generateUniversalSite({
      tenantId,
      subdomainSlug: input.subdomainSlug || 'my-business',
      industry: input.industry || 'retail',
      prompt: input.prompt || 'فروشگاه آنلاین محصولات افغانی',
      layout: input.layout,
      theme: input.theme,
      publishToS3: Boolean(input.publishToS3),
    });

    return {
      ok: true,
      siteId: result.siteId,
      industry: result.industry,
      fqdn: `${result.subdomainSlug}.ariacloudservices.org`,
      liveUrl: result.liveUrl,
      s3Path: result.s3Path,
      layout: result.schema.layout,
      theme: result.schema.theme,
      published: Boolean(input.publishToS3),
      previewHtml: result.compiledHtml,
    };
  } catch (error) {
    if (error && typeof error === 'object' && (error as { code?: string }).code === 'SUBDOMAIN_TAKEN') {
      throw new ApiError(409, 'SUBDOMAIN_TAKEN', (error as Error).message);
    }
    throw error;
  }
}
