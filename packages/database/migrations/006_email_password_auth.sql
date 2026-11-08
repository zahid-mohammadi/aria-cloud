-- ====================================================================
-- ARIA CLOUD SERVICES (ariacloudservices.org)
-- Migration: 006_email_password_auth.sql
-- Purpose: Email + password authentication for merchants and platform admins.
--
-- Design note — why `user_credentials` exists instead of columns on `users`:
--   `users` has FORCE ROW LEVEL SECURITY and its policy requires
--   app.current_tenant_id. Login necessarily happens *before* we know which
--   tenant the caller belongs to, so a `SELECT ... FROM users WHERE email = $1`
--   would return zero rows. The login lookup therefore lives in a deliberately
--   small, non-tenant-scoped table that holds only the email address, the
--   password hash and lockout counters — no names, no phones, no business data.
--   It must never be exposed through an API; only packages/auth reads it.
--
--   `sessions` and `auth_tokens` are the same story: looked up by an
--   unguessable hash before a tenant is known.
--
-- ====================================================================

-- Email-first accounts: a merchant may not have a phone number on file.
ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;
ALTER TABLE tenants ALTER COLUMN owner_phone DROP NOT NULL;

-- 1. Login material (narrow, non-RLS by necessity — see note above)
CREATE TABLE IF NOT EXISTS user_credentials (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    is_platform_admin BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness: Alice@x.com and alice@x.com are the same account.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_credentials_email
    ON user_credentials (lower(email));

-- 2. Server-side sessions. The cookie carries a 256-bit random token; only its
--    SHA-256 hash is stored, so a database dump cannot be replayed as a login.
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    ip_address VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 3. Single-use tokens for email verification and password reset
CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('email_verify', 'password_reset')),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_purpose
    ON auth_tokens(user_id, purpose);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aria_app_user') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE
            ON user_credentials, sessions, auth_tokens
            TO aria_app_user;
    END IF;
END
$$;
