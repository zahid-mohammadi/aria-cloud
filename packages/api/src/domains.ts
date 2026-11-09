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
    const result = await provisionCustomDomain(
      tenantId,
      input.customDomain || '',
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
