/**
 * Aria Cloud Services (ariacloudservices.org)
 * Module #2: Automated Domain, Wildcard Subdomain (*.ariacloudservices.org),
 * Custom Route 53 / ACM / SES Provisioner & Stalwart Mail JMAP/IMAP Provisioning Service
 *
 * Regions:
 * - Primary Control Plane & SES Outbound: me-central-1 (UAE)
 * - CloudFront ACM Certificates: us-east-1 (N. Virginia)
 */

import crypto from 'crypto';
import {
  Route53Client,
  CreateHostedZoneCommand,
  ChangeResourceRecordSetsCommand,
  RRType,
} from '@aws-sdk/client-route-53';
import {
  ACMClient,
  RequestCertificateCommand,
  DescribeCertificateCommand,
} from '@aws-sdk/client-acm';
import {
  SESv2Client,
  CreateEmailIdentityCommand,
  PutEmailIdentityMailFromAttributesCommand,
} from '@aws-sdk/client-sesv2';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { withTenantContext } from '@aria-cloud/database';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org';
const PRIMARY_REGION = process.env.SES_REGION || 'me-central-1';
const MERCHANT_SITES_BUCKET =
  process.env.MERCHANT_SITES_BUCKET || 'ariacloud-merchant-sites-production';
const STALWART_ADMIN_URL =
  process.env.STALWART_ADMIN_URL || `https://mail.${ROOT_DOMAIN}`;
const STALWART_ADMIN_TOKEN = process.env.STALWART_ADMIN_TOKEN || '';

const r53 = new Route53Client({ region: PRIMARY_REGION });
const acmUsEast1 = new ACMClient({ region: 'us-east-1' }); // Required for CloudFront custom SSL
const ses = new SESv2Client({ region: PRIMARY_REGION });
const s3 = new S3Client({ region: PRIMARY_REGION });

const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'api',
  'mail',
  'cdn',
  'bounce',
  'admin',
  'support',
  'status',
  'billing',
  'auth',
]);

export interface SubdomainProvisionResult {
  domainId: string;
  fqdn: string;
  s3Prefix: string;
  liveUrl: string;
  status: 'active';
}

export interface CustomDomainProvisionResult {
  domainId: string;
  domainName: string;
  hostedZoneId: string;
  nameServers: string[];
  acmCertificateArn: string;
  dkimTokens: string[];
  status: 'pending_ns_delegation';
}

export interface MailboxProvisionResult {
  mailboxId: string;
  emailAddress: string;
  imapHost: string;
  smtpHost: string;
  jmapUrl: string;
  quotaMb: number;
}

/**
 * 1. Instant Free Merchant Subdomain Provisioning (<store>.ariacloudservices.org)
 * Uses the wildcard ACM cert and CloudFront Function (`ariacloud-merchant-subdomain-router`)
 * to serve `s3://ariacloud-merchant-sites-production/tenants/<slug>/index.html` immediately.
 */
export async function provisionMerchantSubdomain(
  tenantId: string,
  rawSubdomainSlug: string,
  storeTitle: string
): Promise<SubdomainProvisionResult> {
  const slug = rawSubdomainSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');

  if (slug.length < 3 || slug.length > 48) {
    throw new Error('Subdomain slug must be between 3 and 48 alphanumeric/hyphen characters.');
  }

  if (RESERVED_SUBDOMAINS.has(slug)) {
    throw new Error(`Subdomain "${slug}.${ROOT_DOMAIN}" is reserved by AriaCloud system infrastructure.`);
  }

  const fqdn = `${slug}.${ROOT_DOMAIN}`;
  const s3Prefix = `tenants/${slug}`;

  // 1. Register subdomain in PostgreSQL under strict tenant RLS context
  const domainRecord = await withTenantContext(tenantId, async (client) => {
    const existing = await client.query(
      `SELECT id FROM domains WHERE domain_name = $1 LIMIT 1`,
      [fqdn]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      throw new Error(`Subdomain ${fqdn} is already registered.`);
    }

    const insertRes = await client.query<{ id: string }>(
      `INSERT INTO domains (
        tenant_id,
        domain_name,
        is_system_subdomain,
        ssl_status,
        dkim_status,
        auto_renew
      ) VALUES ($1, $2, true, 'ISSUED', 'ACTIVE', true)
      RETURNING id`,
      [tenantId, fqdn]
    );
    return insertRes.rows[0];
  });

  // 2. Upload initial multilingual RTL/LTR storefront landing page to S3
  const defaultHtml = buildInitialStorefrontHtml(storeTitle, fqdn);
  await s3.send(
    new PutObjectCommand({
      Bucket: MERCHANT_SITES_BUCKET,
      Key: `${s3Prefix}/index.html`,
      Body: defaultHtml,
      ContentType: 'text/html; charset=utf-8',
      CacheControl: 'public, max-age=60, s-maxage=300',
    })
  );

  return {
    domainId: domainRecord.id,
    fqdn,
    s3Prefix,
    liveUrl: `https://${fqdn}`,
    status: 'active',
  };
}

