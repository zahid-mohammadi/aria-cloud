-- ====================================================================
-- ARIA CLOUD SERVICES (ariacloudservices.org)
-- Migration: 008_payment_ledger_and_agent_auth.sql
-- Purpose: make settlement auditable and stop the cash endpoints being
--          anonymous.
--
--   Problems this fixes:
--   - every successful payment granted a flat 365 days regardless of what
--     was invoiced, and no invoice was ever marked paid
--   - `payment_transactions` was the only record: no double-entry, so
--     balances could not be reconciled against money actually received
--   - OTPs were stored in plaintext and compared with `!==`
--   - /cash/initiate and /cash/verify had no authentication at all; any
--     caller could pass any agent_id
--
-- ====================================================================

-- 1. Field-agent authentication: a bearer key, stored hashed, that the agent
--    app presents. agent_id is then derived from the key, never from the body.
ALTER TABLE billing_agents ADD COLUMN IF NOT EXISTS api_key_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_agents_api_key
    ON billing_agents(api_key_hash)
    WHERE api_key_hash IS NOT NULL;

-- 2. OTPs are a 6-digit challenge with a 10-minute TTL and 5 attempts, so a
--    peppered HMAC is sufficient — and it means a database dump contains no
--    usable OTP. The plaintext column is dropped entirely.
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS otp_hash TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payment_transactions DROP COLUMN IF EXISTS verification_otp;

-- 3. Append-only double-entry ledger.
--    account_code examples:
--      'platform:settlement:hesabpay'   (asset)
--      'platform:settlement:field_cash' (asset)
--      'platform:revenue:afn'           (income)
--      'tenant:<uuid>:wallet:afn'       (liability owed to the merchant)
--    Invariant: for every settlement the sum of debits equals the sum of
--    credits, and tenant wallet balance equals credits minus debits.
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,                       -- null for platform-only accounts
    account_code TEXT NOT NULL,
    direction VARCHAR(6) NOT NULL CHECK (direction IN ('debit', 'credit')),
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency CHAR(3) NOT NULL DEFAULT 'AFN',
    reference_type VARCHAR(32) NOT NULL,  -- 'payment' | 'invoice' | 'adjustment'
    reference_id TEXT NOT NULL,
    idempotency_key TEXT UNIQUE,          -- prevents double-posting on retry
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference
    ON ledger_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant
    ON ledger_entries(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account
    ON ledger_entries(account_code, created_at DESC);

-- 4. One settlement per invoice: the invoice row is the concurrency guard.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_transactions_invoice
    ON payment_transactions(invoice_id)
    WHERE invoice_id IS NOT NULL AND is_verified = true;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aria_app_user') THEN
        GRANT SELECT, INSERT ON ledger_entries TO aria_app_user;
        REVOKE UPDATE, DELETE ON ledger_entries FROM aria_app_user;
    END IF;
END
$$;
