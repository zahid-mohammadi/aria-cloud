# Compliance Gaps — Sanctions, Money Transmission, and Provider Terms of Service

**Status:** engineering inventory, prepared for legal review.
**⚠️ This is not legal advice.** This document records what the code actually does
and does not do. A qualified lawyer (US sanctions, Afghanistan, and payments) must
determine what is required, permitted, and licensed. None of what follows should be
read as a legal conclusion.

---

## 1. The core question: is it unlawful to serve Afghan businesses?

**Not categorically, but it is a high-compliance-burden activity — and the burden is
real, not cosmetic.**

- Afghanistan is **not** under comprehensive US sanctions in the way Iran, North
  Korea, Syria, or Crimea are. Serving Afghan businesses *in general* is not a
  blanket prohibition.
- However, the **Taliban, the Haqqani Network, and designated individuals/entities
  (SDNs)** are sanctioned. US persons — and US companies such as AWS, Meta, and
  ElevenLabs — generally may not transact with SDNs. Because AriaCloud runs on US
  providers, it inherits an obligation to **screen every tenant, agent, and payer**
  against sanctions lists. Today it screens no one (see §2.1).
- **Money movement is the larger exposure.** Collecting cash through field agents,
  and offering a `hawala` payment channel, can make the operator a **money services
  business (MSB)** — regulated in the US and (critically) by **Da Afghanistan Bank**.
  MSB status typically requires registration/licensing, a written AML program, KYC,
  transaction monitoring, and reporting. None of that exists in the code (see §2.2).
- **Provider terms of service are a separate, existential risk.** AWS, Meta
  (WhatsApp), ElevenLabs, and HesabPay each have Acceptable Use Policies and
  sanctions/export-compliance requirements. A single violation can mean **account
  termination**, which for a platform hosted on AWS means the company stops. This is
  the "losing your AWS account kills the company" risk and it is real (see §2.3).

**Bottom line for the team:** this is survivable, but only if sanctions screening,
KYC/AML, and provider-ToS compliance are treated as *first-class requirements*, not
as a checkbox to be added later.

---

## 2. The three compliance domains — what's real vs. stubbed vs. missing

### 2.1 Sanctions screening (OFAC / SDN)

| Item | Status | Location |
| :--- | :--- | :--- |
| `ofac_screening_status` / `ofac_screened_at` columns | **now enforced** — default `'unscreened'`; set by admin or the matcher | `packages/database/migrations/010_...` |
| In-house OFAC matcher (`screenParty`) | **real** — matches against the official SDN CSV | `packages/auth/src/screening.ts` |
| Admin "Screen now" action | **real** — runs the matcher, stores `clear`/`flagged_review`, audits matches | `apps/control-plane/.../api/admin/tenants/route.ts` |
| Screening at tenant creation | **manual** — admin screens each tenant (or wire the hook into signup) | — |
| Screening of payers (HesabPay) | **partial** — settlement blocks `blocked` tenants; payer name not provided by the webhook | `services/billing/src/index.ts` |
| Blocking a `blocked` status tenant at login | **real** — login + session + settlement all refuse `blocked` | `packages/auth/src/index.ts` |
| SDN list refresh | **script** — `scripts/download-ofac-list.mjs` (run on a schedule) | — |
| Commercial vendor (aliases, transliteration) | **missing** — in-house matcher is a first line, not a substitute | — |

**Reality:** screening is now real but *first-line only*. The in-house matcher
normalizes names and does token/substring + light fuzzy matching against the
official SDN CSV, returns `flagged_review` (never `blocked`) on any hit, and
`unscreened` when no list is configured. It does **not** catch aliases or
Dari/Pashto transliterations, and it can false-positive on common names — a
human must confirm. Counsel should decide whether this satisfies the screening
obligation or whether a commercial vendor (World-Check, ComplyAdvantage, etc.)
is required.

### 2.2 Money transmission / AML / KYC (Da Afghanistan Bank + US MSB rules)

