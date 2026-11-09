/**
 * Request helpers shared by the merchant portal and the control plane:
 * client-IP extraction and database-backed rate limiting.
 */
import { consumeRateLimit } from '@aria-cloud/database';

type HeaderSource = { get(name: string): string | null };

/**
 * Best-effort client IP.
 *
 * The left-most X-Forwarded-For entry is whatever the client chose to send,
 * so keying a rate limit on it lets an attacker rotate it freely. Instead we
 * count `TRUSTED_PROXY_HOPS` entries from the right — the ones appended by
 * infrastructure we control. Default 1 (a single load balancer / App Runner
 * front end); set 2 for CloudFront → ALB, and so on.
 */
export function clientIp(headers: HeaderSource): string {
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
  const chain = (headers.get('x-forwarded-for') || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (chain.length > 0) {
    return chain[Math.max(0, chain.length - hops)];
  }
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

export interface RateLimitRule {
  key: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Applies every rule (each one consumes a hit) and returns a 429 Response if
 * any is exceeded, or null if the request may proceed. Errors propagate:
 * callers should treat a rate-limit failure like any other database failure.
 */
export async function enforceRateLimits(rules: RateLimitRule[]): Promise<Response | null> {
  let blocked = false;
  let retryAfter = 1;
  for (const rule of rules) {
    const result = await consumeRateLimit(rule.key, rule.limit, rule.windowSeconds);
    if (!result.allowed) {
      blocked = true;
      retryAfter = Math.max(retryAfter, result.retryAfterSeconds);
    }
  }
  if (!blocked) return null;

  return new Response(
    JSON.stringify({
      error: 'RATE_LIMITED',
      message: 'Too many requests. Please wait and try again.',
      retryAfterSeconds: retryAfter,
    }),
    {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
    }
  );
}
