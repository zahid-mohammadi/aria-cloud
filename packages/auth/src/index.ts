/**
 * AriaCloud authentication core.
 *
 * Email + password, scrypt-hashed (N=2^15, r=8, p=1), with server-side
 * sessions stored as SHA-256 hashes of a 256-bit random token.
 *
 * Nothing in here may be imported by a client component: it touches the
 * database and node:crypto.
 */
import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { pool, withTenantContext } from '@aria-cloud/database';

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

// --- Tunables ---------------------------------------------------------------

export { SESSION_COOKIE, SESSION_TTL_SECONDS } from './constants';
import { SESSION_TTL_SECONDS } from './constants';
export const MAX_FAILED_ATTEMPTS = 10;
export const LOCKOUT_MINUTES = 15;

const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 128 * 1024 * 1024;

// --- Password hashing -------------------------------------------------------

/** Returns `scrypt$N$r$p$saltB64$keyB64`. */
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8) {
    throw new Error('PASSWORD_TOO_SHORT');
  }
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/** Constant-time verification. Returns false for any malformed stored hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  if (!N || !r || !p || salt.length === 0 || expected.length === 0) return false;

  const key = await scrypt(password.normalize('NFKC'), salt, expected.length, {
    N,
    r,
    p,
    maxmem: SCRYPT_MAXMEM,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// --- Tokens -----------------------------------------------------------------

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
}

// --- Credentials ------------------------------------------------------------

export interface CredentialsRow {
  user_id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  email_verified_at: Date | null;
  failed_login_attempts: number;
  locked_until: Date | null;
  is_platform_admin: boolean;
}

export async function findCredentialsByEmail(email: string): Promise<CredentialsRow | null> {
  const res = await pool.query<CredentialsRow>(
    `SELECT user_id, tenant_id, email, password_hash, email_verified_at,
            failed_login_attempts, locked_until, is_platform_admin
       FROM user_credentials
      WHERE lower(email) = lower($1)
      LIMIT 1`,
    [email.trim()]
  );
  return res.rows[0] ?? null;
}

export async function recordFailedLogin(userId: string): Promise<void> {
  await pool.query(
    `UPDATE user_credentials
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE
              WHEN failed_login_attempts + 1 >= $2 THEN now() + ($3 || ' minutes')::interval
              ELSE locked_until
            END,
            updated_at = now()
      WHERE user_id = $1`,
    [userId, MAX_FAILED_ATTEMPTS, String(LOCKOUT_MINUTES)]
  );
}

export async function recordSuccessfulLogin(userId: string): Promise<void> {
  await pool.query(
    `UPDATE user_credentials
        SET failed_login_attempts = 0,
            locked_until = NULL,
            last_login_at = now(),
            updated_at = now()
      WHERE user_id = $1`,
    [userId]
  );
}

// --- Sessions ---------------------------------------------------------------

export interface ResolvedSession {
  sessionId: string;
  userId: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: string;
  isPlatformAdmin: boolean;
  expiresAt: Date;
}

export async function createSession(input: {
  userId: string;
  tenantId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  /** Override the 7-day default — admin sessions use 8 hours. */
  ttlSeconds?: number;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + (input.ttlSeconds ?? SESSION_TTL_SECONDS) * 1000);

  await pool.query(
    `INSERT INTO sessions (id, user_id, tenant_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      randomUUID(),
      input.userId,
      input.tenantId,
      hashToken(token),
      expiresAt,
      input.ipAddress ?? null,
      input.userAgent ?? null,
    ]
  );

  return { token, expiresAt };
}

/**
 * Resolves a cookie token to a session.
 *
 * Two queries on purpose: the session row is looked up by hash (no tenant
 * known yet, `sessions` is not tenant-scoped), then the user profile is read
 * *inside* the tenant's RLS context, so the profile read is still protected by
 * the same policy as every other table.
 */
export async function resolveSession(token: string | undefined): Promise<ResolvedSession | null> {
  if (!token) return null;

  const res = await pool.query<{
    id: string;
    user_id: string;
    tenant_id: string;
    expires_at: Date;
  }>(
    `SELECT id, user_id, tenant_id, expires_at
       FROM sessions
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > now()
      LIMIT 1`,
    [hashToken(token)]
  );

  const row = res.rows[0];
  if (!row) return null;

  const credentials = await pool.query<{ email: string; is_platform_admin: boolean }>(
    `SELECT email, is_platform_admin FROM user_credentials WHERE user_id = $1 LIMIT 1`,
    [row.user_id]
  );
  if (credentials.rowCount === 0) return null;

  const profile = await withTenantContext(row.tenant_id, async (client) => {
    const r = await client.query<{ full_name: string; role: string }>(
      `SELECT full_name, role FROM users WHERE id = $1 LIMIT 1`,
      [row.user_id]
    );
    return r.rows[0] ?? null;
  });

  // Touch the session at most once a minute to avoid a write on every request.
  await pool.query(
    `UPDATE sessions
        SET last_used_at = now()
      WHERE id = $1
        AND (last_used_at IS NULL OR last_used_at < now() - interval '1 minute')`,
    [row.id]
  );

  return {
    sessionId: row.id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    email: credentials.rows[0].email,
    fullName: profile?.full_name ?? '',
    role: profile?.role ?? 'member',
    isPlatformAdmin: credentials.rows[0].is_platform_admin,
    expiresAt: row.expires_at,
  };
}

export async function revokeSession(token: string): Promise<void> {
  await pool.query(
    `UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashToken(token)]
  );
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await pool.query(
    `UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

// --- Account creation -------------------------------------------------------

/**
 * Creates a users row (inside the tenant's RLS context) plus its credentials
 * row. Caller supplies an existing tenant.
 */
export async function createAccount(input: {
  tenantId: string;
  email: string;
  password: string;
  fullName: string;
  role?: string;
  isPlatformAdmin?: boolean;
  phoneNumber?: string | null;
}): Promise<{ userId: string }> {
  const passwordHash = await hashPassword(input.password);
  const userId = randomUUID();

  await withTenantContext(input.tenantId, async (client) => {
    await client.query(
      `INSERT INTO users (id, tenant_id, full_name, email, phone_number, role)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        input.tenantId,
        input.fullName,
        input.email.trim().toLowerCase(),
        input.phoneNumber ?? null,
        input.role ?? 'owner',
      ]
    );
  });

  await pool.query(
    `INSERT INTO user_credentials
       (user_id, tenant_id, email, password_hash, is_platform_admin)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      userId,
      input.tenantId,
      input.email.trim().toLowerCase(),
      passwordHash,
      input.isPlatformAdmin ?? false,
    ]
  );

  return { userId };
}
