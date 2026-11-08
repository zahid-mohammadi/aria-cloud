import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { withTenantContext } from '@aria-cloud/database';

const bedrock = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || 'us-east-1',
});

const SYSTEM_AI_NAME = process.env.SYSTEM_AI_NAME || 'Aria Assistant';
const ORGANIZATION_MISSION =
  process.env.ORGANIZATION_MISSION || 'AriaCloud — Afghan Digital Enablement Initiative';
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const body = await req.json();
    const {
      message,
      language = 'fa-AF',
      modelId = 'amazon.nova-micro-v1:0',
      voiceReply = false,
    } = body;

    const tenantId = auth.session.tenantId;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const startTime = Date.now();
    const systemPrompt =
      `You are ${SYSTEM_AI_NAME}, the official daily AI business assistant for ${ORGANIZATION_MISSION} (${ROOT_DOMAIN}). ` +
      'Respond fluently in the language requested by the user (Dari, Pashto, or English). ' +
      'Be concise, practical, and accurate with AFN/USD financial calculations, Stalwart email management (mail.ariacloudservices.org), and merchant storefronts (*.ariacloudservices.org).';

    if (process.env.DATABASE_URL && process.env.AWS_ACCESS_KEY_ID && modelId.startsWith('amazon.nova')) {
      const bedrockRes = await bedrock.send(
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

      const bedrockJson = JSON.parse(new TextDecoder().decode(bedrockRes.body));
      const replyText: string =
        bedrockJson.output?.message?.content?.[0]?.text ||
        'من آماده همکاری با شما هستم.';
      const totalTokens = Number(bedrockJson.usage?.totalTokens ?? 240);
      const ratePer1k = modelId === 'amazon.nova-lite-v1:0' ? 10 : 5;
      const llmCredits = Math.max(1, Math.ceil((totalTokens / 1000) * ratePer1k));
      const ttsCredits = voiceReply ? Math.ceil(replyText.length * 0.5) : 0;
      const totalCredits = llmCredits + ttsCredits;

      await withTenantContext(tenantId, async (client) => {
        // Ensure the wallet row exists before decrementing it, so that a
        // missing row cannot silently swallow the update.
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

      return NextResponse.json({
        mode: 'live',
        assistantName: SYSTEM_AI_NAME,
        mission: ORGANIZATION_MISSION,
        replyText,
        totalTokens,
        creditsDeducted: totalCredits,
        latencyMs: Date.now() - startTime,
        modelId,
        language,
      });
    }

    const simulatedReplies: Record<string, string> = {
      'fa-AF': `سلام! من ${SYSTEM_AI_NAME} (${ORGANIZATION_MISSION}) هستم. کنسول شما در app.${ROOT_DOMAIN}، درگاه API در api.${ROOT_DOMAIN} و سرور ایمیل در mail.${ROOT_DOMAIN} فعال است. چگونه می‌توانم کمک کنم؟`,
      'ps-AF': `سلام! زه ${SYSTEM_AI_NAME} (${ORGANIZATION_MISSION}) یم. ستاسو کنسول په app.${ROOT_DOMAIN} او بریښنالیک په mail.${ROOT_DOMAIN} کې فعال دي. زه څنګه مرسته کولی شم؟`,
      en: `Hello! ${SYSTEM_AI_NAME} (${ORGANIZATION_MISSION}) is online across ${ROOT_DOMAIN}, app.${ROOT_DOMAIN}, api.${ROOT_DOMAIN}, and mail.${ROOT_DOMAIN}. How can I help your business today?`,
    };

    const replyText = simulatedReplies[language] || simulatedReplies['en'];
    const totalTokens = 195;
    const ratePer1k = modelId === 'amazon.nova-lite-v1:0' ? 10 : modelId.startsWith('meta.') ? 15 : 5;
    const llmCredits = Math.max(1, Math.ceil((totalTokens / 1000) * ratePer1k));
    const ttsCredits = voiceReply ? Math.ceil(replyText.length * 0.5) : 0;

    return NextResponse.json({
      mode: 'simulated',
      assistantName: SYSTEM_AI_NAME,
      mission: ORGANIZATION_MISSION,
      replyText,
      totalTokens,
      creditsDeducted: llmCredits + ttsCredits,
      latencyMs: 210,
      modelId,
      language,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Assistant request failed.' },
      { status: 500 }
    );
  }
}
