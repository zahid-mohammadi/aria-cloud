import { cookies } from 'next/headers';
import { resolveSession, type ResolvedSession } from '@aria-cloud/auth';
import { SESSION_COOKIE } from '@aria-cloud/auth/constants';

export type { ResolvedSession };

/**
 * Authoritative session lookup. Middleware only checks that a cookie exists;
 * this is where it is validated against the database (and therefore where
 * tenantId comes from — never from the request body).
 */
export async function getSession(): Promise<ResolvedSession | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await resolveSession(token);
  } catch {
    // Treat DB/config failures as "not authenticated" rather than leaking
    // a 500 that tells an attacker the backend is misconfigured.
    return null;
  }
}

export function unauthorized() {
  return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}
