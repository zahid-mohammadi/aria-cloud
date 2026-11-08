-- ====================================================================
-- ARIA CLOUD: PILLAR VII MULTIMODAL SCHEMA MIGRATION
-- Migration: 003_ai_studio_system.sql
-- Module: Aria AI Studio & Daily Assistant (Text, Vision, Voice)
-- Target: Amazon RDS / Aurora Serverless v2 (PostgreSQL 16+)
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Daily & Monthly Multimodal AI Quotas
CREATE TABLE IF NOT EXISTS user_ai_quotas (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    daily_text_tokens_used INT NOT NULL DEFAULT 0,
    daily_text_tokens_limit INT NOT NULL DEFAULT 200000,   -- ~150k words/day
    monthly_images_generated INT NOT NULL DEFAULT 0,
    monthly_images_limit INT NOT NULL DEFAULT 25,          -- Monthly Nova Canvas renders
    monthly_tts_chars_used INT NOT NULL DEFAULT 0,         -- ElevenLabs characters consumed
    monthly_tts_chars_limit INT NOT NULL DEFAULT 50000,    -- Default monthly allowance
    quota_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Custom Voice Profiles & ElevenLabs Cloned Voices
CREATE TABLE IF NOT EXISTS ai_voice_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voice_name VARCHAR(128) NOT NULL,
    elevenlabs_voice_id VARCHAR(64) NOT NULL,             -- ElevenLabs Voice ID
    language_code VARCHAR(16) NOT NULL DEFAULT 'fa-AF',   -- 'fa-AF' (Dari), 'ps-AF' (Pashto), 'en-US'
    gender VARCHAR(16) NOT NULL,                          -- 'female', 'male'
    is_cloned BOOLEAN DEFAULT false,
    sample_audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Audio & Speech Cache (Prevents Wasting ElevenLabs Credits on Identical Text)
CREATE TABLE IF NOT EXISTS ai_tts_cache (
    content_hash VARCHAR(64) PRIMARY KEY,                 -- SHA-256 of (voice_id + model_id + trimmed_text)
    text_content TEXT NOT NULL,
    voice_id VARCHAR(64) NOT NULL,
    model_id VARCHAR(64) NOT NULL,
    characters_count INT NOT NULL,
    audio_s3_key TEXT NOT NULL,
    cdn_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Chat Sessions Master Table
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(16) NOT NULL DEFAULT 'web',           -- 'web', 'whatsapp', 'api'
    session_title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    preferred_voice_id VARCHAR(64),                       -- Default voice for audio replies
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Chat Messages Log
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL,                            -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    media_url TEXT,                                       -- Image, PDF, or Audio S3 URL
    media_type VARCHAR(32),                               -- 'image/png', 'audio/ogg', 'application/pdf'
    tokens_consumed INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Persistent Artifacts & Generation Gallery
CREATE TABLE IF NOT EXISTS ai_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generation_type VARCHAR(32) NOT NULL,                 -- 'canvas_image', 'elevenlabs_audio', 'document_ocr'
    prompt TEXT NOT NULL,
    output_payload TEXT NOT NULL,                         -- CDN URL or structured OCR JSON
    model_identifier VARCHAR(64) NOT NULL,
    units_consumed INT DEFAULT 0,                         -- Tokens, images, or characters count
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes for RLS & Subqueries
CREATE INDEX IF NOT EXISTS idx_user_ai_quotas_tenant_id ON user_ai_quotas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_voice_profiles_tenant_user ON ai_voice_profiles(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_tenant_user ON ai_chat_sessions(tenant_id, user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_generations_tenant_user ON ai_generations(tenant_id, user_id, created_at DESC);

-- Row-Level Security Policies (with FORCE Enforcement)
ALTER TABLE user_ai_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_quotas FORCE ROW LEVEL SECURITY;

ALTER TABLE ai_voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_voice_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_user_ai_quotas ON user_ai_quotas
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_ai_voice_profiles ON ai_voice_profiles
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_ai_chat_sessions ON ai_chat_sessions
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_ai_generations ON ai_generations
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY session_isolation_ai_chat_messages ON ai_chat_messages
    FOR ALL
    USING (
        session_id IN (
            SELECT id FROM ai_chat_sessions 
            WHERE tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
    )
    WITH CHECK (
        session_id IN (
            SELECT id FROM ai_chat_sessions 
            WHERE tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aria_app_user;
