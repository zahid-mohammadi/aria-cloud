import { ClientBase, Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLE_NAME_REGEX = /^[a-z_][a-z0-9_]{0,62}$/;

/**
 * Runtime database roles (created by migration 009).
 *
 * FORCE ROW LEVEL SECURITY does not apply to superusers or BYPASSRLS roles, so
 * whatever login DATABASE_URL uses, every pooled connection switches to one of
 * these roles before it is handed out. The login user must be a member:
 *   GRANT aria_app_user, aria_platform_admin TO <login_user>;
 */
export const APP_DB_ROLE = process.env.ARIA_DB_APP_ROLE || 'aria_app_user';
export const ADMIN_DB_ROLE = process.env.ARIA_DB_ADMIN_ROLE || 'aria_platform_admin';

/**
 * Switches a connection to `role` and verifies RLS will actually apply to it.
 * Throws (and the pool discards the connection) if the role cannot be assumed
 * or if it is a superuser / BYPASSRLS role.
 */
export async function assumeDatabaseRole(
  client: Pick<ClientBase, 'query'>,
  role: string
): Promise<void> {
  if (!ROLE_NAME_REGEX.test(role)) {
    throw new Error(`Invalid database role name: ${JSON.stringify(role)}`);
  }
  // Identifiers cannot be bound as parameters; the regex above is the guard.
  await client.query(`SET ROLE ${role}`);
  const res = await client.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
    `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`
  );
  const attrs = res.rows[0];
  if (!attrs || attrs.rolsuper || attrs.rolbypassrls) {
    throw new Error(
      `Refusing to use database role "${role}": it is a superuser or has BYPASSRLS, ` +
        'so row-level security would not apply.'
    );
  }
}

const POOL_DEFAULTS = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

/** Merchant/service pool. Runs as APP_DB_ROLE, so tenant RLS is enforced. */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...POOL_DEFAULTS,
  onConnect: (client) => assumeDatabaseRole(client, APP_DB_ROLE),
});

let adminPoolInstance: Pool | null = null;

/**
 * Platform-admin pool, for the control plane only. Runs as ADMIN_DB_ROLE,
 * which reaches across tenants through the explicit `platform_admin_access`
 * policy (not BYPASSRLS). Created lazily so merchant-facing processes never
 * open an admin connection. Callers must have already checked
 * `session.isPlatformAdmin` and should audit what they do with it.
 */
export function getAdminPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured. Refusing to open the admin pool.');
  }
  if (!adminPoolInstance) {
    adminPoolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      ...POOL_DEFAULTS,
      max: 5,
      onConnect: (client) => assumeDatabaseRole(client, ADMIN_DB_ROLE),
    });
  }
  return adminPoolInstance;
}

/** Test hook: lets the verify suite point the admin pool at PGlite. */
export function setAdminPoolForTesting(replacement: Pool | null): void {
  adminPoolInstance = replacement;
}

// --- Rate limiting -----------------------------------------------------------

export interface RateLimitResult {
  allowed: boolean;
  hits: number;
  limit: number;
  retryAfterSeconds: number;
}

export type CanonicalLocale = 'fa' | 'ps' | 'en';

/**
 * Normalizes input language tags ('fa', 'da', 'ps_AF', 'fa-AF', etc.)
 * into standard canonical ISO language codes: 'fa' (Dari/Persian), 'ps' (Pashto), 'en' (English).
 */
export function normalizeLocale(input?: string | null): CanonicalLocale {
  if (!input) return 'fa';
  const clean = input.trim().toLowerCase().replace(/[-_]/g, '');
  if (clean.startsWith('ps') || clean === 'pashto') return 'ps';
  if (clean.startsWith('en') || clean === 'english') return 'en';
  if (
    clean.startsWith('fa') ||
    clean.startsWith('da') ||
    clean === 'farsi' ||
    clean === 'dari' ||
    clean === 'prs'
  ) {
    return 'fa';
  }
  return 'fa';
}

