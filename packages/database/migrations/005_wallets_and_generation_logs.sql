-- ====================================================================
-- ARIA CLOUD SERVICES (ariacloudservices.org)
-- Migration: 005_wallets_and_generation_logs.sql
-- Purpose: Define the wallet + AI generation log tables that the
--          application code already reads and writes:
--            - wallets               (getTenantOverview)
--            - ai_credit_wallets     (getTenantOverview, chat, voice, wallet routes)
--            - ai_generation_logs    (control-plane voice route)
--
-- Before this migration those three tables did not exist anywhere in
-- 001-004, so every "live" (DATABASE_URL set) path failed on its first
-- query. 001-004 are left untouched; this migration is additive.
-- ====================================================================

-- The application role created in 001 could never reach its tables because
-- schema USAGE was never granted. Fix that here.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aria_app_user') THEN
        GRANT USAGE ON SCHEMA public TO aria_app_user;
    END IF;
END
$$;

-- 1. Dual-currency wallet (AFN stored in pul, USD in cents — integer minor units)
CREATE TABLE IF NOT EXISTS wallets (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    usd_balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (usd_balance_cents >= 0),
    afn_balance_pul   BIGINT NOT NULL DEFAULT 0 CHECK (afn_balance_pul >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. AI Studio credit wallet & month-to-date usage meter
CREATE TABLE IF NOT EXISTS ai_credit_wallets (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    credit_balance BIGINT NOT NULL DEFAULT 0 CHECK (credit_balance >= 0),
    monthly_credit_quota BIGINT NOT NULL DEFAULT 25000,
    elevenlabs_chars_used_mtd BIGINT NOT NULL DEFAULT 0,
    bedrock_tokens_used_mtd BIGINT NOT NULL DEFAULT 0,
    images_generated_mtd BIGINT NOT NULL DEFAULT 0,
    period_start DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Immutable append-only AI generation audit log
CREATE TABLE IF NOT EXISTS ai_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    modality VARCHAR(32) NOT NULL,          -- 'tts', 'image', 'text'
    provider VARCHAR(64) NOT NULL,          -- internal vendor identifier
    model_id VARCHAR(128) NOT NULL,
    prompt_preview VARCHAR(250),
    units_consumed BIGINT NOT NULL DEFAULT 0,
    credits_deducted BIGINT NOT NULL DEFAULT 0,
    latency_ms INT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_tenant_created
    ON ai_generation_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_credit_wallets_period
    ON ai_credit_wallets(period_start);

-- Row-Level Security with FORCE enforcement (same pattern as 001-004)
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets FORCE ROW LEVEL SECURITY;

ALTER TABLE ai_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_credit_wallets FORCE ROW LEVEL SECURITY;

ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_wallets ON wallets
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_ai_credit_wallets ON ai_credit_wallets
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_ai_generation_logs ON ai_generation_logs
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- Backfill one wallet row per existing tenant so legacy rows work immediately.
-- New tenants get their rows created by the tenant provisioning path
-- (see ensureWalletRows in packages/database/src/index.ts).
INSERT INTO wallets (tenant_id)
SELECT id FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO ai_credit_wallets (tenant_id)
SELECT id FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aria_app_user') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE
            ON wallets, ai_credit_wallets, ai_generation_logs
            TO aria_app_user;
    END IF;
END
$$;
