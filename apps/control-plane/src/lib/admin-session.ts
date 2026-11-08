import { cookies } from 'next/headers';
import { resolveSession, type ResolvedSession } from '@aria-cloud/auth';
import { SESSION_COOKIE } from '@aria-cloud/auth/constants';

export type AdminSession = ResolvedSession;

/**
 * Admin gate for the platform control plane.
 *
 * Authenticated-but-not-admin callers get 403 (not 401) so that a merchant
 * session can never be confused with a missing one, and the distinction shows
 * up in logs.
 */
export async function requireAdmin(): Promise<
  { session: AdminSession; response?: never } | { session?: never; response: Response }
> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) {
    return { response: Response.json({ error: 'UNAUTHORIZED' }, { status: 401 }) };
  }

  let session: ResolvedSession | null = null;
  try {
    session = await resolveSession(token);
  } catch {
    return { response: Response.json({ error: 'UNAUTHORIZED' }, { status: 401 }) };
  }

  if (!session) {
    return { response: Response.json({ error: 'UNAUTHORIZED' }, { status: 401 }) };
  }
  if (!session.isPlatformAdmin) {
    return { response: Response.json({ error: 'FORBIDDEN' }, { status: 403 }) };
  }

  return { session };
}
