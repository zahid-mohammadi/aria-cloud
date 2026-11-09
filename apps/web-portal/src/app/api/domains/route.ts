import { NextRequest, NextResponse } from 'next/server';
import {
  provisionCustomDomain,
  provisionMerchantSubdomain,
  provisionStalwartMailbox,
} from '@aria-cloud/domain-provisioner';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json();
    const { action, subdomainSlug, customDomain, mailboxLocalPart, quotaMb } = body;

    if (action === 'subdomain') {
      const result = await provisionMerchantSubdomain(
        session.tenantId,
        subdomainSlug || '',
        body.storeTitle || 'AriaCloud Store'
      );
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === 'custom_domain') {
      const result = await provisionCustomDomain(
        session.tenantId,
        customDomain || '',
        process.env.STALWART_MAIL_IP || '127.0.0.1'
      );
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === 'mailbox') {
      const result = await provisionStalwartMailbox(
        session.tenantId,
        body.domainId,
        mailboxLocalPart || 'info',
        body.domainName || ROOT_DOMAIN,
        body.password || '',
        Number(quotaMb) || 5120
      );
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: 'Unsupported domain action.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Domain provisioning failed.' }, { status: 500 });
  }
}
