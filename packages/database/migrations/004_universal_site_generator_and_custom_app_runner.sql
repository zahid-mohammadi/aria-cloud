-- ====================================================================
-- ARIA CLOUD SERVICES (ariacloudservices.org)
-- Migration: 004_universal_site_generator_and_custom_app_runner.sql
-- Purpose: Universal Multi-Sector AI Site Schemas & Containerized Custom App Deployments
-- ====================================================================

-- 1. Universal Multi-Sector Dynamic Site Schemas (clinics, schools, logistics, export, retail, services)
CREATE TABLE IF NOT EXISTS tenant_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    industry_type VARCHAR(64) NOT NULL, -- 'clinic', 'school', 'logistics', 'export', 'retail', 'services'
    site_schema JSONB NOT NULL,         -- Parsed layout schema (sections, copy, staff, pricing, hours, WhatsApp CTA, PWA)
    current_version INT DEFAULT 1,
    s3_path VARCHAR(255) NOT NULL,      -- e.g., 's3://ariacloud-tenants/{tenant_id}/public/index.html'
    custom_domain VARCHAR(255),         -- Optional branded custom domain (e.g. 'kabul-diagnostic.af')
    is_live BOOLEAN DEFAULT true,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Custom Application Dynamic Container Deployments (Node.js, Python, Laravel, Docker)
CREATE TABLE IF NOT EXISTS custom_app_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    app_name VARCHAR(128) NOT NULL,
    framework VARCHAR(64) NOT NULL,     -- 'nodejs', 'python', 'laravel', 'docker'
    git_repo_url TEXT,
    app_runner_service_arn VARCHAR(255),
    custom_domain VARCHAR(255),
    status VARCHAR(32) DEFAULT 'deploying', -- 'deploying', 'running', 'paused', 'failed'
    allocated_memory_gb NUMERIC(3, 1) DEFAULT 1.0,
    allocated_vcpu NUMERIC(3, 1) DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_sites_tenant_id ON tenant_sites(tenant_id, is_live);
CREATE INDEX IF NOT EXISTS idx_tenant_sites_industry ON tenant_sites(industry_type);
CREATE INDEX IF NOT EXISTS idx_custom_app_deployments_tenant_id ON custom_app_deployments(tenant_id, status);

-- Strict Multi-Tenant Row-Level Security (RLS) with FORCE Enforcement
ALTER TABLE tenant_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_sites FORCE ROW LEVEL SECURITY;

ALTER TABLE custom_app_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_app_deployments FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_tenant_sites ON tenant_sites
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_custom_app_deployments ON custom_app_deployments
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aria_app_user') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_sites, custom_app_deployments TO aria_app_user;
    END IF;
END $$;
