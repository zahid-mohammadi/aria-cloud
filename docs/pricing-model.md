# Pricing Model — App Runner

**Status:** design document. The billing *machinery* exists; the app-runner
*metering and rates* do not yet (it needs infrastructure + a metering job).

## 1. Scope

This covers how the custom application runner (third-party apps) is priced, and
how that plugs into the billing system already built for plans and AI credits.

## 2. Current state

| Piece | Status |
| :--- | :--- |
| `custom_app_deployments` | records `allocated_vcpu` / `allocated_memory_gb`, but **no price** |
| `ledger_entries` (double-entry) | ✅ built — debit/credit, idempotent, balanced |
| `wallets` (AFN pul / USD cents) | ✅ built |
| `invoices` + plan subscription | ✅ built (invoice-linked settlement) |
| Metering aggregation | ❌ not built (needs CloudWatch metrics + cron) |
| Rate / unit price | ❌ not set |

## 3. Model — allowance + metered overage

1. **Plan allowance.** Each plan includes a number of "app units"
   (Starter = 1, Professional = 3, Enterprise = unlimited). An app unit is the
   standard shape already defaulted in the runner: **0.5 vCPU / 1 GB**.

2. **Metered usage, in AFN.** Four line items, summed monthly:
   - vCPU-hours
   - GB-hours (memory)
   - egress GB (usually the largest)
   - image storage GB-month (ECR)

3. **Scale-to-zero.** A paused or idle app accrues only storage. This is the
   headline cost-saver and matches the market (small merchants should not pay
   for a warm server 24/7).

## 4. Settlement flow

```
CloudWatch usage ──► monthly metering job ──► AFN amount
                                                  │
                                                  ▼
                          ledger: debit tenant:<id>:wallet:afn
                                  credit platform:revenue:afn
                                                  │
                                                  ▼
                          wallet balance < 0 / past due ──► suspend tenant
```

This reuses the existing `ledger_entries` + `wallets` machinery from the
HesabPay/cash billing work — no new money-handling code.

## 5. Decisions

| Item | Decision |
| :--- | :--- |
| Pricing model | allowance + 4 metered dimensions, scale-to-zero ✅ |
| Currency | AFN (minor units: pul) ✅ |
| Settlement | monthly metered job → ledger → wallet → suspend ✅ |
| **Rate per unit-hour** | ❌ TBD — set after Fargate/ECR/egress costs + margin are known |

## 6. Built vs. TBD

- ✅ ledger, wallets, invoice settlement, tenant suspend
- ❌ `app_pricing` / rate table (one small migration + a rate constant)
- ❌ metering job (reads CloudWatch, aggregates per tenant, posts ledger)
- ❌ budget alarms + auto-suspend wiring
- ❌ showing app-runner usage on the merchant invoice

## 7. Acceptance checklist (before charging real money)

- [ ] Rate table defined and versioned
- [ ] Metering job idempotent (one ledger entry per tenant per period)
- [ ] Overage visible on the invoice
- [ ] Negative balance → suspend, and suspend actually blocks new deploys
- [ ] A tenant can view their own usage before the invoice
