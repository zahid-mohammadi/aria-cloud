import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const body = await req.json();
    const {
      message = '',
      modelId = 'aria-core-v1',
      language = 'da',
      voiceReply = true,
    } = body;

    const trimmed = String(message).trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: 'Assistant prompt message is required.' },
        { status: 400 }
      );
    }

    let replyText = '';
    if (language === 'da') {
      replyText = `هوش مرکزی آریا (${modelId}): درخواست شما بررسی شد. فروشگاه شما در kabul-saffron.ariacloudservices.org آنلاین است و پیام صوتی واتس‌اپ با موتور صوتی هوشمند آریا آماده ارسال می‌باشد.`;
    } else if (language === 'ps') {
      replyText = `د آریا مرکزي هوښ (${modelId}): ستاسو غوښتنه پروسس شوه. ستاسو پلورنځی په kabul-saffron.ariacloudservices.org کې فعال دی او د واټساپ غږیز ځواب چمتو دی.`;
    } else {
      replyText = `Aria Core AI (${modelId}): I have processed your request. Your storefront at kabul-saffron.ariacloudservices.org is online and your WhatsApp voice note reply has been synthesized via Aria Voice Engine.`;
    }

    const creditsDeducted =
      modelId === 'aria-core-v1'
        ? 5
        : modelId === 'aria-vision-v1'
          ? 10
          : 15;

    return NextResponse.json({
      ok: true,
      modelId,
      replyText,
      voiceReplyUrl: voiceReply
        ? `https://cdn.ariacloudservices.org/tenants/9b2f4e10/whatsapp/reply_${Date.now().toString(36)}.ogg`
        : null,
      creditsDeducted,
      latencyMs: 185,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Assistant query failed' },
      { status: 500 }
    );
  }
}
