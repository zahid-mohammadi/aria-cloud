import { NextRequest, NextResponse } from 'next/server';
import { buildAndPublishStorefront } from '@aria-cloud/site-builder';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json();
    const {
      subdomainSlug = 'my-business',
      prompt = 'فروشگاه آنلاین محصولات افغانی',
      primaryLocale = 'fa',
      theme = 'emerald_bazaar',
      whatsappPhone,
      publishToS3 = false,
    } = body;

    const result = await buildAndPublishStorefront({
      tenantId: session.tenantId,
      subdomainSlug,
      prompt,
      primaryLocale,
      theme,
      whatsappPhone: whatsappPhone || '+93700123456',
      publishToS3: Boolean(publishToS3),
    });

    return NextResponse.json({
      ok: true,
      deploymentId: result.deploymentId,
      versionNumber: result.versionNumber,
      fqdn: result.fqdn,
      liveUrl: result.liveUrl,
      s3Prefix: result.s3Prefix,
      published: Boolean(publishToS3),
    });
  } catch (error: any) {
    const status = error?.code === 'SUBDOMAIN_TAKEN' ? 409 : 500;
    return NextResponse.json({ error: error?.message || 'Failed to build the storefront.' }, { status });
  }
}
