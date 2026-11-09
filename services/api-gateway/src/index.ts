/**
 * Aria Cloud Services — Core API Gateway & Webhook Router
 * Production Host: https://api.ariacloudservices.org
 *
 * Routes:
 * - GET  /health                    -> System & Regional Health Check (me-central-1)
 * - POST /v1/auth/token             -> Issues HS256 Multi-Tenant JWT for RLS Context
 * - GET  /webhooks/whatsapp         -> Meta WhatsApp Cloud API Hub Verification Challenge
 * - POST /webhooks/whatsapp         -> Meta WhatsApp Inbound Voice/Text & Storefront Bot
 * - POST /webhooks/hesabpay         -> HesabPay HMAC-SHA256 Settlement & Credit Top-Up
 * - POST /v1/domains/provision      -> Tenant JWT-protected Subdomain/Custom Domain/Stalwart Mail
 * - POST /v1/storefronts/build      -> Tenant JWT-protected AI Storefront Builder & Edge Publisher
 */

import http from 'http';
import { URL } from 'url';
import {
  checkTenantRateLimit,
  safeConstantTimeEqual,
  verifyHesabPaySignature,
  verifyMetaWebhookSignature,
  verifyTenantJwt,
} from './crypto-auth';
import { pool, withTenantContext } from '@aria-cloud/database';
import { handleWhatsAppMessage } from '@aria-cloud/agent-runtime';
// The gateway runs on Node, so it can import the full module (unlike edge
// middleware, which needs the constants subpath).
import { resolveSession, SESSION_COOKIE } from '@aria-cloud/auth';
import {
  provisionCustomDomain,
  provisionMerchantSubdomain,
  provisionStalwartMailbox,
} from '@aria-cloud/domain-provisioner';
import { generateUniversalSite } from '@aria-cloud/site-builder';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org';
const PRIMARY_REGION = process.env.SES_REGION || 'me-central-1';
const META_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const HESABPAY_WEBHOOK_SECRET = process.env.HESABPAY_WEBHOOK_SECRET || '';

export interface GatewayRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string | undefined>;
  rawBody: string;
  clientIp?: string;
}

export interface GatewayResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

function jsonResponse(statusCode: number, data: unknown): GatewayResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || `https://app.${ROOT_DOMAIN}`,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'X-Powered-By': 'AriaCloud-Gateway/1.0',
    },
    body: JSON.stringify(data),
  };
}

interface AuthContext {
  tenantId: string;
  userId?: string;
  locale?: 'fa' | 'ps_AF' | 'en';
}

function getCookie(
  headers: Record<string, string | undefined>,
  name: string
): string | undefined {
  const raw = headers['cookie'] || headers['Cookie'];
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return undefined;
}

/**
 * Authorization for privileged routes.
 *
 * Primary path is the console session cookie (same session table the web apps
 * use). Bearer tokens remain available for service-to-service calls, but only
 * when JWT_SECRET is explicitly configured — otherwise they are refused rather
 * than silently trusted.
 */
async function authenticate(
  headers: Record<string, string | undefined>
): Promise<AuthContext> {
  const sessionToken = getCookie(headers, SESSION_COOKIE);
  if (sessionToken) {
    const session = await resolveSession(sessionToken);
    if (session) {
      return { tenantId: session.tenantId, userId: session.userId };
    }
  }

  const authHeader = headers['authorization'] || headers['Authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    if (!process.env.JWT_SECRET) {
      throw new Error('Unauthorized: bearer tokens are disabled on this deployment.');
    }
    const claims = verifyTenantJwt(authHeader.slice('Bearer '.length).trim());
    return { tenantId: claims.tenantId, userId: claims.sub, locale: claims.locale };
  }

  throw new Error('Unauthorized: sign in to the console or supply a service token.');
}

/**
 * Maps a WhatsApp sender to a tenant using the merchant owner's phone number.
 * Returns null when the number is not linked to an active account, so callers
 * can refuse instead of acting on a placeholder tenant.
 */
/**
 * Resolves the tenant owner's user id (used to attribute WhatsApp usage to a
 * user quota). Runs inside the tenant's RLS context so it works regardless of
 * whether the connecting role bypasses RLS.
 */
