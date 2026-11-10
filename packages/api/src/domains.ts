import { withTenantContext } from '@aria-cloud/database';
import {
  provisionCustomDomain,
  provisionMerchantSubdomain,
  provisionStalwartMailbox,
} from '@aria-cloud/domain-provisioner';
import { ApiError } from './errors';

export interface DomainInput {
  action: 'subdomain' | 'custom_domain' | 'mailbox';
  subdomainSlug?: string;
  storeTitle?: string;
  customDomain?: string;
  domainId?: string;
  mailboxLocalPart?: string;
  domainName?: string;
  password?: string;
  quotaMb?: number;
}

const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

export async function listDomains(tenantId: string) {
  return withTenantContext(tenantId, async (client) => {
    const res = await client.query(
      `SELECT id, domain_name, is_system_subdomain, ssl_status, dkim_status, auto_renew, created_at
         FROM domains
        WHERE tenant_id = $1
        ORDER BY is_system_subdomain ASC, domain_name ASC`,
      [tenantId]
    );
    return res.rows;
  });
}

export async function provisionDomain(tenantId: string, input: DomainInput): Promise<unknown> {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org';

  if (input.action === 'subdomain') {
    const result = await provisionMerchantSubdomain(
      tenantId,
      input.subdomainSlug || '',
      input.storeTitle || 'AriaCloud Store'
    );
    return { ok: true, ...result };
  }

  if (input.action === 'custom_domain') {
    const cleanDomain = (input.customDomain || '').trim().toLowerCase();
    if (!cleanDomain || !DOMAIN_REGEX.test(cleanDomain)) {
      throw new ApiError(400, 'INVALID_DOMAIN', 'Enter a valid domain name (e.g., kabul-saffron.af).');
    }
    const result = await provisionCustomDomain(
      tenantId,
      cleanDomain,
      process.env.STALWART_MAIL_IP || '127.0.0.1'
    );
    return { ok: true, ...result };
  }

  if (input.action === 'mailbox') {
    const result = await provisionStalwartMailbox(
      tenantId,
      input.domainId || '',
      input.mailboxLocalPart || 'info',
      input.domainName || rootDomain,
      input.password || '',
      Number(input.quotaMb) || 5120
    );
    return { ok: true, ...result };
  }

  throw new ApiError(400, 'UNSUPPORTED_ACTION', 'Unsupported domain action.');
}
