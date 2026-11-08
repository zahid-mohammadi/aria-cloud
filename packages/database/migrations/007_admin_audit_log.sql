-- ====================================================================
-- ARIA CLOUD SERVICES (ariacloudservices.org)
-- Migration: 007_admin_audit_log.sql
-- Purpose: Append-only record of privileged actions.
--
--   The control plane can provision domains, issue mailboxes, spend AI
--   credits and grant wallet balance. Until now none of that left a trace.
--
--   This table is intentionally NOT tenant-scoped: an administrator acts
--   across tenants, and the question "who did this, when" must survive the
--   tenant being deleted — hence no cascading foreign keys and a nullable
--   target_tenant_id. Only the admin console writes to it; it is append-only
--   by grant (no UPDATE/DELETE).
-- ====================================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    action VARCHAR(64) NOT NULL,          -- e.g. 'wallet.credit_pack', 'domain.provision'
    target_tenant_id UUID,                -- tenant acted upon (not a FK: survivability)
    target_type VARCHAR(64),              -- 'tenant' | 'domain' | 'mailbox' | 'wallet' | ...
    target_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created
    ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor
    ON admin_audit_log(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_tenant
    ON admin_audit_log(target_tenant_id, created_at DESC);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aria_app_user') THEN
        -- Append-only: SELECT + INSERT, deliberately no UPDATE or DELETE.
        GRANT SELECT, INSERT ON admin_audit_log TO aria_app_user;
        REVOKE UPDATE, DELETE ON admin_audit_log FROM aria_app_user;
    END IF;
END
$$;
