/**
 * Aria Cloud Services (api.ariacloudservices.org)
 * Module #4: Cryptographic Webhook Verifiers, Tenant JWT Signer/Verifier & Rate Limiter
 *
 * Security Guarantees:
 * - Constant-time HMAC comparison (`crypto.timingSafeEqual`) with strict buffer length
 *   pre-checks to prevent `RangeError: Input buffers must have the same byte length`.
 * - Multi-Tenant JWT (HS256) carrying `tenantId`, `sub` (userId), `role`, and `locale`
 *   for automatic PostgreSQL Row-Level Security (`app.current_tenant_id`) injection.
 */

import crypto from 'crypto';

export interface TenantJwtClaims {
  sub: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'member' | 'student' | 'creator';
  planTier: string;
  locale: 'fa' | 'ps_AF' | 'en';
  iat: number;
  exp: number;
  iss: string;
}

const JWT_SECRET =
  process.env.JWT_SECRET || 'ariacloud-prod-jwt-secret-change-in-secrets-manager';
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org';

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): Buffer {
  const padLength = (4 - (input.length % 4)) % 4;
  const base64 = (input + '='.repeat(padLength))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  return Buffer.from(base64, 'base64');
}

/**
 * Constant-time hex/string comparison that safely checks byte length before calling
 * `crypto.timingSafeEqual` (preventing Node.js RangeError exceptions on malformed headers).
 */
export function safeConstantTimeEqual(expected: string, provided: string): boolean {
  const bufA = Buffer.from(expected, 'utf8');
  const bufB = Buffer.from(provided, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Signs an HS256 JWT scoped to a specific tenant and user for `api.ariacloudservices.org`.
 */
export function signTenantJwt(
  payload: Omit<TenantJwtClaims, 'iat' | 'exp' | 'iss'>,
  ttlSeconds = 86400
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullClaims: TenantJwtClaims = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
    iss: `https://api.${ROOT_DOMAIN}`,
  };

  const headerB64 = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullClaims));
  const signingInput = `${headerB64}.${payloadB64}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signingInput)
    .digest();

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

/**
 * Verifies an HS256 Tenant JWT from `Authorization: Bearer <token>` and returns its claims.
 */
export function verifyTenantJwt(token: string): TenantJwtClaims {
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT token structure.');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;
  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', JWT_SECRET).update(signingInput).digest()
  );

  if (!safeConstantTimeEqual(expectedSig, signatureB64)) {
    throw new Error('Invalid JWT signature.');
  }

  const claims = JSON.parse(base64UrlDecode(payloadB64).toString('utf8')) as TenantJwtClaims;
  const now = Math.floor(Date.now() / 1000);

  if (!claims.exp || claims.exp < now) {
    throw new Error('JWT token has expired.');
  }

  if (!claims.tenantId || !claims.sub) {
    throw new Error('JWT missing required tenantId or sub claims.');
  }

  return claims;
}

/**
 * Verifies Meta WhatsApp Cloud API `X-Hub-Signature-256: sha256=<hex>` header
 * against the raw webhook request body.
 */
export function verifyMetaWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=') || !appSecret) {
    return false;
  }
  const providedHex = signatureHeader.slice('sha256='.length).trim().toLowerCase();
  const expectedHex = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')
    .toLowerCase();

  return safeConstantTimeEqual(expectedHex, providedHex);
}

/**
 * Verifies HesabPay `X-HesabPay-Signature` HMAC-SHA256 header against raw request body.
 */
export function verifyHesabPaySignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  webhookSecret: string
): boolean {
  if (!signatureHeader || !webhookSecret) {
    return false;
  }
  const cleanProvided = signatureHeader.replace(/^sha256=/i, '').trim().toLowerCase();
  const expectedHex = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex')
    .toLowerCase();

  return safeConstantTimeEqual(expectedHex, cleanProvided);
}

/*
 * Rate limiting lives in @aria-cloud/database (`consumeRateLimit`): it is
 * PostgreSQL-backed so the limit holds across every gateway instance. The
 * in-memory token bucket that used to be here was per-process and reset on
 * every cold start.
 */
