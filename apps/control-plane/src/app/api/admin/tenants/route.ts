import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { audit } from '@/lib/audit';
import { getAdminPool } from '@aria-cloud/database';

export const runtime = 'nodejs';

const TENANT_SUMMARY = `
  SELECT t.id, t.business_name, t.subdomain, t.plan_tier, t.account_status,
         t.subscription_end_date, t.created_at,
         t.ofac_screening_status, t.kyc_status,
         (SELECT count(*) FROM users u WHERE u.tenant_id = t.id) AS user_count,
         (SELECT count(*) FROM custom_app_deployments d WHERE d.tenant_id = t.id) AS deployment_count,
         COALESCE(w.afn_balance_pul, 0) AS afn_balance_pul,
         COALESCE(c.credit_balance, 0) AS credit_balance
    FROM tenants t
    LEFT JOIN wallets w ON w.tenant_id = t.id
    LEFT JOIN ai_credit_wallets c ON c.tenant_id = t.id
   ORDER BY t.created_at DESC
`;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const id = req.nextUrl.searchParams.get('id');
  try {
    if (id) return NextResponse.json(await tenantDetail(id));
    const list = await getAdminPool().query(TENANT_SUMMARY);
    return NextResponse.json({ tenants: list.rows });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await req.json();
  const { action, tenantId } = body;

  if (action === 'set_screening') {
    const valid = ['unscreened', 'screening', 'clear', 'flagged_review', 'blocked'];
    if (!tenantId || !valid.includes(body.status)) {
      return NextResponse.json({ error: 'status must be one of ' + valid.join(', ') }, { status: 400 });
    }
    await audit(req, auth.session, 'admin.tenants.set_screening', { tenantId, metadata: { status: body.status } });
    await getAdminPool().query(
      `UPDATE tenants SET ofac_screening_status = $1, ofac_screened_at = now() WHERE id = $2`,
      [body.status, tenantId]
    );
    return NextResponse.json({ ok: true, tenantId, ofacScreeningStatus: body.status });
  }

  if (action === 'set_kyc') {
    const valid = ['unverified', 'pending_review', 'verified', 'rejected'];
    if (!tenantId || !valid.includes(body.status)) {
      return NextResponse.json({ error: 'status must be one of ' + valid.join(', ') }, { status: 400 });
    }
    await audit(req, auth.session, 'admin.tenants.set_kyc', { tenantId, metadata: { status: body.status } });
    await getAdminPool().query(
      `UPDATE tenants
          SET kyc_status = $1,
              kyc_verified_at = CASE WHEN $1 = 'verified' THEN now() ELSE kyc_verified_at END
        WHERE id = $2`,
      [body.status, tenantId]
    );
    return NextResponse.json({ ok: true, tenantId, kycStatus: body.status });
  }

  if (!['suspend', 'activate', 'archive'].includes(action) || !tenantId) {
    return NextResponse.json({ error: 'action must be suspend, activate, archive, set_screening or set_kyc' }, { status: 400 });
  }

  const status = action === 'suspend' ? 'suspended' : action === 'archive' ? 'archived' : 'active';

  // Suspension blocks every session of the tenant (see resolveSession), so an
  // admin suspending their own organization would lock themselves out.
  if (status !== 'active' && tenantId === auth.session.tenantId) {
    return NextResponse.json({ error: 'You cannot suspend or archive your own organization.' }, { status: 400 });
  }

  await audit(req, auth.session, `admin.tenants.${action}`, { tenantId });

  try {
    await getAdminPool().query(`UPDATE tenants SET account_status = $1, updated_at = now() WHERE id = $2`, [status, tenantId]);
    return NextResponse.json({ ok: true, tenantId, status });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function tenantDetail(tenantId: string) {
  const tenant = await getAdminPool().query(
    `SELECT t.id, t.business_name, t.subdomain, t.plan_tier, t.account_status,
            t.subscription_end_date, t.owner_phone, t.created_at,
            t.ofac_screening_status, t.kyc_status, t.kyc_document_type,
            t.kyc_document_number, t.kyc_verified_at, t.business_license_number
       FROM tenants t WHERE t.id = $1`,
    [tenantId]
  );
  const [wallet, aiWallet, users, deployments, invoices] = await Promise.all([
    getAdminPool().query(`SELECT usd_balance_cents, afn_balance_pul FROM wallets WHERE tenant_id = $1`, [tenantId]),
    getAdminPool().query(`SELECT credit_balance, monthly_credit_quota, elevenlabs_chars_used_mtd, bedrock_tokens_used_mtd, images_generated_mtd FROM ai_credit_wallets WHERE tenant_id = $1`, [tenantId]),
    getAdminPool().query(`SELECT id, full_name, email, role, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at`, [tenantId]),
    getAdminPool().query(`SELECT id, app_name, framework, status, custom_domain, created_at FROM custom_app_deployments WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId]),
    getAdminPool().query(`SELECT id, invoice_number, amount_afn, status, due_date, paid_at FROM invoices WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId]),
  ]);

  return {
    tenant: tenant.rows[0] ?? null,
    wallet: wallet.rows[0] ?? null,
    aiWallet: aiWallet.rows[0] ?? null,
    users: users.rows,
    deployments: deployments.rows,
    invoices: invoices.rows,
  };
}
