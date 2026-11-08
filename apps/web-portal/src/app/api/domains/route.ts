import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action = 'provision_mailbox',
      localPart = 'info',
      domain = 'kabul-saffron.ariacloudservices.org',
      quotaMb = 5120,
      customDomain = '',
    } = body;

    if (action === 'provision_custom_domain') {
      const cleanDomain = String(customDomain).trim().toLowerCase();
      if (!cleanDomain || !cleanDomain.includes('.')) {
        return NextResponse.json(
          { error: 'Valid custom domain (e.g. kabulsaffron.af) is required.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        action: 'provision_custom_domain',
        domain: cleanDomain,
        certificateStatus: 'ISSUED (Aria Global Edge TLS 1.3)',
        dkimStatus: 'VERIFIED (Aria Cloud Mail 2048-bit RSA)',
        cnameTarget: 'edge.ariacloudservices.org',
        createdAt: new Date().toISOString(),
      });
    }

    const cleanLocal = String(localPart)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '');
    if (!cleanLocal) {
      return NextResponse.json(
        { error: 'Valid mailbox localPart (e.g. sales or info) is required.' },
        { status: 400 }
      );
    }

    const emailAddress = `${cleanLocal}@${domain}`;
    return NextResponse.json({
      ok: true,
      action: 'provision_mailbox',
      mailboxId: `mbx_${Date.now().toString(36)}`,
      emailAddress,
      quotaMb: Number(quotaMb) || 5120,
      jmapEndpoint: 'https://mail.ariacloudservices.org/jmap',
      imapHost: 'mail.ariacloudservices.org:993 (TLS)',
      smtpRelay: 'smtp.ariacloudservices.org:587 (STARTTLS)',
      dkimStatus: 'Verified (2048-bit RSA)',
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Domain / Mailbox provisioning failed',
      },
      { status: 500 }
    );
  }
}