/**
 * 2. Custom Domain Provisioning (e.g., heratsaffron.af or kabultech.com)
 * Automates Route 53 Hosted Zone creation, ACM certificate in us-east-1 (for CloudFront),
 * SES v2 Domain Identity in me-central-1 with 2048-bit Easy-DKIM, custom MAIL FROM,
 * SPF, and DMARC records.
 */
export async function provisionCustomDomain(
  tenantId: string,
  rawDomainName: string,
  stalwartMailIp: string
): Promise<CustomDomainProvisionResult> {
  const domainName = rawDomainName.trim().toLowerCase();

  // 1. Create Route 53 Public Hosted Zone
  const hzResponse = await r53.send(
    new CreateHostedZoneCommand({
      Name: domainName,
      CallerReference: `${tenantId}-${Date.now()}`,
      HostedZoneConfig: {
        Comment: `AriaCloud Managed Zone for tenant ${tenantId}`,
        PrivateZone: false,
      },
    })
  );

  const hostedZoneId = hzResponse.HostedZone?.Id?.replace('/hostedzone/', '') || '';
  const nameServers = hzResponse.DelegationSet?.NameServers || [];

  // 2. Request Wildcard + Apex ACM Certificate in us-east-1 (Required for CloudFront)
  const certReq = await acmUsEast1.send(
    new RequestCertificateCommand({
      DomainName: domainName,
      SubjectAlternativeNames: [`*.${domainName}`],
      ValidationMethod: 'DNS',
      IdempotencyToken: crypto
        .createHash('sha256')
        .update(`${tenantId}:${domainName}`)
        .digest('hex')
        .slice(0, 32),
    })
  );
  const acmCertificateArn = certReq.CertificateArn || '';

  // 3. Create SES v2 Email Identity & Easy-DKIM in me-central-1
  const sesResp = await ses.send(
    new CreateEmailIdentityCommand({
      EmailIdentity: domainName,
      DkimSigningAttributes: {
        NextSigningKeyLength: 'RSA_2048_BIT',
      },
    })
  );
  const dkimTokens = sesResp.DkimAttributes?.Tokens || [];

  // Configure custom MAIL FROM subdomain (bounce.<domain>) for SPF alignment
  await ses.send(
    new PutEmailIdentityMailFromAttributesCommand({
      EmailIdentity: domainName,
      MailFromDomain: `bounce.${domainName}`,
      BehaviorOnMxFailure: 'USE_DEFAULT_VALUE',
    })
  );

  // 4. Poll ACM briefly for DNS validation CNAMEs
  let acmValidationRecord: { Name?: string; Value?: string } | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const desc = await acmUsEast1.send(
      new DescribeCertificateCommand({ CertificateArn: acmCertificateArn })
    );
    const opt = desc.Certificate?.DomainValidationOptions?.[0]?.ResourceRecord;
    if (opt?.Name && opt?.Value) {
      acmValidationRecord = { Name: opt.Name, Value: opt.Value };
      break;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  // 5. Provision DNS Records in Route 53 (SPF, DMARC, Custom MAIL FROM, DKIM, and ACM CNAME)
  const changes = [
    // Inbound MX -> Stalwart Mail Server
    {
      Action: 'UPSERT' as const,
      ResourceRecordSet: {
        Name: domainName,
        Type: RRType.MX,
        TTL: 300,
        ResourceRecords: [{ Value: `10 mail.${ROOT_DOMAIN}.` }],
      },
    },
    // SPF Record authorizing Amazon SES + Stalwart Mail IP
    {
      Action: 'UPSERT' as const,
      ResourceRecordSet: {
        Name: domainName,
        Type: RRType.TXT,
        TTL: 300,
        ResourceRecords: [
          { Value: `"v=spf1 include:amazonses.com ip4:${stalwartMailIp} ~all"` },
        ],
      },
    },
    // DMARC Quarantine Policy
    {
      Action: 'UPSERT' as const,
      ResourceRecordSet: {
        Name: `_dmarc.${domainName}`,
        Type: RRType.TXT,
        TTL: 300,
        ResourceRecords: [
          {
            Value: `"v=DMARC1; p=quarantine; rua=mailto:postmaster@${ROOT_DOMAIN}; pct=100;"`,
          },
        ],
      },
    },
    // Custom MAIL FROM MX + SPF
    {
      Action: 'UPSERT' as const,
      ResourceRecordSet: {
        Name: `bounce.${domainName}`,
        Type: RRType.MX,
        TTL: 300,
        ResourceRecords: [
          { Value: `10 feedback-smtp.${PRIMARY_REGION}.amazonses.com.` },
        ],
      },
    },
    {
      Action: 'UPSERT' as const,
      ResourceRecordSet: {
        Name: `bounce.${domainName}`,
        Type: RRType.TXT,
        TTL: 300,
        ResourceRecords: [{ Value: '"v=spf1 include:amazonses.com ~all"' }],
      },
    },
    // 3x SES Easy-DKIM CNAME records
    ...dkimTokens.map((token) => ({
      Action: 'UPSERT' as const,
      ResourceRecordSet: {
        Name: `${token}._domainkey.${domainName}`,
        Type: RRType.CNAME,
        TTL: 300,
        ResourceRecords: [{ Value: `${token}.dkim.amazonses.com.` }],
      },
    })),
  ];

  if (acmValidationRecord?.Name && acmValidationRecord?.Value) {
    changes.push({
      Action: 'UPSERT' as const,
      ResourceRecordSet: {
        Name: acmValidationRecord.Name,
        Type: RRType.CNAME,
        TTL: 60,
        ResourceRecords: [{ Value: acmValidationRecord.Value }],
      },
    });
  }

  await r53.send(
    new ChangeResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
      ChangeBatch: {
        Comment: 'AriaCloud Automated ACM SSL + SES DKIM/SPF/DMARC Provisioning',
        Changes: changes,
      },
    })
  );

  // 6. Persist Domain in PostgreSQL under Tenant RLS
  const domainRow = await withTenantContext(tenantId, async (client) => {
    const res = await client.query<{ id: string }>(
      `INSERT INTO domains (
        tenant_id,
        domain_name,
        is_system_subdomain,
        route53_zone_id,
        acm_cert_arn,
        ssl_status,
        dkim_status,
        auto_renew
      ) VALUES ($1, $2, false, $3, $4, 'PENDING_VALIDATION', 'PENDING', true)
      RETURNING id`,
      [tenantId, domainName, hostedZoneId, acmCertificateArn]
    );
    return res.rows[0];
  });

  return {
    domainId: domainRow.id,
    domainName,
    hostedZoneId,
    nameServers,
    acmCertificateArn,
    dkimTokens,
    status: 'pending_ns_delegation',
  };
}

