-- ====================================================================
-- ARIA CLOUD SERVICES (ariacloudservices.org)
-- Migration: 009_runtime_roles_and_rate_limits.sql
-- Purpose: make Row-Level Security actually apply at runtime, give the
--          platform admin console an explicit (audited, policy-based) path
--          across tenants, and add a shared rate-limit store.
--
--   Problems this fixes:
--   - The application connected as whatever DATABASE_URL said — locally the
--     `postgres` superuser — and superusers skip RLS entirely. FORCE ROW LEVEL
--     SECURITY only constrains table owners, not superusers or BYPASSRLS
--     roles. Tenant isolation was therefore enforced only by application code.
--   - The admin console's cross-tenant reads silently depended on that bypass.
--   - Rate limiting was an in-memory Map, i.e. per process / per Lambda
--     instance, so it did not limit anything in a scaled deployment.
--
--   Runtime model (see packages/database/src/index.ts):
--   - Every pooled connection runs `SET ROLE aria_app_user` (merchant portal,
--     services) or `SET ROLE aria_platform_admin` (control plane only), and
--     refuses to proceed if the effective role is a superuser or BYPASSRLS.
--   - The login user in DATABASE_URL must be a member of those roles:
--       GRANT aria_app_user, aria_platform_admin TO <login_user>;
--     (a superuser login can SET ROLE to anything, so local Docker just works).
--
-- ====================================================================

-- 1. Roles. NOLOGIN group roles; real login users are granted membership by
--    the operator so that no password ever lives in a migration.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aria_app_user') THEN
        BEGIN
            CREATE ROLE aria_app_user NOLOGIN NOSUPERUSER NOBYPASSRLS;
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'aria_app_user not created (insufficient privilege).';
        END;
    END IF;

    -- Deliberately NOT BYPASSRLS: managed Postgres (RDS, Aurora, Supabase)
    -- usually cannot grant it, and an explicit policy (below) is easier to
    -- audit than an attribute that silently disables every policy.
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aria_platform_admin') THEN
        BEGIN
            CREATE ROLE aria_platform_admin NOLOGIN NOSUPERUSER NOBYPASSRLS;
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'aria_platform_admin not created (insufficient privilege).';
        END;
    END IF;
END
$$;

-- 2. Shared rate-limit store (fixed window). Not tenant data — keyed by
--    strings such as 'login:ip:203.0.113.9' or 'studio:user:<uuid>'.
CREATE TABLE IF NOT EXISTS rate_limits (
    bucket_key   VARCHAR(255) PRIMARY KEY,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    hits         INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- 3. Grants + the admin cross-tenant policy.
DO $$
DECLARE
    tbl TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aria_app_user') THEN
        GRANT USAGE ON SCHEMA public TO aria_app_user;
        GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO aria_app_user;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aria_platform_admin') THEN
        GRANT USAGE ON SCHEMA public TO aria_platform_admin;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aria_platform_admin;

        -- Append-only tables stay append-only for administrators too.
        REVOKE UPDATE, DELETE ON admin_audit_log, ledger_entries FROM aria_platform_admin;
        -- Migration bookkeeping is the migration runner's business only.
        IF to_regclass('public.schema_migrations') IS NOT NULL THEN
            REVOKE ALL ON schema_migrations FROM aria_platform_admin;
        END IF;

        -- Policies are permissive and OR'ed, so this adds an explicit,
        -- role-scoped path for the admin console without weakening the
        -- tenant_isolation_* policies that apply to aria_app_user.
        FOR tbl IN
            SELECT c.relname
              FROM pg_class c
              JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public'
               AND c.relkind = 'r'
               AND c.relrowsecurity
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public'
                   AND tablename = tbl
                   AND policyname = 'platform_admin_access'
            ) THEN
                EXECUTE format(
                    'CREATE POLICY platform_admin_access ON %I FOR ALL TO aria_platform_admin USING (true) WITH CHECK (true)',
                    tbl
                );
            END IF;
        END LOOP;
    END IF;
END
$$;
