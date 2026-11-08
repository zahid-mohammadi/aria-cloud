import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * Executes a callback inside a PostgreSQL transaction scoped to a specific tenant.
 * Uses parameterized `set_config('app.current_tenant_id', $1, true)` so that
 * Row-Level Security (RLS) policies on all tenant tables are strictly enforced
 * for the duration of the transaction and automatically cleared on commit/rollback.
 */
export async function withTenantContext<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!UUID_REGEX.test(tenantId)) {
    throw new Error(`Invalid tenant UUID format: ${tenantId}`);
  }

  // If running in environment without live DATABASE_URL, run fallback or mock safely
  if (!process.env.DATABASE_URL) {
    // Provide a lightweight mock client for in-memory or build-time operations
    const mockClient = {
      query: async () => ({ rows: [], rowCount: 0 }),
      release: () => {},
    } as unknown as PoolClient;
    return fn(mockClient);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Helper to run a single parameterized query within a tenant's RLS context.
 */
export async function queryTenant<R extends QueryResultRow = any>(
  tenantId: string,
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<R>> {
  return withTenantContext(tenantId, (client) => client.query<R>(sql, params));
}

export interface TenantOverview {
  tenantId: string;
  organizationName: string;
  subscriptionTier: 'free' | 'starter_af' | 'pro_studio' | 'business_pro' | 'agency_af' | 'enterprise';
  usdBalanceCents: number;
  afnBalancePul: number;
  aiCreditBalance: number;
  monthlyCreditQuota: number;
  elevenlabsCharsUsedMtd: number;
  bedrockTokensUsedMtd: number;
  imagesGeneratedMtd: number;
}

export interface TenantSiteRow {
  id: string;
  tenant_id: string;
  industry_type: 'clinic' | 'school' | 'logistics' | 'export' | 'retail' | 'services';
  site_schema: Record<string, any>;
  current_version: number;
  s3_path: string;
  custom_domain?: string | null;
  is_live: boolean;
  last_updated_at: string;
}

export interface CustomAppDeploymentRow {
  id: string;
  tenant_id: string;
  app_name: string;
  framework: 'nodejs' | 'python' | 'laravel' | 'docker';
  git_repo_url?: string | null;
  app_runner_service_arn?: string | null;
  custom_domain?: string | null;
  status: 'deploying' | 'running' | 'paused' | 'failed';
  allocated_memory_gb: number;
  allocated_vcpu: number;
  created_at: string;
}

/**
 * Fetches a unified snapshot of the tenant's financial and AI Studio credit wallets.
 */
export async function getTenantOverview(tenantId: string): Promise<TenantOverview | null> {
  return withTenantContext(tenantId, async (client) => {
    // Column names follow migration 001 (`tenants.id`, `business_name`, `plan_tier`).
    // The previous version of this query referenced `tenants.tenant_id`,
    // `organization_name` and `subscription_tier`, which never existed.
    const res = await client.query<{
      tenant_id: string;
      organization_name: string;
      subscription_tier: string;
      usd_balance_cents: string;
      afn_balance_pul: string;
      credit_balance: string;
      monthly_credit_quota: string;
      elevenlabs_chars_used_mtd: string;
      bedrock_tokens_used_mtd: string;
      images_generated_mtd: string;
    }>(
      `SELECT
         t.id                                    AS tenant_id,
         t.business_name                         AS organization_name,
         t.plan_tier                             AS subscription_tier,
         COALESCE(w.usd_balance_cents, 0)        AS usd_balance_cents,
         COALESCE(w.afn_balance_pul, 0)          AS afn_balance_pul,
         COALESCE(a.credit_balance, 0)           AS credit_balance,
         COALESCE(a.monthly_credit_quota, 25000) AS monthly_credit_quota,
         COALESCE(a.elevenlabs_chars_used_mtd, 0) AS elevenlabs_chars_used_mtd,
         COALESCE(a.bedrock_tokens_used_mtd, 0)   AS bedrock_tokens_used_mtd,
         COALESCE(a.images_generated_mtd, 0)      AS images_generated_mtd
       FROM tenants t
       LEFT JOIN wallets w ON w.tenant_id = t.id
       LEFT JOIN ai_credit_wallets a ON a.tenant_id = t.id
       WHERE t.id = $1
       LIMIT 1`,
      [tenantId]
    );

    if (res.rowCount === 0) return null;
    const row = res.rows[0];
    return {
      tenantId: row.tenant_id,
      organizationName: row.organization_name,
      // `tenants.plan_tier` is a free-form VARCHAR; the compile-time union is
      // narrower than the column, so narrow it here rather than in SQL.
      subscriptionTier: row.subscription_tier as TenantOverview['subscriptionTier'],
      usdBalanceCents: Number(row.usd_balance_cents),
      afnBalancePul: Number(row.afn_balance_pul),
      aiCreditBalance: Number(row.credit_balance),
      monthlyCreditQuota: Number(row.monthly_credit_quota),
      elevenlabsCharsUsedMtd: Number(row.elevenlabs_chars_used_mtd),
      bedrockTokensUsedMtd: Number(row.bedrock_tokens_used_mtd),
      imagesGeneratedMtd: Number(row.images_generated_mtd),
    };
  });
}

/**
 * Ensures the tenant has a row in both wallet tables.
 *
 * `wallets` and `ai_credit_wallets` are keyed by tenant_id, so a plain
 * `UPDATE ... WHERE tenant_id = $1` on a tenant that has never been topped up
 * silently affects zero rows. Callers that deduct credits must call this first
 * (or use `INSERT ... ON CONFLICT DO NOTHING` themselves) so that
 * "0 rows updated" always means "insufficient funds" rather than "no wallet".
 *
 * Runs inside the tenant's RLS context, so the WITH CHECK clauses pass.
 */
export async function ensureWalletRows(tenantId: string): Promise<void> {
  await withTenantContext(tenantId, async (client) => {
    await client.query(
      `INSERT INTO wallets (tenant_id) VALUES ($1) ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId]
    );
    await client.query(
      `INSERT INTO ai_credit_wallets (tenant_id) VALUES ($1) ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId]
    );
  });
}