/**
 * 3. Stalwart Mail Server JMAP/IMAP/SMTP Mailbox Provisioner
 * Creates a mailbox principal on `mail.ariacloudservices.org` and stores metadata under RLS.
 */
export async function provisionStalwartMailbox(
  tenantId: string,
  domainId: string,
  localPart: string,
  domainName: string,
  plainPassword: string,
  quotaMb = 5120
): Promise<MailboxProvisionResult> {
  const cleanLocal = localPart.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const emailAddress = `${cleanLocal}@${domainName.toLowerCase()}`;

  // Generate salted SHA-512 password hash for Stalwart Directory
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = `$6$${salt}$${crypto
    .pbkdf2Sync(plainPassword, salt, 100000, 64, 'sha512')
    .toString('base64')}`;

  if (STALWART_ADMIN_TOKEN) {
    const response = await fetch(`${STALWART_ADMIN_URL}/api/principal`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STALWART_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'individual',
        name: emailAddress,
        secrets: [passwordHash],
        emails: [emailAddress],
        quota: quotaMb * 1024 * 1024,
        enabledPermissions: ['authenticate', 'imap-authenticate', 'jmap-authenticate', 'smtp-authenticate'],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Stalwart Mail API error (${response.status}): ${errBody}`);
    }
  }

  const mailboxRow = await withTenantContext(tenantId, async (client) => {
    const res = await client.query<{ id: string }>(
      `INSERT INTO email_accounts (
        tenant_id,
        domain_id,
        email_address,
        password_hash,
        quota_mb,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id`,
      [tenantId, domainId, emailAddress, passwordHash, quotaMb]
    );
    return res.rows[0];
  });

  return {
    mailboxId: mailboxRow.id,
    emailAddress,
    imapHost: `mail.${ROOT_DOMAIN}`,
    smtpHost: `mail.${ROOT_DOMAIN}`,
    jmapUrl: `https://mail.${ROOT_DOMAIN}/jmap`,
    quotaMb,
  };
}

function buildInitialStorefrontHtml(storeTitle: string, fqdn: string): string {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${storeTitle} — Powered by AriaCloud</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #080c14; color: #f8fafc; display: flex; min-height: 100vh; align-items: center; justify-content: center; text-align: center; padding: 24px; }
    .card { max-width: 560px; background: #111827; border: 1px solid #1e293b; border-radius: 16px; padding: 36px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); padding: 4px 12px; border-radius: 999px; font-size: 12px; margin-bottom: 16px; }
    h1 { margin: 0 0 12px; font-size: 28px; }
    p { color: #94a3b8; line-height: 1.6; }
    .domain { font-family: monospace; color: #38bdf8; background: #0f172a; padding: 6px 12px; border-radius: 8px; display: inline-block; margin-top: 12px; direction: ltr; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Active on AriaCloud Edge</span>
    <h1>${storeTitle}</h1>
    <p>این فروشگاه آنلاین توسط پلتفرم ابری آریا (AriaCloud) راه‌اندازی شده است.</p>
    <div class="domain">https://${fqdn}</div>
  </div>
</body>
</html>`;
}
