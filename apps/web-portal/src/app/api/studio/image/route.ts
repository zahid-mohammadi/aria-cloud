import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt = '',
      negativePrompt = 'blurry, low quality, watermark, distorted text',
      resolution = '1024x1024',
      stylePreset = 'Product Studio',
      tenantId = '9b2f4e10-8a7c-4d9a-b12e-6c4d8f201a99',
    } = body;

    const trimmed = String(prompt).trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: 'Image prompt is required for Aria Creative Studio.' },
        { status: 400 }
      );
    }

    const [width, height] = String(resolution)
      .split('x')
      .map((n) => parseInt(n, 10) || 1024);
    const creditsDeducted = 20;
    const jobId = `job_aria_studio_${Date.now().toString(36)}`;
    const cdnDomain = 'cdn.ariacloudservices.org';
    const edgeObjectKey = `tenants/${tenantId}/images/${jobId}.png`;

    return NextResponse.json({
      ok: true,
      jobId,
      tenantId,
      modelId: 'aria-creative-studio-v1',
      prompt: trimmed,
      negativePrompt,
      stylePreset,
      width,
      height,
      creditsDeducted,
      edgeObjectKey,
      imageUrl: `https://${cdnDomain}/${edgeObjectKey}`,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Aria Creative Studio generation failed',
      },
      { status: 500 }
    );
  }
}
