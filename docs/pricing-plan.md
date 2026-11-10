# Pricing Plan — AriaCloud (cost-recovery + social impact)

**Status:** proposal under review. This is the single source of truth for the
tiering and unit economics; it supersedes the earlier app-runner pricing doc for
the *plan* layer (the app-runner metering note still applies to container
compute). Validate the unit costs against one month of real metered usage before
launching paid tiers.

---

## 1. Positioning — we do not compete with ChatGPT on chat

The durable moat is **not** the AI model (that is a commodity). It is four
things frontier models do not provide in Afghanistan:

| Gap | Why ChatGPT loses in Afghanistan | What AriaCloud provides |
| :--- | :--- | :--- |
| **Dari/Pashto quality** | Frontier models are weak at Pashto and only mediocre at Dari | Trilingual product; target: fine-tuned Dari/Pashto model |
| **Payments** | Plus needs a foreign USD card | **HesabPay** — local, no foreign card |
| **Connectivity** | Heavy web app, fails on 2G/3G during power cuts | Self-contained offline sites + **WhatsApp-first** assistant |
| **The bundle** | A chatbot, nothing else | Storefront + site + email + domains + payments + KYC + app runner |

**Rule:** sell the *outcome* (a live store, a working mailbox, a functioning
website), never the token. Chat is a loss-leader and a feature, not the product.
Do not enter a per-credit price war with free frontier models.

---

## 2. Unit economics (1 credit ≈ 0.025 AFN, ~65 AFN = $1, dated)

Credit weights align with `packages/api/src/studio.ts`. The media weights are
deliberately raised above raw wholesale so heavy image/voice users cannot erode
the business/student tiers.

| Modality | Code deduction | Wholesale cost | Charged value |
| :--- | :--- | :--- | :--- |
| Fast chat (Nova Micro) | 5 credits / 1K tokens | ~0.012 AFN / 1K tokens | 0.125 AFN / turn |
| Capable chat (Nova Lite) | 10 credits / 1K tokens | ~0.020 AFN / 1K tokens | 0.25 AFN / turn |
| Product image (Nova Canvas) | **400** (std) / **600** (prem) | ~2.6–5.2 AFN | 10–15 AFN / image |
| Dari/Pashto voice (ElevenLabs) | **2 credits / char** | ~7–20 AFN / 1K chars | 50 AFN / 1K chars |
| Static site + shared DB + email | hosting baseline | ~35–80 AFN / tenant / mo | in monthly base fee |

> Voice is the thinnest modality at wholesale; the 2-credit weight is the margin
> fix. Re-baseline the 65 AFN/$ rate monthly.

---

## 3. Tiers (restructured)

| Plan | Tier key | Price (AFN) | Monthly credits | Included |
| :--- | :--- | :--- | :--- | :--- |
| Community Free | `free` | 0 | 1,000 | Nova Micro text only, strict daily cap |
| Aria AI Student | `student_af` | 120 (~$1.85) | 8,000 | Fast + capable chat, light media, 1 portfolio site |
| Personal Plus / Creator | `personal_plus` | 350 (~$5.40) | 25,000 | Full multimodal, site + 1 mailbox alias |
| Starter Business | `starter_af` | 420 (~$6.45) | 15,000 | PWA storefront, HesabPay + WhatsApp order, 1 mailbox |
| Business Pro | `business_pro` | 1,100 (~$16.90) | 45,000 | Custom domain SSL/DKIM, 5 mailboxes, WhatsApp AI bot |
| School / NGO / Org | `agency_af` | 2,500 (~$38.50) | 100,000 | 25 mailboxes, KYC/audit reporting, onboarding |
| — container add-on | — | +1,200 | — | 0.5 vCPU / 1 GB app hosting, **auto-paused when idle** |

---

## 4. Sustainability guardrails

1. **Domains at cost pass-through** — never bundle `.af` (~2,200–3,500 AFN/yr)
   or `.com` (~800 AFN/yr); charge annually at-cost +10% admin.
2. **No "unlimited" claims** — hard `ai_credit_wallets` caps + daily burst limits,
   tightest on Free.
3. **Top-up packs** — 250 AFN / 10,000 credits, non-expiring.
4. **Allocation** — ~55% cloud/AI + HesabPay fees, ~25% local engineering/support,
   ~20% scholarships + reserve.

---

## 5. Margin & reserve (200-user projection)

| Plan | Price | COGS | Ops | Reserve |
| :--- | :--- | :--- | :--- | :--- |
| Free (1,000) | 0 | ~2 | ~1 | −3 (subsidy) |
| Student (8K) | 120 | ~22 (18%) | ~62 | ~36 (30%) |
| Personal Plus (25K) | 350 | ~85 (24%) | ~155 | ~110 (31%) |
| Starter (15K) | 420 | ~85 (20%) | ~205 | ~130 (31%) |
| Business Pro (45K) | 1,100 | ~220 (20%) | ~530 | ~350 (32%) |
| School/NGO (100K) | 2,500 | ~450 (18%) | ~1,175 | ~875 (35%) |

Blended (100 Free + 50 Student + 15 Personal + 20 Starter + 12 Pro + 3 NGO):

- Gross revenue **40,350 AFN** (~$621)
- Direct COGS **8,265 AFN** (20.5%)
- Operational + base infra **19,510 AFN** (48.3%)
- Net growth reserve **12,575 AFN** (31.2%)

---

## 6. The warning the projection hides

The fixed AWS baseline (Aurora Serverless + NAT/VPC + Stalwart VM) is roughly
**$80–140/mo (5,200–9,100 AFN)** and sits inside the "Operational" pool. At the
200-user mix that pool is 19,510 AFN — comfortable. At **~50 users** the same
pool is ~4,900 AFN, i.e. **less than the fixed baseline alone**.

> **The model is cash-negative until roughly 60–100 paying users.** Treat the
> 200-user projection as the post-ramp steady state, not the early-stage reality;
> the early months are funded out of reserves/donors.

---

## 7. Validate before launch

- [ ] One full month of metered usage to confirm the per-modality unit costs
- [ ] HesabPay take rate confirmed and baked into COGS
- [ ] FX rate pinned to a date and re-baselined
- [ ] Container hosting metered/auto-paused, not silently bundled
- [ ] Free-tier daily cap enforced and observed in production
