-- 010_screening_and_kyc.sql
-- Sanctions screening + KYC fields, so the platform stops implying screening
-- happens when it does not, and can actually enforce a blocked tenant.

-- 1. ofac_screening_status no longer defaults to 'clear'. New tenants start
--    'unscreened'; existing rows that inherited the old 'clear' default were
--    never actually screened, so correct them honestly.
ALTER TABLE tenants ALTER COLUMN ofac_screening_status SET DEFAULT 'unscreened';
UPDATE tenants SET ofac_screening_status = 'unscreened' WHERE ofac_screening_status = 'clear';

-- 2. KYC fields on the tenant record. Collection + retention policy to be
--    defined by counsel; these columns only make collection possible.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(32) NOT NULL DEFAULT 'unverified';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kyc_document_type VARCHAR(32);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kyc_document_number VARCHAR(128);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_license_number VARCHAR(128);
