/**
 * Gateway hardening checks.
 *
 * These cover the P0s that were fixed: no unauthenticated token minting, and
 * no webhook accepted when its secret is missing (previously the signature
 * check was skipped entirely if the env var was unset).
 */
import path from 'node:path';
import { ROOT, bindDatabaseToPglite, freshDatabase, makeChecker } from './helpers.mjs';

export async function run() {
  console.log('\n── gateway hardening ' + '─'.repeat(44));
  const { check, failures } = makeChecker();

  // The gateway reads config at import time; make sure nothing is configured.
  process.env.DATABASE_URL ||= 'postgresql://pglite/unused';
  delete process.env.META_APP_SECRET;
  delete process.env.HESABPAY_WEBHOOK_SECRET;
  delete process.env.META_WEBHOOK_VERIFY_TOKEN;
  delete process.env.JWT_SECRET;

  // The gateway's rate limiter is PostgreSQL-backed, so give it a database.
  const database = await import(path.join(ROOT, 'packages/database/dist/index.js'));
  const { db } = await freshDatabase();
  bindDatabaseToPglite(database, db);

  const { handleApiGatewayRequest } = await import(
    path.join(ROOT, 'services/api-gateway/dist/index.js')
  );

  const request = (method, urlPath, extra = {}) => ({
    method,
    path: urlPath,
    query: {},
    headers: { host: 'api.ariacloudservices.org' },
    rawBody: '{}',
    clientIp: '203.0.113.9',
    ...extra,
  });

  let r = await handleApiGatewayRequest(
    request('POST', '/v1/auth/token', {
      rawBody: JSON.stringify({ userId: 'anyone', tenantId: 'any-tenant', role: 'owner' }),
    })
  );
  check('self-service token minting removed (410)', r.statusCode === 410, `status=${r.statusCode}`);

  r = await handleApiGatewayRequest(
    request('POST', '/webhooks/whatsapp', {
      headers: { 'x-hub-signature-256': 'sha256=deadbeef' },
    })
  );
  check('WhatsApp webhook refuses unsigned traffic (503)', r.statusCode === 503, `status=${r.statusCode}`);

  r = await handleApiGatewayRequest(request('POST', '/webhooks/hesabpay'));
  check('HesabPay webhook refuses unsigned traffic (503)', r.statusCode === 503, `status=${r.statusCode}`);

  r = await handleApiGatewayRequest(
    request('GET', '/webhooks/whatsapp', {
      query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'guess', 'hub.challenge': 'x' },
    })
  );
  check('WhatsApp verification refuses when unconfigured (503)', r.statusCode === 503, `status=${r.statusCode}`);

  r = await handleApiGatewayRequest(request('POST', '/v1/domains/provision'));
  check('protected route rejects anonymous callers (401)', r.statusCode === 401, `status=${r.statusCode}`);

  r = await handleApiGatewayRequest(request('GET', '/health'));
  check('health endpoint still responds (200)', r.statusCode === 200, `status=${r.statusCode}`);

  // Shared limiter: pre-fill this IP's bucket in the database (as another
  // gateway instance would have), then the next request must be refused.
  await db.query(
    `INSERT INTO rate_limits (bucket_key, window_start, hits) VALUES ($1, now(), 180)`,
    ['gateway:ip:198.51.100.7']
  );
  r = await handleApiGatewayRequest(
    request('POST', '/v1/domains/provision', { clientIp: '198.51.100.7' })
  );
  check('rate limit is shared via the database (429)', r.statusCode === 429, `status=${r.statusCode}`);
  check('429 carries Retry-After', Number(r.headers?.['Retry-After']) > 0, r.headers?.['Retry-After']);

  r = await handleApiGatewayRequest(request('GET', '/health', { clientIp: '198.51.100.7' }));
  check('health exempt from the rate limit', r.statusCode === 200, `status=${r.statusCode}`);

  return failures();
}
