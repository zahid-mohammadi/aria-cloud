-- ====================================================================
-- ARIA CLOUD SERVICES (ariacloudservices.org)
-- Migration: 002_domains_email_and_storefront_deployments.sql
-- Purpose: Multi-Tenant Domains, Stalwart Mailboxes, and AI Storefront Deployments
-- ====================================================================

-- 1. Domains & Wildcard Subdomains (*.ariacloudservices.org + Custom Domains)
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    domain_name VARCHAR(255) UNIQUE NOT NULL,        -- e.g., 'kabul-saffron.ariacloudservices.org' or 'heratsaffron.af'
    is_system_subdomain BOOLEAN NOT NULL DEFAULT true,
    route53_zone_id VARCHAR(64),
    acm_cert_arn TEXT,
    ssl_status VARCHAR(32) NOT NULL DEFAULT 'ISSUED', -- 'ISSUED', 'PENDING_VALIDATION', 'FAILED'
    dkim_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'PENDING', 'FAILED'
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Stalwart Mail JMAP/IMAP/SMTP Accounts (mail.ariacloudservices.org)
CREATE TABLE IF NOT EXISTS email_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    email_address VARCHAR(255) UNIQUE NOT NULL,      -- e.g., 'sales@heratsaffron.af'
    password_hash TEXT NOT NULL,                     -- Salted SHA-512 ($6$...) for Stalwart Directory
    quota_mb INT NOT NULL DEFAULT 5120,
    used_mb INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. AI Website & Merchant Storefront Deployments
CREATE TABLE IF NOT EXISTS storefront_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
    version_number INT NOT NULL DEFAULT 1,
    store_title VARCHAR(255) NOT NULL,
    tagline TEXT,
    primary_locale VARCHAR(10) NOT NULL DEFAULT 'fa', -- 'fa' (Dari RTL), 'ps_AF' (Pashto RTL), 'en' (English LTR)
    theme_preset VARCHAR(32) NOT NULL DEFAULT 'emerald_bazaar', -- 'emerald_bazaar', 'lapis_royal', 'saffron_gold', 'modern_slate'
    generation_prompt TEXT NOT NULL,
    blueprint_json JSONB NOT NULL,                   -- Structured AI storefront schema (hero, products, checkout, WhatsApp CTA)
    s3_bucket VARCHAR(128) NOT NULL,
    s3_prefix VARCHAR(255) NOT NULL,                 -- e.g., 'tenants/kabul-saffron'
    cloudfront_invalidation_id VARCHAR(128),
    live_url TEXT NOT NULL,                          -- e.g., 'https://kabul-saffron.ariacloudservices.org'
    deployment_status VARCHAR(32) NOT NULL DEFAULT 'published', -- 'building', 'published', 'rolled_back', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_domains_tenant_id ON domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_tenant_id ON email_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_storefront_deployments_tenant_id ON storefront_deployments(tenant_id, created_at DESC);

-- Strict Row-Level Security (RLS) with FORCE Enforcement
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains FORCE ROW LEVEL SECURITY;

ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts FORCE ROW LEVEL SECURITY;

ALTER TABLE storefront_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE storefront_deployments FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_domains ON domains
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_email_accounts ON email_accounts
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_storefront_deployments ON storefront_deployments
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

GRANT SELECT, INSERT, UPDATE, DELETE ON domains, email_accounts, storefront_deployments TO aria_app_user;
