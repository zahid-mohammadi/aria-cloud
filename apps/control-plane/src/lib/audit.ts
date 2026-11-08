import type { NextRequest } from 'next/server';
import { recordAuditEvent, type ResolvedSession } from '@aria-cloud/auth';

/**
 * Records a privileged API call. Fire-and-forget: `recordAuditEvent` never
 * throws, so a logging failure cannot break the operation being audited.
 */
export async function audit(
  req: NextRequest,
  session: ResolvedSession,
  action: string,
  extra?: {
    tenantId?: string | null;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await recordAuditEvent({
    actorUserId: session.userId,
    actorEmail: session.email,
    action,
    targetTenantId: extra?.tenantId ?? session.tenantId,
    targetType: extra?.targetType ?? null,
    targetId: extra?.targetId ?? null,
    metadata: {
      method: req.method,
      path: req.nextUrl.pathname,
      ...(extra?.metadata ?? {}),
    },
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  });
}
