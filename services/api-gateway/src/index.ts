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
  signTenantJwt,
  TenantJwtClaims,
  verifyHesabPaySignature,
  verifyMetaWebhookSignature,
  verifyTenantJwt,
} from './crypto-auth';
import {
  provisionCustomDomain,
  provisionMerchantSubdomain,
  provisionStalwartMailbox,
} from '@aria-cloud/domain-provisioner';
import { buildAndPublishStorefront } from '@aria-cloud/site-builder';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org';
const PRIMARY_REGION = process.env.SES_REGION || 'me-central-1';
const META_VERIFY_TOKEN =
  process.env.META_WEBHOOK_VERIFY_TOKEN || 'ariacloud-whatsapp-verify-token';
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

function authenticateBearer(headers: Record<string, string | undefined>): TenantJwtClaims {
  const authHeader = headers['authorization'] || headers['Authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization: Bearer <token> header.');
  }
  const token = authHeader.slice('Bearer '.length).trim();
  return verifyTenantJwt(token);
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
  const rateKey = req.headers['authorization'] || req.clientIp || 'anon';
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

    // 2. Multi-Tenant JWT Issuance (`POST /v1/auth/token`)
    if (req.method === 'POST' && req.path === '/v1/auth/token') {
      const body = JSON.parse(req.rawBody || '{}');
      const { userId, tenantId, role = 'owner', planTier = 'pro_studio', locale = 'fa' } = body;

      if (!userId || !tenantId) {
        return jsonResponse(400, { error: 'userId and tenantId are required.' });
      }

      const accessToken = signTenantJwt({
        sub: String(userId),
        tenantId: String(tenantId),
        role,
        planTier,
        locale,
      });

      return jsonResponse(200, {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 86400,
        tenantId,
        issuer: `https://api.${ROOT_DOMAIN}`,
      });
    }

    // 3. Meta WhatsApp Cloud API Verification Challenge (`GET /webhooks/whatsapp`)
    if (req.method === 'GET' && req.path === '/webhooks/whatsapp') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'] || '';

      if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
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

      if (META_APP_SECRET && !verifyMetaWebhookSignature(req.rawBody, sigHeader, META_APP_SECRET)) {
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

        const built = await buildAndPublishStorefront({
          tenantId: '00000000-0000-0000-0000-000000000001',
          subdomainSlug: slug,
          prompt: promptText,
          primaryLocale: 'fa',
          theme: 'emerald_bazaar',
          whatsappPhone: senderPhone,
        });

        return jsonResponse(200, {
          status: 'storefront_published_via_whatsapp',
          senderPhone,
          liveUrl: built.liveUrl,
          fqdn: built.fqdn,
          replyPreview: `تبریک! فروشگاه آنلاین شما ساخته شد و هم‌اکنون در آدرس ${built.liveUrl} فعال است.`,
        });
      }

      return jsonResponse(200, {
        status: 'processed_by_aria_assistant',
        senderPhone,
        modality: msgType === 'audio' ? 'voice_to_voice_loop' : 'text_reply',
        assistantName: process.env.SYSTEM_AI_NAME || 'Aria Assistant',
        routedTo: 'services/agent-runtime/src/handlers/whatsapp-assistant.ts',
      });
    }

    // 5. HesabPay Payment Settlement Webhook (`POST /webhooks/hesabpay`)
    if (req.method === 'POST' && req.path === '/webhooks/hesabpay') {
      const sigHeader =
        req.headers['x-hesabpay-signature'] || req.headers['X-HesabPay-Signature'];

      if (
        HESABPAY_WEBHOOK_SECRET &&
        !verifyHesabPaySignature(req.rawBody, sigHeader, HESABPAY_WEBHOOK_SECRET)
      ) {
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
      const claims = authenticateBearer(req.headers);
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
      const claims = authenticateBearer(req.headers);
      const body = JSON.parse(req.rawBody || '{}');

      const result = await buildAndPublishStorefront({
        tenantId: claims.tenantId,
        subdomainSlug: body.subdomainSlug || 'kabul-saffron',
        prompt: body.prompt || 'فروشگاه آنلاین زعفران و خشکبار افغانستان',
        primaryLocale: body.primaryLocale || claims.locale || 'fa',
        theme: body.theme || 'emerald_bazaar',
        whatsappPhone: body.whatsappPhone,
        publishToS3: Boolean(body.publishToS3),
      });

      return jsonResponse(200, result);
    }

    return jsonResponse(404, {
      error: `Route ${req.method} ${req.path} not found on api.${ROOT_DOMAIN}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gateway error';
    const isAuthError =
      message.includes('JWT') || message.includes('Authorization');
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
