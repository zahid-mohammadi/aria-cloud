import { NextRequest, NextResponse } from 'next/server';
import { getTenantOverview, withTenantContext } from '@aria-cloud/database';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const overview = await getTenantOverview(session.tenantId);
    const { invoices, deployments } = await withTenantContext(session.tenantId, async (client) => {
      const inv = await client.query(
        `SELECT invoice_number, amount_afn, status, due_date, paid_at
           FROM invoices WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5`,
        [session.tenantId]
      );
      const dep = await client.query(
        `SELECT app_name, framework, status, custom_domain
           FROM custom_app_deployments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5`,
        [session.tenantId]
      );
      return { invoices: inv.rows, deployments: dep.rows };
    });

    return NextResponse.json({ overview, invoices, deployments });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
