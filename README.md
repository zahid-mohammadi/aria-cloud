# AriaCloud (`ariacloudservices.org`)

**Sovereign cloud infrastructure and multilingual AI for Afghanistan.**

A multi-tenant platform to build, host and grow Afghan businesses — AI-generated websites in Dari, Pashto and English, verified business email, and local payment in Afghanis, without foreign bank cards.

> **Status: application code complete, not yet deployed.** The services, schema, auth and merchant/admin consoles are implemented and verified against a local PostgreSQL. Infrastructure (compute, IAM, mail server) is not yet provisioned — see [Deployment](#deployment).

---

## What's implemented

| Area | Status | Notes |
| :--- | :--- | :--- |
| Multi-tenant schema | ✅ | PostgreSQL with `FORCE ROW LEVEL SECURITY`; 8 migrations |
| Auth | ✅ | Email/password (scrypt), sessions, password reset, admin console, audit log |
| Billing | ✅ | HesabPay webhook + field-cash OTP, double-entry ledger, agent keys |
| AI site builder | ✅ | Trilingual (Dari/Pashto/English) PWA storefronts for 6 sectors; XSS-escaped; slug ownership |
| AI Studio | ✅ | Voice (ElevenLabs), image & chat (Bedrock), WhatsApp assistant |
| Domains & email | ✅ | Subdomain/custom-domain/mailbox provisioning (Route 53, ACM, SES, Stalwart) |
| Merchant console | ✅ | Cloudscape UI (web-portal), light AWS-style public landing page |
| Admin console | ✅ | Control plane with admin-only routes + audit |
| Verification | ✅ | `pnpm verify` — schema/RLS, auth, gateway, payments, storefront vs PostgreSQL 16 (PGlite) |

## Architecture

```
apps/web-portal      Merchant console + public landing page (Next 14, Cloudscape)
apps/control-plane   Platform admin console (Next 14)
services/api-gateway HTTP + webhook router (session auth, HMAC verification)
services/billing     Settlement, cash OTP, ledger (Lambda handler)
services/site-builder AI storefront generator/compiler
services/agent-runtime Voice / image / WhatsApp assistant handlers
services/domain-provisioner Route 53 / ACM / SES / Stalwart provisioning
packages/database    Migrations + RLS client + tenant context
packages/auth        scrypt hashing, sessions, tokens, audit
packages/ui          Shared i18n + design tokens
```

## Security model

- **Tenant isolation** is enforced in PostgreSQL via `FORCE ROW LEVEL SECURITY`, keyed off `app.current_tenant_id`, set per-transaction by `withTenantContext()`.
- **Auth** uses email + scrypt-hashed passwords, server-side sessions (SHA-256 token hashes), single-use reset tokens, and an append-only admin audit log.
- **Webhooks** (HesabPay, Meta) fail closed — a missing secret rejects the request, never accepts it unsigned.
- **Money** is integer minor units (AFN pul / USD cents) in a balanced double-entry ledger.
- **Third-party code** (the app runner) has its own security model — see [docs/app-runner-security-model.md](docs/app-runner-security-model.md). It must not run untrusted workloads until that model is implemented.

## Running locally

```bash
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"   # if Docker CLI isn't on PATH
docker run -d --name aria-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=aria_cloud postgres:16

export DATABASE_URL='postgresql://postgres:test@localhost:5432/aria_cloud'
pnpm install
pnpm db:migrate                              # applies 001–008
pnpm user:create -- --email you@example.com --password 'long-password' \
  --business "Kabul Saffron" --subdomain kabul-saffron --admin

pnpm dev:portal                              # merchant console → http://localhost:3001
pnpm dev:console                             # admin console    → http://localhost:3000
pnpm verify                                  # schema/RLS/auth/gateway/payments/storefront tests
```

## Deployment

Not yet provisioned. Remaining infrastructure work, in rough order:

1. IAM roles and S3 bucket policy (CloudFront + OAC currently 403 without it).
2. Compute for the two Next apps (App Runner or ECS).
3. API Gateway + Lambda for `services/api-gateway` and `services/billing`.
4. Mail server (EC2 + EFS mount targets) for `mail.ariacloudservices.org`.

See `infrastructure/terraform/` for the current state (VPC, Aurora, S3, CloudFront, Route 53).
