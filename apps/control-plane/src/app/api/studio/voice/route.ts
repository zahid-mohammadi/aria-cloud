import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@aria-cloud/database';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId = '00000000-0000-0000-0000-000000000001',
      text,
      voiceId = 'EXAVITQu4vr4xnSDxMaL',
      modelId = 'eleven_multilingual_v2',
      stability = 0.5,
      similarityBoost = 0.75,
    } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text payload is required.' }, { status: 400 });
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: 'Text exceeds 5,000 characters.' }, { status: 400 });
    }

    const charCount = text.length;
    const creditCost =
      modelId === 'eleven_flash_v2_5' ? Math.max(1, Math.ceil(charCount * 0.5)) : charCount;

    const startTime = Date.now();

    // If DATABASE_URL and ELEVENLABS_API_KEY are configured, execute live production flow with RLS
    if (process.env.DATABASE_URL && ELEVENLABS_API_KEY) {
      let remainingCredits = 0;

      await withTenantContext(tenantId, async (client) => {
        const deductRes = await client.query<{ credit_balance: string }>(
          `UPDATE ai_credit_wallets
           SET credit_balance = credit_balance - $1,
               elevenlabs_chars_used_mtd = elevenlabs_chars_used_mtd + $2,
               updated_at = NOW()
           WHERE tenant_id = $3 AND credit_balance >= $1
           RETURNING credit_balance`,
          [creditCost, charCount, tenantId]
        );
        if (deductRes.rowCount === 0) {
          throw new Error('INSUFFICIENT_CREDITS');
        }
        remainingCredits = Number(deductRes.rows[0].credit_balance);
      });

      const ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability,
              similarity_boost: similarityBoost,
              style: 0.0,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!ttsResponse.ok) {
        // Refund credits on upstream ElevenLabs failure
        await withTenantContext(tenantId, async (client) => {
          await client.query(
            `UPDATE ai_credit_wallets
             SET credit_balance = credit_balance + $1,
                 elevenlabs_chars_used_mtd = GREATEST(0, elevenlabs_chars_used_mtd - $2),
                 updated_at = NOW()
             WHERE tenant_id = $3`,
            [creditCost, charCount, tenantId]
          );
        });
        const errText = await ttsResponse.text();
        return NextResponse.json(
          { error: `ElevenLabs upstream error (${ttsResponse.status}): ${errText}` },
          { status: 502 }
        );
      }

      const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
      const latencyMs = Date.now() - startTime;

      await withTenantContext(tenantId, async (client) => {
        await client.query(
          `INSERT INTO ai_generation_logs
             (tenant_id, modality, provider, model_id, prompt_preview, units_consumed, credits_deducted, latency_ms)
           VALUES ($1, 'tts', 'elevenlabs', $2, $3, $4, $5, $6)`,
          [tenantId, modelId, text.substring(0, 250), charCount, creditCost, latencyMs]
        );
      });

      return NextResponse.json({
        mode: 'live',
        audioBase64: `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`,
        charCount,
        creditsDeducted: creditCost,
        remainingCredits,
        latencyMs,
        modelId,
        voiceId,
      });
    }

    // Local development simulation mode (when ELEVENLABS_API_KEY is not yet set)
    return NextResponse.json({
      mode: 'simulated',
      charCount,
      creditsDeducted: creditCost,
      latencyMs: modelId === 'eleven_flash_v2_5' ? 78 : 420,
      modelId,
      voiceId,
      message: 'Synthesized in local preview mode. Set ELEVENLABS_API_KEY in .env for live 44.1kHz MP3 streaming.',
    });
  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json(
        { error: 'Insufficient AI Studio credits. Please top up via HesabPay or Hawala.' },
        { status: 402 }
      );
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to synthesize voice.' },
      { status: 500 }
    );
  }
}
