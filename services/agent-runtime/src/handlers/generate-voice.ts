// File: services/agent-runtime/src/handlers/generate-voice.ts
// Runtime: Node.js 20.x | Memory: 1024MB | Timeout: 30s

import crypto from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({ region: process.env.AWS_REGION || "me-central-1" });
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10000,
});

// Curated default voices optimized for Dari & Pashto synthesis
export const DEFAULT_VOICES: Record<string, string> = {
  "da-female": "21m00Tcm4TlvDq8ikWAM", // Rachel / Multilingual v2
  "da-male": "ErXwobaYiN019PkySvjV",   // Antoni / Multilingual v2
  "ps-male": "VR6AewLTigWG4xSOukaG",   // Arnold / Multilingual v2
};

export interface VoiceGenerationInput {
  tenantId: string;
  userId: string;
  text: string;
  voiceId?: string;
  voiceKey?: "da-female" | "da-male" | "ps-male";
  modelId?: "eleven_multilingual_v2" | "eleven_turbo_v2_5";
}

export const handler = async (event: any) => {
  let body: VoiceGenerationInput;
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "INVALID_JSON_PAYLOAD" }),
    };
  }

  const {
    tenantId,
    userId,
    text,
    voiceId,
    voiceKey = "da-female",
    modelId = "eleven_multilingual_v2",
  } = body || {};

  const normalizedText = typeof text === "string" ? text.trim() : "";
  if (!normalizedText || !tenantId || !userId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing required parameters: text, tenantId, or userId." }),
    };
  }

  const selectedVoiceId = voiceId || DEFAULT_VOICES[voiceKey] || DEFAULT_VOICES["da-female"];
  const charCount = normalizedText.length;

  // 1. SHA-256 Cache Key (Prevents duplicate ElevenLabs credit consumption)
  const cacheHash = crypto
    .createHash("sha256")
    .update(`${selectedVoiceId}:${modelId}:${normalizedText}`)
    .digest("hex");

  const client = await dbPool.connect();
  let inTransaction = false;

  const rollbackSafe = async () => {
    if (inTransaction) {
      await client.query("ROLLBACK");
      inTransaction = false;
    }
  };

  try {
    await client.query("BEGIN");
    inTransaction = true;
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);

    // Check if synthesized audio already exists in global content-addressed cache
    const cacheRes = await client.query(
      "SELECT cdn_url FROM ai_tts_cache WHERE content_hash = $1",
      [cacheHash]
    );

    if (cacheRes.rows.length > 0) {
      await client.query("COMMIT");
      inTransaction = false;
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: true,
          audioUrl: cacheRes.rows[0].cdn_url,
          charactersConsumed: 0,
          cached: true,
        }),
      };
    }

    // 2. Ensure quota row exists and enforce user monthly character allowance
    await client.query(
      `INSERT INTO user_ai_quotas (user_id, tenant_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, tenantId]
    );

    const quotaRes = await client.query(
      `SELECT monthly_tts_chars_used, monthly_tts_chars_limit
       FROM user_ai_quotas
       WHERE user_id = $1 AND tenant_id = $2
       FOR UPDATE`,
      [userId, tenantId]
    );

    if (quotaRes.rows.length === 0) {
      await rollbackSafe();
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "TENANT_QUOTA_MISMATCH" }),
      };
    }

    const quota = quotaRes.rows[0];
    if (Number(quota.monthly_tts_chars_used) + charCount > Number(quota.monthly_tts_chars_limit)) {
      await rollbackSafe();
      return {
        statusCode: 429,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "QUOTA_EXCEEDED",
          message: "Monthly voice character limit reached. Upgrade via HesabPay or redeem an Aria Voucher.",
        }),
      };
    }

    // 3. Call ElevenLabs Text-to-Speech API
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text: normalizedText,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.06,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const errText = await elevenLabsResponse.text();
      throw new Error(`ElevenLabs API Error (${elevenLabsResponse.status}): ${errText}`);
    }

    const audioBuffer = Buffer.from(await elevenLabsResponse.arrayBuffer());

    // 4. Upload MP3 to S3 Bucket for CloudFront Edge Caching
    const s3Key = `ai-studio/voice/${tenantId}/${uuidv4()}.mp3`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.PUBLIC_ASSETS_BUCKET,
        Key: s3Key,
        Body: audioBuffer,
        ContentType: "audio/mpeg",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const cdnUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${s3Key}`;

    // 5. Save to TTS Cache (idempotent on concurrent synthesis) & Deduct User Credits
    await client.query(
      `INSERT INTO ai_tts_cache
       (content_hash, text_content, voice_id, model_id, characters_count, audio_s3_key, cdn_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (content_hash) DO NOTHING`,
      [cacheHash, normalizedText, selectedVoiceId, modelId, charCount, s3Key, cdnUrl]
    );

    await client.query(
      `UPDATE user_ai_quotas
       SET monthly_tts_chars_used = monthly_tts_chars_used + $1,
           updated_at = NOW()
       WHERE user_id = $2 AND tenant_id = $3`,
      [charCount, userId, tenantId]
    );

    await client.query(
      `INSERT INTO ai_generations
       (tenant_id, user_id, generation_type, prompt, output_payload, model_identifier, units_consumed)
       VALUES ($1, $2, 'elevenlabs_audio', $3, $4, $5, $6)`,
      [tenantId, userId, normalizedText.substring(0, 255), cdnUrl, modelId, charCount]
    );

    await client.query("COMMIT");
    inTransaction = false;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        audioUrl: cdnUrl,
        charactersConsumed: charCount,
        cached: false,
      }),
    };
  } catch (error: any) {
    await rollbackSafe();
    console.error("Voice Generation Failure:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "VOICE_GEN_FAILED", details: error.message }),
    };
  } finally {
    client.release();
  }
};
