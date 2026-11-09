import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { pool } from '@aria-cloud/database';

export const runtime = 'nodejs';

/**
 * Platform-wide overview. Reads across tenants, so it relies on the database
 * connection running as a role that bypasses RLS (the local `postgres`
 * superuser, or a dedicated BYPASSRLS admin role on managed Postgres).
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const [tenants, users, credits, deployments, audit, generations] = await Promise.all([
      pool.query(`SELECT count(*)::int AS n FROM tenants`),
      pool.query(`SELECT count(*)::int AS n FROM users`),
      pool.query(`SELECT COALESCE(SUM(credit_balance), 0)::bigint AS n FROM ai_credit_wallets`),
      pool.query(`SELECT count(*)::int AS n FROM custom_app_deployments`),
      pool.query(
        `SELECT action, actor_email, target_tenant_id, created_at
           FROM admin_audit_log ORDER BY created_at DESC LIMIT 12`
      ),
      pool.query(
        `SELECT tenant_id, modality, model_id, units_consumed, credits_deducted, created_at
           FROM ai_generation_logs ORDER BY created_at DESC LIMIT 12`
      ),
    ]);

    return NextResponse.json({
      counts: {
        tenants: tenants.rows[0].n,
        users: users.rows[0].n,
        deployments: deployments.rows[0].n,
        totalAiCredits: Number(credits.rows[0].n),
      },
      recentAudit: audit.rows,
      recentGenerations: generations.rows,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