| Item | Status | Location |
| :--- | :--- | :--- |
| Field-agent model (`billing_agents`, bearer `api_key_hash`) | **real** | `packages/database/migrations/001_...:58`, `008_...:18-22` |
| Cash handshake OTP (`otp_hash`) | **real** | `packages/database/migrations/008_...:28` |
| `hawala`, `field_cash`, `voucher`, `bank_transfer` payment channels | **modeled** | `packages/database/migrations/001_...:89` |
| Double-entry ledger | **real** (balanced, idempotent) | `packages/database/migrations/008_...`, `services/billing/src/index.ts` |
| KYC (identity documents, Tazkira/passport, beneficial owner) | **missing** | — |
| AML program, transaction monitoring, SAR/STR reporting | **missing** | — |
| MSB/license awareness or status | **missing** | — |
| Field-agent cash collection described in customer copy | **real** | `packages/ui/src/i18n/translations.ts:158` |

**Decision (resolved 2026-11-10):** the self-run rails are removed. Field-agent
cash collection, `hawala`, `voucher` and `bank_transfer` are disabled — enforced
in code (`services/billing` only accepts the HesabPay webhook), at the data layer
(`payment_channel` CHECK constraint = `'hesabpay'`), and in the UI/copy. The
platform is now a **HesabPay merchant** (customer of a licensed transmitter), not
a money-services business. KYC/AML and sanctions screening remain outstanding
(see §4).

### 2.3 Provider terms of service (AWS, Meta, ElevenLabs, HesabPay)

| Dependency | Usage | ToS exposure |
| :--- | :--- | :--- |
| AWS (primary `me-central-1`, ACM in `us-east-1`) | host, S3, SES, Route 53, Bedrock | sanctions/export + Acceptable Use Policy |
| Amazon Bedrock (`us-east-1`) | AI site builder, image, assistant | model ToS + sanctions |
| ElevenLabs (third party) | TTS / STT | third-party ToS + sanctions + data residency |
| Meta WhatsApp Cloud API | gateway, WhatsApp assistant, `/build` | Business/WhatsApp ToS + sanctions |
| HesabPay | payment settlement | payment-partner ToS + DAB licensing |

**Reality:** no ToS review, no sanctions screening before using these providers, and
no documented plan for what happens if any one of them terminates service.

---

## 3. Questions for the lawyer (hand this list over)

1. Is serving Afghan businesses on AWS/Bedrock/ElevenLabs/Meta permissible under
   current OFAC rules, and under what screening conditions?
2. What sanctions-screening obligations attach to *the operator* vs. *the providers*?
3. Does the field-agent cash + `hawala` model make the operator an MSB, and under
   which regulator(s) (FinCEN, DAB, both)? Is licensing required before launch?
4. What KYC/AML is mandatory for: tenants, field agents, and payers — and at what
   transaction threshold?
5. Is "local languages, local payments, offline-first" a defensible public
   positioning, and what claims must be removed to avoid regulatory misrepresentation?
6. What should happen first: a sanctions screening integration, an MSB decision,
   or a provider ToS review?

---

## 4. Recommended actions

**Non-code (owner, ASAP):**
- Retain counsel for US sanctions + Afghanistan payments. This is the single
  highest-priority item.
- Decide the MSB question (license/register vs. restrict cash/hawala to a licensed
  partner) *before* processing real money.
- Review AWS/Meta/ElevenLabs ToS for Afghan-user restrictions.

**Code (does not substitute for legal advice):**
- ✅ Done — HesabPay is now the only payment rail; cash/hawala/field-agent paths
  are removed (code + `payment_channel` constraint + copy).
- Remove or rename the misleading `ofac_screening_status` default so the code does
  not imply screening exists (or wire a real screening hook behind a flag).
- Add explicit, audited statuses for "unscreened" / "flagged_review" / "blocked" and
  make `isTenantBlocked` actually block `blocked` tenants at login.
- Add KYC fields to the tenant/agent records (collection + retention policy to be
  defined by counsel).
- Add a "compliance" section to the README that states honestly: screening and
  licensing are pending legal review.

---

## 5. What is already defensible

To be fair, the code is **not** negligent on the security axis — it is only bare on
the *regulatory* axis:

- **Tenant isolation** is real: `FORCE ROW LEVEL SECURITY` on every tenant table.
- **Auth** is real: scrypt password hashing, hashed server-side sessions, single-use
  reset tokens, constant-time comparison.
- **Money integrity** is real: integer minor units, a balanced double-entry ledger,
  idempotent settlement, hashed agent keys and OTPs.
- **Auditability** is real: an append-only `admin_audit_log`.

What it lacks is the *legal layer* that sits on top of those: screening, KYC, and a
decision about money transmission. Those are the items above.
