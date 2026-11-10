-- ====================================================================
-- ARIA CLOUD SERVICES (ariacloudservices.org)
-- Migration: 011_job_queue.sql
-- Purpose: Persistent, transactional, multi-tenant async job queue for
--          long-running AI modalities (voice synthesis, Bedrock image
--          generation, multi-page site compilation) and background tasks.
-- ====================================================================

CREATE TABLE IF NOT EXISTS job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    job_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    error_message TEXT,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_job_queue_tenant ON job_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_queue_poll ON job_queue(status, created_at)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_job_queue_reap ON job_queue(status, locked_at)
    WHERE status = 'processing';

-- Row-Level Security
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_job_queue ON job_queue
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aria_app_user') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON job_queue TO aria_app_user;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aria_platform_admin') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON job_queue TO aria_platform_admin;
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
             WHERE schemaname = 'public'
               AND tablename = 'job_queue'
               AND policyname = 'platform_admin_access'
        ) THEN
            CREATE POLICY platform_admin_access ON job_queue
                FOR ALL TO aria_platform_admin USING (true) WITH CHECK (true);
        END IF;
    END IF;
END
$$;
