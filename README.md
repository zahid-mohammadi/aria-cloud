# AriaCloud (`ariacloudservices.org`)

**AriaCloud — Afghan Digital Enablement Initiative**  
Multi-Tenant Cloud Hosting, Automated Domains & Stalwart Business Email, Dual-Currency Financial Settlement (HesabPay + Hawala Cash OTP + Stripe), AI Merchant Storefront Builder, and Multimodal AI Studio (ElevenLabs 33M Pool + Amazon Bedrock Nova).

---

## 1. Production Subdomain & Routing Architecture (`ariacloudservices.org`)

| Host / Subdomain | Target Infrastructure | Purpose |
| :--- | :--- | :--- |
| `ariacloudservices.org` | CloudFront $\rightarrow$ S3 Static Bucket | Public landing page, mission manifesto, and sign-up portal |
| `app.ariacloudservices.org` | CloudFront $\rightarrow$ Next.js Console | Merchant & Admin Dashboard (Dari, Pashto, English) |
| `api.ariacloudservices.org` | AWS API Gateway $\rightarrow$ Lambda / App Runner | Core API Gateway, webhooks, and Bedrock routing |
| `mail.ariacloudservices.org` | Amazon Lightsail / EC2 (Static IP) | Stalwart Mail Server & SnappyMail Webmail |
| `cdn.ariacloudservices.org` | CloudFront $\rightarrow$ `ariacloud-public-assets` | Global CDN for AI Studio audio, images, and public assets |
| `*.ariacloudservices.org` | CloudFront Dynamic Alias Target | Free instant subdomains for merchant stores (e.g. `kabul-saffron.ariacloudservices.org`) |

---

## 2. Completed Architecture Modules (100% Built)

### Module #1: Multi-Tenant PostgreSQL RLS, Financial Settlement Engine & Multimodal AI Studio
- **Database Migrations (`packages/database/migrations/`):**
  - `001_core_multi_tenant_schema.sql`: Core tenants, users, products, orders, invoices, and payment ledger with `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`.
  - `002_domains_email_and_storefront_deployments.sql`: Multi-tenant domains, Stalwart mail accounts, and versioned AI storefront deployments.
  - `003_ai_studio_system.sql`: Dual-currency wallets (`balance_usd_cents`, `balance_afn_pul`, `ai_credits_balance`) and immutable `ai_generation_logs`.
- **RLS Client (`packages/database/src/index.ts`):** Transaction-scoped `SELECT set_config('app.current_tenant_id', $1, true)` connection wrapper.
- **Billing & Hawala OTP Engine (`services/billing/payment_processor.js`):** Idempotent HesabPay webhook settlement (`FOR UPDATE` row locks) and 6-digit Hawala cash voucher redemption with 5-attempt lockout protection.
- **Multimodal AI Studio Runtime (`services/agent-runtime/src/handlers/`):**
  - `generate-voice.ts`: ElevenLabs TTS (`eleven_multilingual_v2` & `eleven_flash_v2_5`) with atomic credit deduction & refund on API failure.
  - `generate-image.ts`: Amazon Bedrock `amazon.nova-canvas-v1:0` commercial product photography generator.
  - `whatsapp-assistant.ts`: Voice-to-Voice and Text WhatsApp assistant powered by ElevenLabs Scribe v1 ASR + Amazon Nova Micro/Lite + ElevenLabs Flash v2.5.
- **Next.js 14 Control Plane (`apps/control-plane/`):** Unified dashboard for Voice Studio, Image Studio, Aria Assistant, Domains/Storefront Builder, and Dual-Currency Wallet.

### Module #2: Multi-Region AWS Terraform IaC & Automated Domain + Stalwart Mail Provisioner
- **Route 53 Master Zone File:** `infrastructure/dns/ariacloudservices.org.zone`
- **Multi-Region Terraform (`infrastructure/terraform/`):**
  - `providers.tf` & `variables.tf`: Primary `me-central-1` (UAE), `us-east-1` (CloudFront ACM & Bedrock), and `eu-west-1` (SES Inbound).
  - `network_database.tf`: Multi-AZ VPC (`10.40.0.0/16`) and Aurora PostgreSQL 16.4 Serverless v2.
  - `dns_cdn_storage.tf`: Wildcard ACM SSL, S3 buckets with OAC, and CloudFront Function (`ariacloud-merchant-subdomain-router`) rewriting `<store>.ariacloudservices.org` $\rightarrow$ `/tenants/<store>/index.html`.
  - `mail_ses_stalwart.tf`: SES v2 Domain Identity, 2048-bit Easy-DKIM, custom `MAIL FROM` (`bounce.ariacloudservices.org`), SPF, DMARC (`p=quarantine`), and encrypted EFS for Stalwart Mail.
- **Automated Provisioner (`services/domain-provisioner/src/index.ts`):** Programmatic provisioning for `<store>.ariacloudservices.org`, custom merchant domains, and Stalwart JMAP/IMAP mailboxes.

### Module #3: AI Website & Merchant Storefront Builder Engine
- **Storefront Synthesizer & Compiler (`services/site-builder/src/index.ts`):**
  - Generates trilingual (**Dari RTL**, **Pashto RTL**, **English LTR**) storefront blueprints via Amazon Bedrock.
  - Compiles `< 35 KB` 3G-optimized static HTML5 storefronts with live language switching (`دری` / `پښتو` / `EN`), 4 theme palettes, HesabPay checkout, and 1-click WhatsApp order dispatch.
  - Publishes directly to `s3://ariacloud-merchant-sites-production/tenants/<store>/index.html` and invalidates CloudFront edge cache.

### Module #4: Multi-Tenant Auth & API Gateway Webhook Router (`api.ariacloudservices.org`)
- **Cryptographic Verifiers & JWT Auth (`services/api-gateway/src/crypto-auth.ts`):**
  - HS256 Multi-Tenant JWT signer/verifier (`signTenantJwt`, `verifyTenantJwt`) carrying `tenantId`, `sub`, `role`, and `locale`.
  - Constant-time HMAC-SHA256 webhook verifiers for Meta WhatsApp (`verifyMetaWebhookSignature`) and HesabPay (`verifyHesabPaySignature`) with buffer length pre-checks.
  - Sliding token-bucket rate limiter (`checkTenantRateLimit`).
- **Gateway Router (`services/api-gateway/src/index.ts`):**
  - `GET /health`, `POST /v1/auth/token`, `GET & POST /webhooks/whatsapp` (including `/build <slug> <prompt>` WhatsApp storefront creation), `POST /webhooks/hesabpay`, `POST /v1/domains/provision`, and `POST /v1/storefronts/build`.

---

## 3. Running Locally

```bash
# Start the Next.js 14 Control Plane & AI Studio Console
cd apps/control-plane
npm install
npm run dev
```
