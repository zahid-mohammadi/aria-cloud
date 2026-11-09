import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { withTenantContext } from '@aria-cloud/database';
import { ApiError } from './errors';

const bedrock = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || 'us-east-1',
});

/** Ensures the tenant wallet row exists, then deducts if funds allow. */
async function deductCredits(
  tenantId: string,
  cost: number,
  metricSql: string,
  metricValue: number
): Promise<number> {
  let remaining = 0;
  await withTenantContext(tenantId, async (client) => {
    await client.query(
      `INSERT INTO ai_credit_wallets (tenant_id) VALUES ($1)
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId]
    );

    const res = await client.query<{ credit_balance: string }>(
      `UPDATE ai_credit_wallets
       SET credit_balance = credit_balance - $1, ${metricSql}
       WHERE tenant_id = $2 AND credit_balance >= $1
       RETURNING credit_balance`,
      [cost, tenantId, metricValue]
    );

    if (res.rowCount === 0) {
      throw new ApiError(402, 'INSUFFICIENT_CREDITS', 'Insufficient AI Studio credits.');
    }
    remaining = Number(res.rows[0].credit_balance);
  });
  return remaining;
}

async function refundCredits(tenantId: string, cost: number, metricSql: string, metricValue: number) {
  await withTenantContext(tenantId, async (client) => {
    await client.query(
      `UPDATE ai_credit_wallets SET credit_balance = credit_balance + $1, ${metricSql}
       WHERE tenant_id = $2`,
      [cost, tenantId, metricValue]
    );
  });
}

async function logGeneration(
  tenantId: string,
  modality: string,
  provider: string,
  modelId: string,
  prompt: string,
  units: number,
  credits: number,
  latencyMs: number
) {
  await withTenantContext(tenantId, async (client) => {
    await client.query(
      `INSERT INTO ai_generation_logs
         (tenant_id, modality, provider, model_id, prompt_preview, units_consumed, credits_deducted, latency_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tenantId, modality, provider, modelId, prompt.substring(0, 250), units, credits, latencyMs]
    );
  });
}

export interface VoiceInput {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

export async function generateVoice(tenantId: string, input: VoiceInput): Promise<unknown> {
  const { text } = input;
  const voiceId = input.voiceId || 'EXAVITQu4vr4xnSDxMaL';
  const modelId = input.modelId || 'eleven_multilingual_v2';
  const stability = input.stability ?? 0.5;
  const similarityBoost = input.similarityBoost ?? 0.75;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new ApiError(400, 'TEXT_REQUIRED', 'Text payload is required.');
  }
  if (text.length > 5000) {
    throw new ApiError(400, 'TEXT_TOO_LONG', 'Text exceeds 5,000 characters.');
  }

  const charCount = text.length;
  const creditCost = modelId === 'eleven_flash_v2_5' ? Math.max(1, Math.ceil(charCount * 0.5)) : charCount;
  const startTime = Date.now();

  if (!process.env.DATABASE_URL || !apiKey) {
    return {
      mode: 'simulated',
      charCount,
      creditsDeducted: creditCost,
      latencyMs: modelId === 'eleven_flash_v2_5' ? 78 : 420,
      modelId,
      voiceId,
    };
  }

  const remainingCredits = await deductCredits(
    tenantId,
    creditCost,
    'elevenlabs_chars_used_mtd = elevenlabs_chars_used_mtd + $3, updated_at = NOW()',
    charCount
  );

  const ttsResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: { stability, similarity_boost: similarityBoost, style: 0.0, use_speaker_boost: true },
      }),
    }
  );

  if (!ttsResponse.ok) {
    await refundCredits(
      tenantId,
      creditCost,
      'elevenlabs_chars_used_mtd = GREATEST(0, elevenlabs_chars_used_mtd - $3), updated_at = NOW()',
      charCount
    );
    const errText = await ttsResponse.text();
    throw new ApiError(502, 'UPSTREAM_ERROR', `ElevenLabs error (${ttsResponse.status}): ${errText}`);
  }

  const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
  const latencyMs = Date.now() - startTime;

  await logGeneration(tenantId, 'tts', 'elevenlabs', modelId, text, charCount, creditCost, latencyMs);

  return {
    mode: 'live',
    audioBase64: `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`,
    charCount,
    creditsDeducted: creditCost,
    remainingCredits,
    latencyMs,
    modelId,
    voiceId,
  };
}

export interface ImageInput {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  quality?: string;
  cfgScale?: number;
}

export async function generateImage(tenantId: string, input: ImageInput): Promise<unknown> {
  const { prompt, negativePrompt } = input;
  const width = input.width || 1024;
  const height = input.height || 1024;
  const quality = input.quality === 'premium' ? 'premium' : 'standard';
  const cfgScale = input.cfgScale ?? 7.0;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    throw new ApiError(400, 'PROMPT_REQUIRED', 'Prompt must be at least 3 characters long.');
  }

  const creditCost = quality === 'premium' ? 350 : 200;
  const startTime = Date.now();

  if (!process.env.DATABASE_URL || !process.env.AWS_ACCESS_KEY_ID) {
    return {
      mode: 'simulated',
      creditsDeducted: creditCost,
      latencyMs: 1420,
      modelId: 'amazon.nova-canvas-v1:0',
      width,
      height,
      quality,
    };
  }

  const remainingCredits = await deductCredits(
    tenantId,
    creditCost,
    'images_generated_mtd = images_generated_mtd + 1, updated_at = NOW()',
    1
  );

  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId: 'amazon.nova-canvas-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        taskType: 'TEXT_IMAGE',
        textToImageParams: { text: prompt, ...(negativePrompt ? { negativeText: negativePrompt } : {}) },
        imageGenerationConfig: {
          numberOfImages: 1,
          quality,
          width: Number(width),
          height: Number(height),
          cfgScale: Number(cfgScale),
          seed: Math.floor(Math.random() * 858993459),
        },
      }),
    })
  );

  const body = JSON.parse(new TextDecoder().decode(response.body));
  const base64Image = body.images?.[0];
  const latencyMs = Date.now() - startTime;

  await logGeneration(tenantId, 'image', 'bedrock', 'amazon.nova-canvas-v1:0', prompt, 1, creditCost, latencyMs);

  return {
    mode: 'live',
    imageDataUrl: `data:image/png;base64,${base64Image}`,
    creditsDeducted: creditCost,
    remainingCredits,
    latencyMs,
    modelId: 'amazon.nova-canvas-v1:0',
  };
}

