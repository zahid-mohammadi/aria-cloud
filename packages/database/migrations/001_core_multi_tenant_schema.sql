-- ====================================================================
-- ARIA CLOUD SERVICES: CORE MULTI-TENANT DATABASE ENGINE
-- Migration: 001_core_multi_tenant_schema.sql
-- Target: Amazon RDS / Aurora Serverless v2 (PostgreSQL 16+)
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Dedicated least-privilege application role (does NOT have BYPASSRLS)
-- Managed Postgres (Supabase, RDS, etc.) may not allow CREATE ROLE for the
-- connecting user. That is fine: RLS below is FORCEd, so it applies to the
-- connecting role too. We only skip role creation rather than failing the
-- whole migration.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aria_app_user') THEN
        BEGIN
            CREATE ROLE aria_app_user NOLOGIN;
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'aria_app_user not created (insufficient privilege); RLS still applies to the connecting role.';
        END;
    END IF;
END
$$;

-- 1. Tenant Registry Table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(63) UNIQUE NOT NULL,           -- e.g., 'herat-saffron' -> herat-saffron.ariacloud.af
    custom_domain VARCHAR(255) UNIQUE,               -- e.g., 'heratsaffron.af'
    owner_phone VARCHAR(32) NOT NULL,                -- Primary WhatsApp contact (E.164 format)
    preferred_locale VARCHAR(10) DEFAULT 'fa',       -- 'fa' (Dari) or 'ps_AF' (Pashto)
    plan_tier VARCHAR(32) DEFAULT 'standard',        -- 'free', 'student', 'creator', 'basic', 'commerce', 'pro'
    account_status VARCHAR(32) DEFAULT 'active',     -- 'active', 'grace_period', 'suspended', 'archived'
    ofac_screening_status VARCHAR(32) DEFAULT 'clear', -- 'clear', 'flagged_review', 'blocked'
    ofac_screened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    subscription_end_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '14 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tenant Users & Consumer Accounts Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32) UNIQUE NOT NULL,        -- WhatsApp E.164 identifier
    email VARCHAR(255),
    role VARCHAR(32) DEFAULT 'member',               -- 'owner', 'admin', 'member', 'student', 'creator'
    preferred_locale VARCHAR(10) DEFAULT 'fa',       -- 'fa' (Dari), 'ps_AF' (Pashto), 'en'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Field Sales & Cash Collection Agents
CREATE TABLE IF NOT EXISTS billing_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32) UNIQUE NOT NULL,
    assigned_region VARCHAR(64) NOT NULL,            -- 'kabul_central', 'herat_city', 'mazar'
    max_cash_float_afn NUMERIC(12, 2) DEFAULT 50000.00,
    current_cash_held_afn NUMERIC(12, 2) DEFAULT 0.00,
    is_authorized BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Invoices & Billing Records
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number VARCHAR(64) UNIQUE NOT NULL,      -- e.g., 'INV-2026-0849'
    amount_afn NUMERIC(12, 2) NOT NULL,
    billing_period_months INT DEFAULT 12,
    status VARCHAR(32) DEFAULT 'unpaid',             -- 'unpaid', 'paid', 'voided', 'refunded'
    due_date DATE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    pdf_s3_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Payment Transactions (HesabPay & Cash Ledger)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id),
    amount_afn NUMERIC(12, 2) NOT NULL CHECK (amount_afn > 0),
    payment_channel VARCHAR(32) NOT NULL,            -- 'hesabpay', 'field_cash', 'voucher', 'hawala', 'bank_transfer'
    transaction_reference VARCHAR(255) UNIQUE,       -- HesabPay TxID or System Receipt Hash
    hesabpay_payer_mobile VARCHAR(32),
    agent_id UUID REFERENCES billing_agents(id),
    verification_otp VARCHAR(6),                     -- 6-digit challenge for cash dual-handshake
    otp_expires_at TIMESTAMP WITH TIME ZONE,         -- Strict 10-minute TTL window
    otp_attempt_count INT DEFAULT 0,                 -- Locked after 5 failed attempts
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Dynamic Products & Inventory Catalog
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title_en VARCHAR(255),
    title_da VARCHAR(255),                           -- Dari (Farsi)
    title_ps VARCHAR(255),                           -- Pashto
    description TEXT,
    price_afn NUMERIC(12, 2) NOT NULL,
    inventory_count INT DEFAULT 0,
    image_urls TEXT[],
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Dynamic Orders Engine
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    delivery_address TEXT,
    order_items JSONB NOT NULL,                      -- Schema: [{ product_id, title, qty, unit_price_afn }]
    total_amount_afn NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(32) DEFAULT 'cash_on_delivery',
    order_status VARCHAR(32) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Content Management: Blog Posts & Announcements
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    slug VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_markdown TEXT NOT NULL,
    featured_image_url TEXT,
    language VARCHAR(10) DEFAULT 'da',
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, slug)
);

-- 9. Omnichannel AI Assistant Configuration
CREATE TABLE IF NOT EXISTS agent_configs (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    business_context TEXT NOT NULL,
    whatsapp_phone_id VARCHAR(64),
    whatsapp_access_token VARCHAR(255),
    escalation_phone VARCHAR(32) NOT NULL,
    daily_token_limit INT DEFAULT 150000,
    is_ai_enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_agent_pending ON payment_transactions(agent_id, is_verified, otp_expires_at)
    WHERE payment_channel = 'field_cash' AND is_verified = false;
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tenant_id ON posts(tenant_id);

-- Row-Level Security (RLS) with FORCE Enforcement
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts FORCE ROW LEVEL SECURITY;

ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs FORCE ROW LEVEL SECURITY;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_users ON users
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_products ON products
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_orders ON orders
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_posts ON posts
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_agent_configs ON agent_configs
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_invoices ON invoices
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_payments ON payment_transactions
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aria_app_user;
