import { buildAndPublishStorefront, StorefrontTheme } from '@aria-cloud/site-builder';
import { ApiError } from './errors';

export interface StorefrontInput {
  subdomainSlug?: string;
  prompt?: string;
  primaryLocale?: 'fa' | 'ps_AF' | 'en';
  theme?: StorefrontTheme;
  whatsappPhone?: string;
  publishToS3?: boolean;
}

export async function buildStorefront(tenantId: string, input: StorefrontInput): Promise<unknown> {
  try {
    const result = await buildAndPublishStorefront({
      tenantId,
      subdomainSlug: input.subdomainSlug || 'my-business',
      prompt: input.prompt || 'فروشگاه آنلاین محصولات افغانی',
      primaryLocale: input.primaryLocale || 'fa',
      theme: input.theme || 'emerald_bazaar',
      whatsappPhone: input.whatsappPhone || '+93700123456',
      publishToS3: Boolean(input.publishToS3),
    });

    return {
      ok: true,
      deploymentId: result.deploymentId,
      versionNumber: result.versionNumber,
      fqdn: result.fqdn,
      liveUrl: result.liveUrl,
      s3Prefix: result.s3Prefix,
      published: Boolean(input.publishToS3),
    };
  } catch (error) {
    if (error && typeof error === 'object' && (error as { code?: string }).code === 'SUBDOMAIN_TAKEN') {
      throw new ApiError(409, 'SUBDOMAIN_TAKEN', (error as Error).message);
    }
    throw error;
  }
}