async function synthesizeSpeech(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY!;
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs TTS error (${res.status}): ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export interface AssistantInput {
  message: string;
  language?: string;
  modelId?: string;
  voiceReply?: boolean;
}

export async function chatAssistant(tenantId: string, input: AssistantInput): Promise<unknown> {
  const { message } = input;
  const language = input.language || 'fa-AF';
  const modelId = input.modelId || 'amazon.nova-micro-v1:0';
  const voiceReply = Boolean(input.voiceReply);

  if (!message || typeof message !== 'string') {
    throw new ApiError(400, 'MESSAGE_REQUIRED', 'Message is required.');
  }

  const aiName = process.env.SYSTEM_AI_NAME || 'Aria Assistant';
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org';
  const systemPrompt =
    `You are ${aiName}, the multilingual business assistant for AriaCloud (${rootDomain}). ` +
    'Respond fluently in the requested language (Dari, Pashto, or English) and keep answers concise.';

  if (!process.env.DATABASE_URL || !process.env.AWS_ACCESS_KEY_ID || !modelId.startsWith('amazon.nova')) {
    const simulated: Record<string, string> = {
      'fa-AF': `سلام! من ${aiName} هستم. چگونه می‌توانم به کسب‌وکار شما کمک کنم؟`,
      'ps-AF': `سلام! زه ${aiName} یم. څنګه کولی شم ستاسو سوداګرۍ سره مرسته وکړم؟`,
      en: `Hello! I'm ${aiName}. How can I help your business today?`,
    };
    return {
      mode: 'simulated',
      assistantName: aiName,
      replyText: simulated[language] || simulated.en,
      totalTokens: 0,
      creditsDeducted: 0,
      latencyMs: 210,
      modelId,
      language,
    };
  }

  const startTime = Date.now();
  const res = await bedrock.send(
    new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        system: [{ text: systemPrompt }],
        messages: [{ role: 'user', content: [{ text: message }] }],
        inferenceConfig: { maxTokens: 500, temperature: 0.4 },
      }),
    })
  );

  const parsed = JSON.parse(new TextDecoder().decode(res.body));
  const replyText: string = parsed.output?.message?.content?.[0]?.text || 'I am ready to help.';
  const totalTokens = Number(parsed.usage?.totalTokens ?? 240);
  const ratePer1k = modelId === 'amazon.nova-lite-v1:0' ? 10 : 5;
  const llmCredits = Math.max(1, Math.ceil((totalTokens / 1000) * ratePer1k));
  let audioBase64: string | undefined;
  let ttsCredits = 0;
  if (voiceReply && process.env.ELEVENLABS_API_KEY) {
    try {
      const audioBuffer = await synthesizeSpeech(replyText);
      audioBase64 = `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`;
      ttsCredits = Math.ceil(replyText.length * 0.5);
    } catch (err) {
      console.warn('[assistant] voice reply synthesis failed:', err);
      ttsCredits = 0;
    }
  }
  const totalCredits = llmCredits + ttsCredits;

  await withTenantContext(tenantId, async (client) => {
    await client.query(
      `INSERT INTO ai_credit_wallets (tenant_id) VALUES ($1)
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId]
    );
    await client.query(
      `UPDATE ai_credit_wallets
       SET credit_balance = GREATEST(0, credit_balance - $1),
           bedrock_tokens_used_mtd = bedrock_tokens_used_mtd + $2,
           updated_at = NOW()
       WHERE tenant_id = $3`,
      [totalCredits, totalTokens, tenantId]
    );
  });

  return {
    mode: 'live',
    assistantName: aiName,
    replyText,
    audioBase64,
    totalTokens,
    creditsDeducted: totalCredits,
    latencyMs: Date.now() - startTime,
    modelId,
    language,
  };
}

export async function getAiStudioOverview(tenantId: string) {
  return withTenantContext(tenantId, async (client) => {
    const w = await client.query(
      `SELECT credit_balance, monthly_credit_quota, elevenlabs_chars_used_mtd,
              bedrock_tokens_used_mtd, images_generated_mtd
         FROM ai_credit_wallets WHERE tenant_id = $1 LIMIT 1`,
      [tenantId]
    );
    const history = await client.query(
      `SELECT modality, provider, model_id, prompt_preview, units_consumed,
              credits_deducted, latency_ms, created_at
         FROM ai_generation_logs WHERE tenant_id = $1
        ORDER BY created_at DESC LIMIT 25`,
      [tenantId]
    );
    const row = w.rows[0] ?? null;
    return {
      credits: Number(row?.credit_balance ?? 0),
      monthlyQuota: Number(row?.monthly_credit_quota ?? 0),
      usage: {
        elevenlabsChars: Number(row?.elevenlabs_chars_used_mtd ?? 0),
        bedrockTokens: Number(row?.bedrock_tokens_used_mtd ?? 0),
        images: Number(row?.images_generated_mtd ?? 0),
      },
      history: history.rows,
    };
  });
}

