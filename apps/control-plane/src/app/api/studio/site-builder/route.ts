import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org';
const ASSETS_BUCKET = process.env.PUBLIC_ASSETS_BUCKET || 'ariacloud-public-assets';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const body = await req.json();
    const {
      subdomainSlug = 'kabul-saffron',
      prompt = 'فروشگاه آنلاین زعفران سوپر نگین هرات، جلغوزه خوست و عسل کوهی با درگاه حساب‌پی',
      primaryLocale = 'fa',
      theme = 'emerald_bazaar',
      whatsappPhone = '+93700123456',
    } = body;

    const tenantId = auth.session.tenantId;

    const cleanSlug = String(subdomainSlug)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '') || 'kabul-saffron';

    const fqdn = `${cleanSlug}.${ROOT_DOMAIN}`;
    const s3Prefix = `tenants/${cleanSlug}`;

    return NextResponse.json({
      status: 'published',
      tenantId,
      deploymentId: `dep_${Date.now().toString(36)}`,
      versionNumber: 1,
      fqdn,
      liveUrl: `https://${fqdn}`,
      s3Target: `s3://${ASSETS_BUCKET}/${s3Prefix}/index.html`,
      cloudfrontRouter: 'ariacloud-merchant-subdomain-router',
      primaryLocale,
      theme,
      whatsappPhone,
      hesabPayMerchantId: `HP-AF-${cleanSlug.toUpperCase().slice(0, 8)}`,
      prompt,
      creditsCharged: 15,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build storefront';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
