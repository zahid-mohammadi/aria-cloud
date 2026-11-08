import { withTenantContext } from '@aria-cloud/database';

export class SubdomainTakenError extends Error {
  readonly code = 'SUBDOMAIN_TAKEN';

  constructor(fqdn: string) {
    super(`Subdomain ${fqdn} is already in use by another merchant`);
    this.name = 'SubdomainTakenError';
  }
}

/**
 * Claims a merchant subdomain for a tenant, or fails if someone else owns it.
 *
 * `domains.domain_name` is UNIQUE globally, so the INSERT is the atomic
 * claim. If it inserts nothing, either this tenant already owns it or another
 * tenant does — and because `domains` is under FORCE RLS, another tenant's row
 * is invisible to us, which is exactly how we tell the two cases apart.
 *
 * Without this check, publishing keyed off a user-supplied slug let any
 * merchant overwrite another merchant's site in S3.
 */
export async function claimSlug(
  tenantId: string,
  slug: string,
  rootDomain: string
): Promise<string> {
  const fqdn = `${slug}.${rootDomain}`;

  await withTenantContext(tenantId, async (client) => {
    // A single statement that is correct whether or not RLS is in force.
    //   - no conflict      -> insert succeeds, row returned
    //   - same tenant      -> DO UPDATE matches, row returned
    //   - another tenant   -> the WHERE fails (or RLS hides the row),
    //                         nothing returned -> treat as taken
    // Relying on "the row is invisible under RLS" would be wrong: a superuser
    // connection (local Docker, some managed tiers) bypasses RLS and would
    // silently let the claim through.
    const claimed = await client.query(
      `INSERT INTO domains (tenant_id, domain_name, is_system_subdomain, ssl_status, dkim_status)
       VALUES ($1, $2, true, 'ISSUED', 'ACTIVE')
       ON CONFLICT (domain_name) DO UPDATE
         SET updated_at = now()
         WHERE domains.tenant_id = EXCLUDED.tenant_id
       RETURNING id`,
      [tenantId, fqdn]
    );

    if (claimed.rowCount === 0) throw new SubdomainTakenError(fqdn);
  });

  return fqdn;
}
