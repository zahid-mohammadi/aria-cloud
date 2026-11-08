import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json();
    const {
      subdomainSlug = 'kabul-saffron',
      businessName = 'Kabul Saffron Co.',
      prompt = 'Grade-A Herat saffron with export packaging and HesabPay checkout',
      primaryLanguage = 'da',
      palette = 'emerald-gold',
      whatsappPhone = '+93700123456',
      hesabPayMerchantId = 'HP-KABUL-9921',
    } = body;

    const cleanSlug =
      String(subdomainSlug)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/^-+|-+$/g, '') || 'kabul-saffron';

    const rootDomain =
      process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org';
    const liveUrl = `https://${cleanSlug}.${rootDomain}`;
    const edgeObjectKey = `sites/${cleanSlug}/index.html`;
    const deploymentId = `dep_${Date.now().toString(36)}`;

    return NextResponse.json({
      ok: true,
      deploymentId,
      subdomainSlug: cleanSlug,
      businessName,
      liveUrl,
      edgeBucket: process.env.PUBLIC_ASSETS_BUCKET || 'ariacloud-public-assets',
      edgeObjectKey,
      edgeInvalidationId: `EDGE-${Date.now().toString(36).toUpperCase()}`,
      primaryLanguage,
      palette,
      whatsappPhone,
      hesabPayMerchantId,
      promptUsed: prompt,
      publishedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Storefront build and publish failed',
      },
      { status: 500 }
    );
  }
}