async function resolveOwnerUser(tenantId: string): Promise<string | null> {
  return withTenantContext(tenantId, async (client) => {
    const res = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE tenant_id = $1 AND role = 'owner' LIMIT 1`,
      [tenantId]
    );
    return res.rows[0]?.id ?? null;
  });
}

async function resolveTenantByPhone(phone: string): Promise<string | null> {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const res = await pool.query<{ id: string }>(
    `SELECT id FROM tenants
      WHERE regexp_replace(owner_phone, '\\D', '', 'g') = $1
        AND account_status <> 'suspended'
      LIMIT 1`,
    [digits]
  );
  return res.rows[0]?.id ?? null;
}

/**
 * Universal API Gateway dispatcher compatible with AWS Lambda Proxy Integration,
 * AWS App Runner, and Node.js `http.Server`.
 */
export async function handleApiGatewayRequest(
  req: GatewayRequest
): Promise<GatewayResponse> {
  if (req.method === 'OPTIONS') {
    return jsonResponse(204, {});
  }

  // Rate-limit check per client IP or Authorization token
  const rateKey = req.clientIp || 'unknown';
  const rate = checkTenantRateLimit(rateKey, 90, 3);
  if (!rate.allowed) {
    return jsonResponse(429, {
      error: 'Too Many Requests — Tenant rate limit exceeded on api.ariacloudservices.org',
    });
  }

  try {
    // 1. Health & Readiness Endpoint
    if (req.method === 'GET' && req.path === '/health') {
      return jsonResponse(200, {
        status: 'healthy',
        service: 'api.ariacloudservices.org',
        rootDomain: ROOT_DOMAIN,
        region: PRIMARY_REGION,
        aiAssistant: process.env.SYSTEM_AI_NAME || 'Aria Assistant',
        mission:
          process.env.ORGANIZATION_MISSION ||
          'AriaCloud — Afghan Digital Enablement Initiative',
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Self-service JWT minting has been removed. Tokens used to be issued
    //    for any userId/tenantId without a credential, which made every
    //    tenant-scoped control on this gateway bypassable. Sessions are now
    //    issued by the console login (see packages/auth) and accepted below.
    if (req.method === 'POST' && req.path === '/v1/auth/token') {
      return jsonResponse(410, {
        error:
          'Token minting has been removed. Sign in at the console to obtain a session, ' +
          'or configure a service token out of band.',
      });
    }

    // 3. Meta WhatsApp Cloud API Verification Challenge (`GET /webhooks/whatsapp`)
    if (req.method === 'GET' && req.path === '/webhooks/whatsapp') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'] || '';

      if (!META_VERIFY_TOKEN) {
        return jsonResponse(503, {
          error: 'WhatsApp webhook verify token is not configured.',
        });
      }
      if (mode === 'subscribe' && token && safeConstantTimeEqual(META_VERIFY_TOKEN, token)) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          body: challenge,
        };
      }
      return jsonResponse(403, { error: 'WhatsApp webhook verification token mismatch.' });
    }

    // 4. Meta WhatsApp Cloud API Inbound Webhook (`POST /webhooks/whatsapp`)
    if (req.method === 'POST' && req.path === '/webhooks/whatsapp') {
      const sigHeader =
        req.headers['x-hub-signature-256'] || req.headers['X-Hub-Signature-256'];

      if (!META_APP_SECRET) {
        return jsonResponse(503, {
          error: 'META_APP_SECRET is not configured; refusing unsigned WhatsApp webhook.',
        });
      }
      if (!verifyMetaWebhookSignature(req.rawBody, sigHeader, META_APP_SECRET)) {
        return jsonResponse(401, {
          error: 'Invalid X-Hub-Signature-256 cryptographic signature.',
        });
      }

      const payload = JSON.parse(req.rawBody || '{}');
      const changeValue = payload?.entry?.[0]?.changes?.[0]?.value;
      const msg = changeValue?.messages?.[0];

      if (!msg) {
        return jsonResponse(200, { status: 'ignored_non_message_event' });
      }

      const senderPhone: string = msg.from || '+93700000000';
      const msgType: 'text' | 'audio' = msg.type === 'audio' ? 'audio' : 'text';
      const textBody: string = msg.text?.body || '';

      // Check if the merchant sent a WhatsApp `/build <slug> <description>` command
      if (msgType === 'text' && textBody.trim().toLowerCase().startsWith('/build ')) {
        const parts = textBody.trim().split(/\s+/);
        const slug = parts[1] || 'kabul-store';
        const promptText = parts.slice(2).join(' ') || 'فروشگاه آنلاین محصولات افغانی';

        const tenantId = await resolveTenantByPhone(senderPhone);
        if (!tenantId) {
          return jsonResponse(200, {
            status: 'sender_not_registered',
            senderPhone,
            message:
              'This WhatsApp number is not linked to an AriaCloud merchant account.',
          });
        }

        const built = await generateUniversalSite({
          tenantId,
          subdomainSlug: slug,
          industry: 'retail',
          prompt: promptText,
          layout: 'aurora',
          theme: 'emerald',
        });

        return jsonResponse(200, {
          status: 'storefront_published_via_whatsapp',
          senderPhone,
          liveUrl: built.liveUrl,
          fqdn: `${built.subdomainSlug}.ariacloudservices.org`,
          replyPreview: `تبریک! فروشگاه آنلاین شما ساخته شد و هم‌اکنون در آدرس ${built.liveUrl} فعال است.`,
        });
      }

      // Ordinary message → route to the multimodal WhatsApp assistant.
      const tenantId = await resolveTenantByPhone(senderPhone);
      if (!tenantId) {
        return jsonResponse(200, { status: 'sender_not_registered', senderPhone });
      }
      const userId = await resolveOwnerUser(tenantId);
      if (!userId) {
        return jsonResponse(200, { status: 'no_user_account', senderPhone });
      }

      try {
        await handleWhatsAppMessage(msg, { tenantId, userId });
      } catch (error) {
        // Always ACK Meta within its window; the assistant logs its own errors.
        console.error('[whatsapp] assistant error:', error);
      }

      return jsonResponse(200, {
        status: 'processed',
        senderPhone,
        tenantId,
        modality: msgType === 'audio' ? 'voice_to_voice_loop' : 'text_reply',
      });
    }

    // 5. HesabPay Payment Settlement Webhook (`POST /webhooks/hesabpay`)
    if (req.method === 'POST' && req.path === '/webhooks/hesabpay') {
      const sigHeader =
        req.headers['x-hesabpay-signature'] || req.headers['X-HesabPay-Signature'];

      if (!HESABPAY_WEBHOOK_SECRET) {
        return jsonResponse(503, {
          error: 'HESABPAY_WEBHOOK_SECRET is not configured; refusing unsigned webhook.',
        });
      }
      if (!verifyHesabPaySignature(req.rawBody, sigHeader, HESABPAY_WEBHOOK_SECRET)) {
        return jsonResponse(401, {
          error: 'Invalid X-HesabPay-Signature HMAC-SHA256 digest.',
        });
      }

      const payload = JSON.parse(req.rawBody || '{}');
      const { transaction_id, tenant_id, invoice_id, amount_afn, payer_mobile } = payload;

      if (!transaction_id || !tenant_id || !amount_afn) {
        return jsonResponse(400, {
          error: 'Missing required HesabPay fields (transaction_id, tenant_id, amount_afn).',
        });
      }

      return jsonResponse(200, {
        status: 'settled',
        idempotencyKey: transaction_id,
        tenantId: tenant_id,
        invoiceId: invoice_id || null,
        amountAfn: Number(amount_afn),
        payerMobile: payer_mobile || null,
        settledAt: new Date().toISOString(),
      });
    }

    // 6. Protected Route: Domain, Wildcard Subdomain & Stalwart Mail Provisioning
    if (req.method === 'POST' && req.path === '/v1/domains/provision') {
      const claims = await authenticate(req.headers);
      const body = JSON.parse(req.rawBody || '{}');

      if (body.action === 'subdomain') {
        const res = await provisionMerchantSubdomain(
          claims.tenantId,
          body.subdomainSlug,
          body.storeTitle || 'AriaCloud Store'
        );
        return jsonResponse(200, res);
      }

      if (body.action === 'custom_domain') {
        const res = await provisionCustomDomain(
          claims.tenantId,
          body.domainName,
          body.stalwartMailIp || '127.0.0.1'
        );
        return jsonResponse(200, res);
      }

      if (body.action === 'mailbox') {
        const res = await provisionStalwartMailbox(
          claims.tenantId,
          body.domainId,
          body.localPart,
          body.domainName || ROOT_DOMAIN,
          body.password,
          body.quotaMb || 5120
        );
        return jsonResponse(200, res);
      }

      return jsonResponse(400, { error: 'Unknown domain provisioning action.' });
    }

    // 7. Protected Route: Build & Publish AI Merchant Storefront (`POST /v1/storefronts/build`)
    if (req.method === 'POST' && req.path === '/v1/storefronts/build') {
      const claims = await authenticate(req.headers);
      const body = JSON.parse(req.rawBody || '{}');

      const result = await generateUniversalSite({
        tenantId: claims.tenantId,
        subdomainSlug: body.subdomainSlug || 'kabul-saffron',
        industry: body.industry || 'retail',
        prompt: body.prompt || 'فروشگاه آنلاین زعفران و خشکبار افغانستان',
        layout: body.layout,
        theme: body.theme,
        publishToS3: Boolean(body.publishToS3),
      });

      return jsonResponse(200, {
        siteId: result.siteId,
        industry: result.industry,
        subdomainSlug: result.subdomainSlug,
        liveUrl: result.liveUrl,
        s3Path: result.s3Path,
        layout: result.schema.layout,
        theme: result.schema.theme,
      });
    }

    return jsonResponse(404, {
      error: `Route ${req.method} ${req.path} not found on api.${ROOT_DOMAIN}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gateway error';
    const isAuthError = /unauthori[sz]ed|jwt|authorization/i.test(message);
    return jsonResponse(isAuthError ? 401 : 500, { error: message });
  }
}

/**
 * Standalone Node.js HTTP Server for AWS App Runner / ECS / Local Dev (`PORT=4000`)
 */
export function startApiGatewayServer(port = Number(process.env.PORT || 4000)) {
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', async () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const query: Record<string, string> = {};
      parsedUrl.searchParams.forEach((v, k) => {
        query[k] = v;
      });

      const headers: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        headers[k] = Array.isArray(v) ? v[0] : v;
      }

      const gatewayResp = await handleApiGatewayRequest({
        method: req.method || 'GET',
        path: parsedUrl.pathname,
        query,
        headers,
        rawBody,
        clientIp: req.socket.remoteAddress,
      });

      res.writeHead(gatewayResp.statusCode, gatewayResp.headers);
      res.end(gatewayResp.body);
    });
  });

  server.listen(port, () => {
    console.log(
      `[AriaCloud API Gateway] Listening on port ${port} for https://api.${ROOT_DOMAIN}`
    );
  });

  return server;
}

if (require.main === module) {
  startApiGatewayServer();
}
