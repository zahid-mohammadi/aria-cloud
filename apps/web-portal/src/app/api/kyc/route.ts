import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { pool } from '@aria-cloud/database';
import { screenParty, enforceRateLimits } from '@aria-cloud/auth';

export const runtime = 'nodejs';

const VALID_DOC_TYPES = new Set(['tazkira', 'passport', 'business_license']);

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const res = await pool.query<{
      business_name: string;
      kyc_status: string;
      kyc_document_type: string | null;
      kyc_document_number: string | null;
      kyc_verified_at: string | null;
      business_license_number: string | null;
      ofac_screening_status: string;
      ofac_screened_at: string | null;
    }>(
      `SELECT business_name, kyc_status, kyc_document_type, kyc_document_number,
              kyc_verified_at, business_license_number, ofac_screening_status, ofac_screened_at
         FROM tenants
        WHERE id = $1
        LIMIT 1`,
      [session.tenantId]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'TENANT_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ kyc: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load KYC status.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const limited = await enforceRateLimits([
    { key: `kyc:tenant:${session.tenantId}`, limit: 10, windowSeconds: 60 * 60 },
  ]);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const kycDocumentType = typeof body?.kycDocumentType === 'string' ? body.kycDocumentType.trim() : '';
  const kycDocumentNumber = typeof body?.kycDocumentNumber === 'string' ? body.kycDocumentNumber.trim() : '';
  const businessLicenseNumber =
    typeof body?.businessLicenseNumber === 'string' && body.businessLicenseNumber.trim()
      ? body.businessLicenseNumber.trim()
      : null;

  if (!VALID_DOC_TYPES.has(kycDocumentType)) {
    return NextResponse.json(
      { error: 'Invalid document type. Choose tazkira, passport, or business_license.' },
      { status: 400 }
    );
  }
  if (!kycDocumentNumber || kycDocumentNumber.length < 4 || kycDocumentNumber.length > 120) {
    return NextResponse.json(
      { error: 'Document number must be between 4 and 120 characters.' },
      { status: 400 }
    );
  }

  try {
    const tenantRes = await pool.query<{ business_name: string; owner_name: string | null }>(
      `SELECT t.business_name, u.full_name AS owner_name
         FROM tenants t
         LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'owner'
        WHERE t.id = $1
        LIMIT 1`,
      [session.tenantId]
    );
    const tenant = tenantRes.rows[0];
    if (!tenant) {
      return NextResponse.json({ error: 'TENANT_NOT_FOUND' }, { status: 404 });
    }

    const screening = await screenParty([tenant.business_name, tenant.owner_name || session.fullName].filter(Boolean));

    const updated = await pool.query(
      `UPDATE tenants
          SET kyc_status = 'pending_review',
              kyc_document_type = $1,
              kyc_document_number = $2,
              business_license_number = COALESCE($3, business_license_number),
              ofac_screening_status = $4,
              ofac_screened_at = now()
        WHERE id = $5
        RETURNING business_name, kyc_status, kyc_document_type, kyc_document_number,
                  kyc_verified_at, business_license_number, ofac_screening_status, ofac_screened_at`,
      [kycDocumentType, kycDocumentNumber, businessLicenseNumber, screening.status, session.tenantId]
    );

    return NextResponse.json({
      ok: true,
      kyc: updated.rows[0],
      message: 'KYC documents submitted for compliance review.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to submit KYC.' }, { status: 500 });
  }
}
