import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text = '',
      voiceId = 'aria-walid-kabul',
      modelId = 'aria-voice-flash-v2.5',
      locale = 'da',
      tenantId = '9b2f4e10-8a7c-4d9a-b12e-6c4d8f201a99',
    } = body;

    const trimmed = String(text).trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: 'Script text is required for Aria Voice Engine synthesis.' },
        { status: 400 }
      );
    }

    const charCount = trimmed.length;
    const multiplier = modelId === 'aria-voice-flash-v2.5' ? 0.5 : 1.0;
    const creditsDeducted = Math.max(1, Math.ceil(charCount * multiplier));
    const estimatedDurationSec = Math.max(2, Math.round(charCount / 14));
    const jobId = `job_aria_voice_${Date.now().toString(36)}`;
    const cdnDomain = 'cdn.ariacloudservices.org';
    const edgeObjectKey = `tenants/${tenantId}/audio/${jobId}.mp3`;

    return NextResponse.json({
      ok: true,
      jobId,
      tenantId,
      modelId,
      voiceId,
      locale,
      charCount,
      creditsDeducted,
      estimatedDurationSec,
      edgeObjectKey,
      audioUrl: `https://${cdnDomain}/${edgeObjectKey}`,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Aria Voice Engine synthesis failed',
      },
      { status: 500 }
    );
  }
}
