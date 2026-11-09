import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { withTenantContext } from '@aria-cloud/database';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

const bedrock = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || 'us-east-1',
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const {
      prompt,
      negativePrompt,
      width = 1024,
      height = 1024,
      quality = 'standard',
      cfgScale = 7.0,
    } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json({ error: 'Prompt must be at least 3 characters long.' }, { status: 400 });
    }

    const normalizedQuality = quality === 'premium' ? 'premium' : 'standard';
    const creditCost = normalizedQuality === 'premium' ? 350 : 200;
    const startTime = Date.now();

    if (process.env.DATABASE_URL && process.env.AWS_ACCESS_KEY_ID) {
      let remainingCredits = 0;

      await withTenantContext(tenantId, async (client) => {
        await client.query(
          `INSERT INTO ai_credit_wallets (tenant_id) VALUES ($1)
           ON CONFLICT (tenant_id) DO NOTHING`,
          [tenantId]
        );

        const deductRes = await client.query<{ credit_balance: string }>(
          `UPDATE ai_credit_wallets
           SET credit_balance = credit_balance - $1,
               images_generated_mtd = images_generated_mtd + 1,
               updated_at = NOW()
           WHERE tenant_id = $2 AND credit_balance >= $1
           RETURNING credit_balance`,
          [creditCost, tenantId]
        );
        if (deductRes.rowCount === 0) {
          throw new Error('INSUFFICIENT_CREDITS');
        }
        remainingCredits = Number(deductRes.rows[0].credit_balance);
      });

      const bedrockResponse = await bedrock.send(
        new InvokeModelCommand({
          modelId: 'amazon.nova-canvas-v1:0',
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            taskType: 'TEXT_IMAGE',
            textToImageParams: {
              text: prompt,
              ...(negativePrompt ? { negativeText: negativePrompt } : {}),
            },
            imageGenerationConfig: {
              numberOfImages: 1,
              quality: normalizedQuality,
              width: Number(width),
              height: Number(height),
              cfgScale: Number(cfgScale),
              seed: Math.floor(Math.random() * 858993459),
            },
          }),
        })
      );

      const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
      const base64Image = responseBody.images?.[0];
      const latencyMs = Date.now() - startTime;

      await withTenantContext(tenantId, async (client) => {
        await client.query(
          `INSERT INTO ai_generation_logs
             (tenant_id, modality, provider, model_id, prompt_preview, units_consumed, credits_deducted, latency_ms)
           VALUES ($1, 'image', 'bedrock', 'amazon.nova-canvas-v1:0', $2, 1, $3, $4)`,
          [tenantId, prompt.substring(0, 250), creditCost, latencyMs]
        );
      });

      return NextResponse.json({
        mode: 'live',
        imageDataUrl: `data:image/png;base64,${base64Image}`,
        creditsDeducted: creditCost,
        remainingCredits,
        latencyMs,
        modelId: 'amazon.nova-canvas-v1:0',
      });
    }

    return NextResponse.json({
      mode: 'simulated',
      creditsDeducted: creditCost,
      latencyMs: 1420,
      modelId: 'amazon.nova-canvas-v1:0',
      width,
      height,
      quality: normalizedQuality,
    });
  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json(
        { error: 'Insufficient AI Studio credits. Please top up via HesabPay or cash.' },
        { status: 402 }
      );
    }
    return NextResponse.json({ error: error?.message || 'Failed to generate image.' }, { status: 500 });
  }
}
