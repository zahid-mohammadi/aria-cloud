# App Runner — Security Model for Third-Party Code

**Status:** design document. The app runner is wired and honest but **must not**
be pointed at production until this model is implemented.

## 1. What this is about

The app runner executes code the platform does not control: a tenant's own
application, built from their source or their container image. That makes it a
different trust problem from everything else in AriaCloud, where the platform
runs only its own code.

The core rule that everything below follows:

> **A tenant's application must be able to damage only itself — never the
> platform, another tenant, or the platform's data plane (PostgreSQL, billing,
> secrets).**

## 2. Trust boundary

```
[ Tenant app ]  --edge (WAF/CDN/API Gateway)-->  [ public internet ]
       |
       +-- isolated subnet (no route to platform data plane)
       +-- per-tenant IAM role (least privilege)
       +-- per-tenant secrets (KMS-wrapped, injected by platform)
```

A tenant app is assumed hostile: it may attempt to read the platform database,
hit internal endpoints, exfiltrate other tenants' data, or run crypto miners.

## 3. The model, requirement by requirement

### 3.1 Code provenance — what is allowed to run

| Rule | Detail |
| :--- | :--- |
| Private registry only | Images must come from the platform's **ECR** repository. No `public.ecr.aws` / Docker Hub passthrough. |
| Signed images | Every image is signed (Sigstore/Cosign) and the signature verified at deploy. |
| Scanned images | Every image is scanned (Trivy/Grype) on push; deploys block on HIGH/CRITICAL findings. |
| Allowlisted runtimes | Base images limited to a known set; no `FROM` arbitrary images. |
| Source-build path | If deploying from a git repo, the build runs in an **isolated CodeBuild** project with no egress to the platform — never on the app host. |

**Current gap:** `deployCustomApp` accepts arbitrary `gitRepoUrl` and any
`imageUri`, and defaults to `public.ecr.aws/docker/library/nginx:alpine`.

### 3.2 Secrets — what the app can receive

| Rule | Detail |
| :--- | :--- |
| No arbitrary env vars | The deploy API must reject free-form `environmentVariables`. |
| Platform-managed secrets | Secrets are stored in Secrets Manager/SSM under a **per-tenant KMS key**, referenced by name, and injected by the platform. |
| No platform credentials | Tenant apps never receive `DATABASE_URL`, AWS keys, or the platform's service role. |
| Per-tenant database | If a tenant app needs a database, it gets its **own** database/schema and a limited role — never access to the platform's RLS PostgreSQL. |

**Current gap:** `deployCustomApp` accepts arbitrary `environmentVariables`
and forwards them verbatim to App Runner.

### 3.3 Network isolation

| Rule | Detail |
| :--- | :--- |
| Isolated subnet | Tenant apps run in a subnet with **no route** to the platform VPC or data plane. |
| Egress deny-by-default | No outbound internet by default; per-tenant allowlist only where a business case exists. |
| Inbound via edge only | Public traffic reaches apps only through CloudFront/API Gateway + WAF, never directly. |
| No platform reachability | Apps cannot reach the control plane, billing service, or PostgreSQL. |

**Current gap:** App Runner defaults to public egress and there is no
network/VPC boundary configured at all.

### 3.4 IAM / least privilege

| Rule | Detail |
| :--- | :--- |
| Per-tenant role | Each tenant's apps assume a dedicated IAM role. |
| Narrow grants | Only: pull from their ECR repo, write to their CloudWatch log group. Nothing else. |
| Permission boundary | A permissions boundary caps the role so no escalation is possible. |
| Cross-tenant guard | Resource policies + condition keys scoped to the tenant id. |

**Current gap:** no IAM is defined for tenant apps (Terraform has zero IAM).

### 3.5 Resource limits & abuse

| Rule | Detail |
| :--- | :--- |
| Per-tenant caps | Max services, total vCPU/memory, egress GB, and request rate. |
| Kill switch | Platform can pause/suspend a tenant instantly (the pause API already exists). |
| Auto-suspend | Budget alarms + metering; suspend on overrun. |
| Edge rate limiting | WAF rules per tenant. |

**Current gap:** no caps beyond a single service's MinSize/MaxSize.

### 3.6 Runtime hardening

| Rule | Detail |
| :--- | :--- |
| Non-root | Run as non-root user. |
| Read-only rootfs | No writable image layers at runtime; ephemeral scratch only. |
| No privileged mode | No host mounts, no Docker socket, no `--privileged`. |

**Current gap:** these are the underlying compute platform's responsibility —
none are configured.

### 3.7 Observability & response

| Rule | Detail |
| :--- | :--- |
| Isolated logs | Per-tenant CloudWatch log groups; no cross-tenant log access. |
| Anomaly alerts | Egress attempts, privilege escalation, and mining/heavy-CPU patterns. |
| Incident response | Immediate pause + snapshot the image for forensics, then notify. |

**Current gap:** logs go wherever App Runner puts them, shared, un-scoped.

## 4. Runtime choice — a decision, not an implementation detail

| Option | Isolation | Effort |
| :--- | :--- | :--- |
| **App Runner** (current) | Weak — coarse, shared networking | Lowest |
| **ECS/Fargate** | Good — per-task IAM + security groups | Medium |
| **EKS/K8s** | Best — namespaces, NetworkPolicy, admission control | Highest |

**Recommendation:** move from App Runner to **ECS/Fargate** for production.
It gives per-task IAM, security groups (network isolation), and capacity
providers for scale-to-zero, without the operational weight of Kubernetes.

## 5. Decisions — resolved

1. **Deploy model: both.** Source-build (isolated CodeBuild) and image-push.
   Both converge on the same private ECR → Fargate path.
2. **Registry: private ECR**, one namespace per tenant (`aria/<tenantId>/<app>`),
   images signed (Sigstore/Cosign) and scanned (Trivy). No public images.
3. **Egress: NAT to the internet, but hard-block private CIDRs (10/8, 172.16/12,
   192.168/16) and the metadata endpoint (169.254.169.254).** This lets tenant
   apps reach external APIs while making the data plane unreachable and
   preventing credential theft. Per-tenant domain allowlist is a later
   refinement (AWS Network Firewall).
4. **Tenant databases: optional, on-demand, per-tenant.** A separate "tenant
   DB" Postgres (one database per tenant + least-privilege role), DSN injected
   as a KMS-wrapped secret. Never the platform's RLS database.
5. **Runtime: ECS on Fargate.** Per-task IAM + security groups + scale-to-zero.
   App Runner remains dev-only.

## 6. Target architecture

```
tenant source (git)  -- isolated CodeBuild -->  signed+scanned  -->  private ECR
tenant image (push)  ------------------------>  signed+scanned  -->  private ECR
                                                                        |
                                                                        v
                            ECS/Fargate task (per-tenant IAM + SG)
                            • non-root, read-only rootfs
                            • egress: NAT only, RFC1918 + IMDS blocked
                            • secrets injected (KMS), no arbitrary env
                                        |
                                        v
                            edge (WAF/CDN) --> internet
```

## 7. Acceptance checklist (before "production")

- [ ] Private ECR + image signing + scanning enforced
- [ ] `environmentVariables` removed from the deploy API
- [ ] Per-tenant IAM role + permission boundary
- [ ] Isolated subnet, no route to the data plane, egress deny-by-default
- [ ] Per-tenant caps + budget alarms + kill switch verified
- [ ] Non-root, read-only rootfs, no privileged mode
- [ ] Isolated logging + anomaly alerts
- [ ] Incident-response runbook (pause → snapshot → notify)