/**
 * Fixed-window rate limit backed by PostgreSQL, so it holds across every
 * process / Lambda instance (unlike an in-memory Map).
 *
 * One atomic upsert per call: the first hit (or the first after the window
 * expires) resets the counter, otherwise it increments. Fails closed: if the
 * database is unreachable the caller gets the error.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (!process.env.DATABASE_URL) {
    if (process.env.ARIA_DEMO_MODE === 'true') {
      return { allowed: true, hits: 0, limit, retryAfterSeconds: 0 };
    }
    throw new Error('DATABASE_URL is not configured. Refusing to evaluate rate limits.');
  }

  const bucketKey = key.slice(0, 255);
  const res = await pool.query<{ hits: number; retry_after: number }>(
    `INSERT INTO rate_limits AS r (bucket_key, window_start, hits)
     VALUES ($1, now(), 1)
     ON CONFLICT (bucket_key) DO UPDATE SET
       hits = CASE WHEN r.window_start <= now() - make_interval(secs => $2::int)
                   THEN 1 ELSE r.hits + 1 END,
       window_start = CASE WHEN r.window_start <= now() - make_interval(secs => $2::int)
                           THEN now() ELSE r.window_start END
     RETURNING hits,
               GREATEST(0, CEIL(EXTRACT(EPOCH FROM
                 (window_start + make_interval(secs => $2::int) - now()))))::int AS retry_after`,
    [bucketKey, Math.max(1, Math.floor(windowSeconds))]
  );

  // Opportunistic cleanup so the table does not grow without bound.
  if (Math.random() < 0.01) {
    pool
      .query(`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`)
      .catch((error) => console.error('[rate-limit] cleanup failed', error));
  }

  const hits = Number(res.rows[0]?.hits ?? 0);
  return {
    allowed: hits <= limit,
    hits,
    limit,
    retryAfterSeconds: Number(res.rows[0]?.retry_after ?? windowSeconds),
  };
}

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

  // Without a database we must NOT silently succeed: a mock client that
  // returns zero rows makes writes disappear and reads look empty, which is
  // indistinguishable from real behaviour. Fail closed unless demo mode is
  // explicitly opted into.
  if (!process.env.DATABASE_URL) {
    if (process.env.ARIA_DEMO_MODE !== 'true') {
      throw new Error(
        'DATABASE_URL is not configured. Refusing to run tenant-scoped queries. ' +
          'Set DATABASE_URL, or set ARIA_DEMO_MODE=true to use the in-memory demo client ' +
          '(all writes are discarded).'
      );
    }

    const mockClient = {
      query: async () => ({ rows: [], rowCount: 0 }),
      release: () => {},
    } as unknown as PoolClient;
    return fn(mockClient);
  }

  // `pool` connections have already run SET ROLE APP_DB_ROLE (see onConnect),
  // so the tenant_isolation_* policies apply to every query below.
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

export type AriaPlanTier =
  | 'free'
  | 'student_af'
  | 'creator_af'
  | 'starter_af'
  | 'pro_studio'
  | 'business_pro'
  | 'agency_af'
  | 'enterprise';

export interface AriaPlanConfig {
  id: AriaPlanTier;
  category: 'consumer' | 'business';
  monthlyPriceAfn: number;
  annualPriceAfn: number;
  monthlyCredits: number;
}

export const ARIA_PLAN_CATALOG: Record<string, AriaPlanConfig> = {
  free: { id: 'free', category: 'consumer', monthlyPriceAfn: 0, annualPriceAfn: 0, monthlyCredits: 1000 },
  student_af: { id: 'student_af', category: 'consumer', monthlyPriceAfn: 120, annualPriceAfn: 1200, monthlyCredits: 8000 },
  creator_af: { id: 'creator_af', category: 'consumer', monthlyPriceAfn: 350, annualPriceAfn: 3500, monthlyCredits: 25000 },
  starter_af: { id: 'starter_af', category: 'business', monthlyPriceAfn: 420, annualPriceAfn: 4200, monthlyCredits: 15000 },
  business_pro: { id: 'business_pro', category: 'business', monthlyPriceAfn: 1100, annualPriceAfn: 11000, monthlyCredits: 45000 },
  agency_af: { id: 'agency_af', category: 'business', monthlyPriceAfn: 2500, annualPriceAfn: 25000, monthlyCredits: 100000 },
};

export function getPlanConfig(tier?: string | null): AriaPlanConfig {
  if (tier && tier in ARIA_PLAN_CATALOG) {
    return ARIA_PLAN_CATALOG[tier];
  }
  return ARIA_PLAN_CATALOG.starter_af;
}

export interface TenantOverview {
  tenantId: string;
  organizationName: string;
  subscriptionTier: AriaPlanTier;
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

// --- Async Job Queue ---------------------------------------------------------

export interface JobRow {
  id: string;
  tenant_id: string;
  job_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  payload: Record<string, any>;
  result?: Record<string, any> | null;
  error_message?: string | null;
  attempts: number;
  max_attempts: number;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

/** Enqueues a background job inside the tenant's RLS context. */
export async function enqueueJob(
  tenantId: string,
  jobType: string,
  payload: Record<string, any>,
  maxAttempts = 3
): Promise<{ id: string }> {
  return withTenantContext(tenantId, async (client) => {
    const res = await client.query<{ id: string }>(
      `INSERT INTO job_queue (tenant_id, job_type, payload, max_attempts)
       VALUES ($1, $2, $3::jsonb, $4)
       RETURNING id`,
      [tenantId, jobType, JSON.stringify(payload), maxAttempts]
    );
    return { id: res.rows[0].id };
  });
}

