// File: services/agent-runtime/src/handlers/generate-image.ts
// Runtime: Node.js 20.x | Memory: 1024MB | Timeout: 30s

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

const bedrockCanvas = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || "us-east-1",
});
const s3 = new S3Client({ region: process.env.AWS_REGION || "me-central-1" });
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10000,
});

export interface ImageGenerationInput {
  tenantId: string;
  userId: string;
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16";
}

export const handler = async (event: any) => {
  let body: ImageGenerationInput;
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "INVALID_JSON_PAYLOAD" }),
    };
  }

  const { tenantId, userId, prompt, aspectRatio = "1:1" } = body || {};
  const trimmedPrompt = typeof prompt === "string" ? prompt.trim() : "";

  if (!tenantId || !userId || !trimmedPrompt) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing required parameters: tenantId, userId, or prompt." }),
    };
  }

  const dimensions =
    aspectRatio === "16:9"
      ? { width: 1280, height: 720 }
      : aspectRatio === "9:16"
        ? { width: 720, height: 1280 }
        : { width: 1024, height: 1024 };

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

    await client.query(
      `INSERT INTO user_ai_quotas (user_id, tenant_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, tenantId]
    );

    const quotaRes = await client.query(
      `SELECT monthly_images_generated, monthly_images_limit
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
    if (Number(quota.monthly_images_generated) + 1 > Number(quota.monthly_images_limit)) {
      await rollbackSafe();
      return {
        statusCode: 429,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "IMAGE_QUOTA_EXCEEDED",
          message: "Monthly Nova Canvas image limit reached. Upgrade via HesabPay or redeem an Aria Voucher.",
        }),
      };
    }

    const modelId = process.env.NOVA_CANVAS_MODEL_ID || "amazon.nova-canvas-v1:0";
    const response = await bedrockCanvas.send(
      new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          taskType: "TEXT_IMAGE",
          textToImageParams: {
            text: trimmedPrompt,
          },
          imageGenerationConfig: {
            numberOfImages: 1,
            quality: "standard",
            width: dimensions.width,
            height: dimensions.height,
            cfgScale: 7.0,
          },
        }),
      })
    );

    const parsed = JSON.parse(new TextDecoder().decode(response.body));
    const base64Image = parsed?.images?.[0];
    if (!base64Image) {
      throw new Error("Nova Canvas returned no image payload.");
    }

    const imageBuffer = Buffer.from(base64Image, "base64");
    const s3Key = `ai-studio/images/${tenantId}/${uuidv4()}.png`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.PUBLIC_ASSETS_BUCKET,
        Key: s3Key,
        Body: imageBuffer,
        ContentType: "image/png",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const imageUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${s3Key}`;

    await client.query(
      `UPDATE user_ai_quotas
       SET monthly_images_generated = monthly_images_generated + 1,
           updated_at = NOW()
       WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    await client.query(
      `INSERT INTO ai_generations
       (tenant_id, user_id, generation_type, prompt, output_payload, model_identifier, units_consumed)
       VALUES ($1, $2, 'canvas_image', $3, $4, $5, 1)`,
      [tenantId, userId, trimmedPrompt.substring(0, 255), imageUrl, modelId]
    );

    await client.query("COMMIT");
    inTransaction = false;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        imageUrl,
      }),
    };
  } catch (error: any) {
    await rollbackSafe();
    console.error("Image Generation Failure:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "IMAGE_GEN_FAILED", details: error.message }),
    };
  } finally {
    client.release();
  }
};
