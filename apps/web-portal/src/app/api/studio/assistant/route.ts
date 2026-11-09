import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { withTenantContext } from '@aria-cloud/database';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

const bedrock = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || 'us-east-1',
});

const SYSTEM_AI_NAME = process.env.SYSTEM_AI_NAME || 'Aria Assistant';
const ORGANIZATION_MISSION =
  process.env.ORGANIZATION_MISSION || 'AriaCloud — Afghan Digital Enablement Initiative';
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const tenantId = session.tenantId;

    const body = await req.json();
    const { message, language = 'fa-AF', modelId = 'amazon.nova-micro-v1:0', voiceReply = false } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const startTime = Date.now();
    const systemPrompt =
      `You are ${SYSTEM_AI_NAME}, the multilingual business assistant for ${ORGANIZATION_MISSION} (${ROOT_DOMAIN}). ` +
      'Respond fluently in the requested language (Dari, Pashto, or English) and keep answers concise and practical.';

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
        bedrockJson.output?.message?.content?.[0]?.text || 'I am ready to help.';
      const totalTokens = Number(bedrockJson.usage?.totalTokens ?? 240);
      const ratePer1k = modelId === 'amazon.nova-lite-v1:0' ? 10 : 5;
      const llmCredits = Math.max(1, Math.ceil((totalTokens / 1000) * ratePer1k));
      const ttsCredits = voiceReply ? Math.ceil(replyText.length * 0.5) : 0;
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

      return NextResponse.json({
        mode: 'live',
        assistantName: SYSTEM_AI_NAME,
        replyText,
        totalTokens,
        creditsDeducted: totalCredits,
        latencyMs: Date.now() - startTime,
        modelId,
        language,
      });
    }

    const simulatedReplies: Record<string, string> = {
      'fa-AF': `سلام! من ${SYSTEM_AI_NAME} هستم. چگونه می‌توانم به کسب‌وکار شما کمک کنم؟`,
      'ps-AF': `سلام! زه ${SYSTEM_AI_NAME} یم. څنګه کولی شم ستاسو سوداګرۍ سره مرسته وکړم؟`,
      en: `Hello! I'm ${SYSTEM_AI_NAME}. How can I help your business today?`,
    };

    return NextResponse.json({
      mode: 'simulated',
      assistantName: SYSTEM_AI_NAME,
      replyText: simulatedReplies[language] || simulatedReplies.en,
      totalTokens: 0,
      creditsDeducted: 0,
      latencyMs: 210,
      modelId,
      language,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Assistant request failed.' }, { status: 500 });
  }
}