/**
 * Worker helper: atomically locks and claims the next available pending job
 * (using FOR UPDATE SKIP LOCKED). Runs outside tenant context (as worker/admin)
 * or with appropriate permissions.
 */
export async function claimNextJob(
  workerId: string,
  allowedTypes: string[] = []
): Promise<JobRow | null> {
  const admin = getAdminPool();
  const typeFilter =
    allowedTypes.length > 0
      ? `AND job_type = ANY($2::text[])`
      : '';
  const params: any[] = [workerId];
  if (allowedTypes.length > 0) params.push(allowedTypes);

  // Reap stale jobs stuck in processing for > 10 minutes
  await admin.query(
    `UPDATE job_queue
        SET status = 'pending', locked_at = NULL, locked_by = NULL
      WHERE status = 'processing'
        AND locked_at < now() - interval '10 minutes'
        AND attempts < max_attempts`
  ).catch(() => {});

  const res = await admin.query<JobRow>(
    `UPDATE job_queue
        SET status = 'processing',
            locked_at = now(),
            locked_by = $1,
            attempts = attempts + 1,
            updated_at = now()
      WHERE id = (
        SELECT id FROM job_queue
         WHERE status = 'pending'
           ${typeFilter}
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
      )
      RETURNING id, tenant_id, job_type, status, payload, result, error_message, attempts, max_attempts, created_at, updated_at, completed_at`,
    params
  );
  return res.rows[0] ?? null;
}

/** Marks a claimed job as completed with results. */
export async function completeJob(
  jobId: string,
  result: Record<string, any>
): Promise<void> {
  const admin = getAdminPool();
  await admin.query(
    `UPDATE job_queue
        SET status = 'completed',
            result = $1::jsonb,
            completed_at = now(),
            updated_at = now(),
            locked_at = NULL,
            locked_by = NULL
      WHERE id = $2`,
    [JSON.stringify(result), jobId]
  );
}

/** Marks a claimed job as failed (or re-queues if attempts < max_attempts). */
export async function failJob(
  jobId: string,
  errorMessage: string
): Promise<void> {
  const admin = getAdminPool();
  await admin.query(
    `UPDATE job_queue
        SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
            error_message = $1,
            updated_at = now(),
            locked_at = NULL,
            locked_by = NULL
      WHERE id = $2`,
    [errorMessage, jobId]
  );
}

/** Fetches status of a specific job within tenant context. */
export async function getJobStatus(
  tenantId: string,
  jobId: string
): Promise<JobRow | null> {
  return withTenantContext(tenantId, async (client) => {
    const res = await client.query<JobRow>(
      `SELECT id, tenant_id, job_type, status, payload, result, error_message,
              attempts, max_attempts, created_at, updated_at, completed_at
         FROM job_queue
        WHERE id = $1 AND tenant_id = $2
        LIMIT 1`,
      [jobId, tenantId]
    );
    return res.rows[0] ?? null;
  });
}

/** Lists recent background jobs for a specific tenant within its RLS context. */
export async function listTenantJobs(
  tenantId: string,
  limit = 25
): Promise<JobRow[]> {
  return withTenantContext(tenantId, async (client) => {
    const res = await client.query<JobRow>(
      `SELECT id, tenant_id, job_type, status, payload, result, error_message,
              attempts, max_attempts, created_at, updated_at, completed_at
         FROM job_queue
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [tenantId, Math.min(100, Math.max(1, limit))]
    );
    return res.rows;
  });
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
