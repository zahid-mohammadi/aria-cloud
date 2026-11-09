# Custom Domain Connection

**Status:** design document. The provisioning *logic* and API exist; the DNS
lifecycle, certificate-validation polling, and registrar partnership do not.

## 1. What a custom domain can front

| Target | Backend | Connection (code today) |
| :--- | :--- | :--- |
| Storefront / website | S3 + CloudFront | ACM cert (DNS validation) + Route 53 records → CloudFront |
| Custom app | Fargate / App Runner | `AssociateCustomDomain` → cert + CNAME |
| Business email | Stalwart / SES | MX + SPF/DKIM/DMARC TXT records |

`provisionCustomDomain` already creates a Route 53 hosted zone, an ACM
certificate, an SES identity, and the MX/SPF/DKIM records, then returns the
nameservers.

## 2. The one decision: how DNS is connected

**A. Full delegation (recommended).** Customer points their registrar's
nameservers at the platform's Route 53 NS — once. The platform then owns
apex, `www`, subdomains, email records, renewals, and automatic SSL renewal.
For a merchant who barely knows what a CNAME is, this is the only sane option
and the honest meaning of "sovereign cloud."

**B. CNAME (customer keeps DNS).** Works for `www` and subdomains, but **not
the apex** (`example.af` needs an A/ALIAS record). More moving parts for the
customer, more support tickets for you.

→ **Decision: full NS delegation as the default, CNAME as an escape hatch.**

## 3. Customer flow (recommended)

1. Customer enters their domain in the console (`/api/domains`, wired).
2. Platform provisions Route 53 + ACM + email records; returns 4 nameservers.
3. Customer pastes the nameservers at their registrar (one-time).
4. ACM validates and issues automatically; site/app/email go live; auto-renew.

## 4. The `.af` dependency (be honest about this)

Connecting a domain the customer **already owns** is covered by the code above.
Registering a **brand-new `.af` domain** requires being an Afghanistan
registry (MCIT) registrar or partnering with one. That is a separate
integration — not Terraform, not DNS code.

## 5. Built vs. TBD

- ✅ `provisionCustomDomain` / `provisionMerchantSubdomain` / `provisionStalwartMailbox`
- ✅ `/api/domains` route (merchant) + `/api/domains` (admin)
- ✅ `domains` table (status, cert ARN, auto_renew)
- ❌ DNS record lifecycle on the edge (create/update/delete)
- ❌ ACM certificate-validation polling → auto-issue confirmation
- ❌ registrar partnership for new `.af` purchases
- ❌ deprovision / cleanup when a tenant removes a domain

## 6. Acceptance checklist (before "custom domains" is a selling point)

- [ ] NS delegation flow works end-to-end with one registrar
- [ ] ACM issues and the site/app/email go live without manual steps
- [ ] Email deliverability verified (SPF/DKIM/DMARC pass)
- [ ] Auto-renew of certs and domains
- [ ] Deprovisioning removes records/certs without orphaning resources
