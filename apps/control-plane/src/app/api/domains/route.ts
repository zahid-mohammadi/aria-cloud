import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { audit } from '@/lib/audit';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org';
const RESERVED_SLUGS = new Set([
  'www',
  'app',
  'api',
  'mail',
  'cdn',
  'bounce',
  'admin',
  'support',
  'status',
]);

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;
    await audit(req, auth.session, 'api.domains');

    const body = await req.json();
    const { action, subdomainSlug, customDomain, mailboxLocalPart } = body;
    // Admins may act on a specific tenant; otherwise scope to their own.
    const tenantId = (body.tenantId as string | undefined) || auth.session.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing required tenantId header/parameter' },
        { status: 400 }
      );
    }

    if (action === 'provision_subdomain') {
      const slug = String(subdomainSlug || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '');

      if (slug.length < 3 || RESERVED_SLUGS.has(slug)) {
        return NextResponse.json(
          { error: `Subdomain "${slug}.${ROOT_DOMAIN}" is invalid or reserved.` },
          { status: 400 }
        );
      }

      const fqdn = `${slug}.${ROOT_DOMAIN}`;
      return NextResponse.json({
        status: 'active',
        fqdn,
        liveUrl: `https://${fqdn}`,
        s3Target: `s3://${process.env.PUBLIC_ASSETS_BUCKET || 'ariacloud-public-assets'}/tenants/${slug}/index.html`,
        sslStatus: 'ISSUED (Wildcard ACM us-east-1)',
        routedVia: 'CloudFront Function: ariacloud-merchant-subdomain-router',
      });
    }

    if (action === 'provision_custom_domain') {
      const domain = String(customDomain || '').trim().toLowerCase();
      return NextResponse.json({
        status: 'pending_ns_delegation',
        domainName: domain,
        acmRegion: 'us-east-1',
        sesRegion: process.env.SES_REGION || 'me-central-1',
        mailFromDomain: `bounce.${domain}`,
        mxRecord: `10 mail.${ROOT_DOMAIN}.`,
        dmarcPolicy: `v=DMARC1; p=quarantine; rua=mailto:postmaster@${ROOT_DOMAIN}; pct=100;`,
      });
    }

    if (action === 'provision_mailbox') {
      const local = String(mailboxLocalPart || 'info')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '');
      const domain = String(customDomain || ROOT_DOMAIN).trim().toLowerCase();
      return NextResponse.json({
        status: 'active',
        emailAddress: `${local}@${domain}`,
        imapHost: `mail.${ROOT_DOMAIN}`,
        smtpHost: `mail.${ROOT_DOMAIN}`,
        jmapUrl: `https://mail.${ROOT_DOMAIN}/jmap`,
        quotaMb: 5120,
      });
    }

    return NextResponse.json({ error: 'Unsupported domain action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
