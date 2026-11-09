import { withTenantContext } from '@aria-cloud/database';
import { provisionStalwartMailbox, resetStalwartMailboxPassword } from '@aria-cloud/domain-provisioner';
import { ApiError } from './errors';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org';

/**
 * The tenant's real domains + mailboxes, read under RLS.
 */
export async function listEmail(tenantId: string) {
  return withTenantContext(tenantId, async (client) => {
    const domains = await client.query(
      `SELECT id, domain_name, is_system_subdomain, ssl_status, dkim_status, auto_renew
         FROM domains WHERE tenant_id = $1
        ORDER BY is_system_subdomain ASC, domain_name ASC`,
      [tenantId]
    );
    const mailboxes = await client.query(
      `SELECT id, domain_id, email_address, quota_mb, used_mb, is_active, created_at
         FROM email_accounts WHERE tenant_id = $1
        ORDER BY created_at DESC`,
      [tenantId]
    );
    const settings = {
      imapHost: `mail.${ROOT_DOMAIN}`,
      smtpHost: `mail.${ROOT_DOMAIN}`,
      jmapUrl: `https://mail.${ROOT_DOMAIN}/jmap`,
    };
    return {
      domains: domains.rows,
      mailboxes: mailboxes.rows.map((m) => ({ ...m, ...settings })),
    };
  });
}

export interface ProvisionMailboxInput {
  domainId: string;
  localPart: string;
  domainName: string;
  password: string;
  quotaMb?: number;
}

export async function provisionMailbox(tenantId: string, input: ProvisionMailboxInput) {
  const cleanLocal = (input.localPart || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (cleanLocal.length < 1) {
    throw new ApiError(400, 'INVALID_LOCAL_PART', 'Mailbox name must contain letters, numbers, dots, hyphens or underscores.');
  }
  if (!input.password || input.password.length < 8) {
    throw new ApiError(400, 'PASSWORD_TOO_SHORT', 'Mailbox password must be at least 8 characters.');
  }

  // Verify the domain belongs to the tenant and use the authoritative name
  // from the database (never trust the client-supplied domainName).
  const owned = await withTenantContext(tenantId, async (client) => {
    const res = await client.query<{ domain_name: string }>(
      `SELECT domain_name FROM domains WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [input.domainId, tenantId]
    );
    return res.rows[0] ?? null;
  });
  if (!owned) {
    throw new ApiError(404, 'DOMAIN_NOT_FOUND', 'Domain not found or not owned by this account.');
  }

  try {
    const result = await provisionStalwartMailbox(
      tenantId,
      input.domainId,
      cleanLocal,
      owned.domain_name,
      input.password,
      Number(input.quotaMb) || 5120
    );
    // Return the password exactly once so the admin can hand it to the user.
    return { ...result, password: input.password };
  } catch (error) {
    throw new ApiError(502, 'MAILBOX_PROVISION_FAILED', (error as Error).message);
  }
}

export async function resetMailboxPassword(tenantId: string, mailboxId: string, newPassword: string) {
  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(400, 'PASSWORD_TOO_SHORT', 'New password must be at least 8 characters.');
  }
  try {
    await resetStalwartMailboxPassword(tenantId, mailboxId, newPassword);
    return { ok: true };
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      throw new ApiError(404, 'MAILBOX_NOT_FOUND', (error as Error).message);
    }
    throw new ApiError(502, 'MAILBOX_RESET_FAILED', (error as Error).message);
  }
}

/**
 * The DNS records a domain needs to send/receive mail. Values are derived
 * from the live mail host; DKIM is issued per-domain by SES, so it is shown
 * as a required step rather than a fixed value.
 */
export function mailDnsGuidance(domainName: string) {
  const d = domainName.toLowerCase();
  return [
    { type: 'MX', host: `${d}.`, value: `10 mail.${ROOT_DOMAIN}.`, purpose: 'Inbound mail delivery' },
    { type: 'TXT', host: `${d}.`, value: `"v=spf1 include:amazonses.com ~all"`, purpose: 'Authorized senders (SPF)' },
    { type: 'TXT', host: `_dmarc.${d}.`, value: `"v=DMARC1; p=quarantine; rua=mailto:postmaster@${d}; pct=100;"`, purpose: 'DMARC policy' },
    { type: 'CNAME', host: `mail._domainkey.${d}.`, value: `mail.${ROOT_DOMAIN}.`, purpose: 'DKIM signature' },
  ];
}
