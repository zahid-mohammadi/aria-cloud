// File: services/agent-runtime/src/handlers/whatsapp-assistant.ts
// Runtime: Node.js 20.x | Memory: 1024MB | Timeout: 30s

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { handler as generateVoice } from "./generate-voice";
import { handler as generateImage } from "./generate-image";

const bedrock = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || "me-central-1",
});

export interface WhatsAppUserContext {
  tenantId: string;
  userId: string;
  preferredVoiceKey?: "da-female" | "da-male" | "ps-male";
}

export async function handleWhatsAppMessage(
  incomingMessage: any,
  userContext: WhatsAppUserContext
) {
  const { from: userPhone, type: msgType } = incomingMessage;
  let userText = "";
  let isVoiceInput = false;

  // =================================================================
  // 1. SPEECH-TO-TEXT: TRANSCRIBE DARI/PASHTO WHATSAPP VOICE NOTES
  // =================================================================
  if (msgType === "audio" && incomingMessage.audio?.id) {
    isVoiceInput = true;
    const audioBytes = await downloadMetaMediaBuffer(incomingMessage.audio.id);
    userText = await transcribeSpeechElevenLabs(audioBytes);
  } else if (msgType === "text" && incomingMessage.text?.body) {
    userText = incomingMessage.text.body.trim();
  }

  if (!userText) {
    return await sendWhatsAppText(
      userPhone,
      "پیام شما دریافت نشد. لطفاً دوباره به صورت متنی یا صوتی ارسال کنید."
    );
  }

  // =================================================================
  // 2. IMAGE GENERATION COMMAND OVERRIDES (/imagine OR /taswir)
  // =================================================================
  if (/^\/(imagine|taswir)\b/i.test(userText)) {
    const prompt = userText.replace(/^\/(imagine|taswir)\s*/i, "").trim();
    await sendWhatsAppText(
      userPhone,
      "تصویر شما در حال آماده‌سازی است...\n(Generating your image...)"
    );

    const imgRes = await generateImage({
      body: JSON.stringify({
        tenantId: userContext.tenantId,
        userId: userContext.userId,
        prompt,
        aspectRatio: "1:1",
      }),
    });

    const { imageUrl } = JSON.parse(imgRes.body || "{}");
    if (imageUrl) {
      return await sendWhatsAppMedia(userPhone, imageUrl, `تصویر برای: "${prompt}"`);
    }
  }

  // =================================================================
  // 3. REASONING & TEXT COMPLETION (AMAZON NOVA MICRO)
  // =================================================================
  const aiName = process.env.SYSTEM_AI_NAME || "Aria Assistant";
  const orgMission =
    process.env.ORGANIZATION_MISSION || "AriaCloud — Afghan Digital Enablement Initiative";

  const chatResponse = await bedrock.send(
    new InvokeModelCommand({
      modelId: process.env.NOVA_MICRO_PROFILE_ID || "amazon.nova-micro-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        system: [
          {
            text: `شما '${aiName}' هستید؛ دستیار صوتی و متنی هوشمند در پلتفرم ${orgMission} (ariacloudservices.org).
مودب و گرم به زبان کاربر (دری یا پشتو) پاسخ دهید.
پاسخ‌ها را برای خوانش صوتی ساده و روان نگه دارید (حداکثر ۲ یا ۳ جمله کوتاه).`,
          },
        ],
        inferenceConfig: { max_new_tokens: 350, temperature: 0.4 },
        messages: [{ role: "user", content: [{ text: userText }] }],
      }),
    })
  );

  const parsed = JSON.parse(new TextDecoder().decode(chatResponse.body));
  const replyText = parsed?.output?.message?.content?.[0]?.text || "";

  // =================================================================
  // 4. TEXT-TO-SPEECH: RESPOND WITH VOICE NOTE IF USER SPOKE
  // =================================================================
  if (isVoiceInput && replyText) {
    const voiceRes = await generateVoice({
      body: JSON.stringify({
        tenantId: userContext.tenantId,
        userId: userContext.userId,
        text: replyText,
        voiceKey: userContext.preferredVoiceKey || "da-female",
        modelId: "eleven_multilingual_v2",
      }),
    });

    const { audioUrl } = JSON.parse(voiceRes.body || "{}");
    if (audioUrl) {
      return await sendWhatsAppAudio(userPhone, audioUrl);
    }
  }

  return await sendWhatsAppText(userPhone, replyText);
}

async function sendWhatsAppText(to: string, body: string) {
  await fetch(`https://graph.facebook.com/v20.0/${process.env.META_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
}

async function sendWhatsAppAudio(to: string, audioUrl: string) {
  await fetch(`https://graph.facebook.com/v20.0/${process.env.META_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "audio",
      audio: { link: audioUrl },
    }),
  });
}

async function sendWhatsAppMedia(to: string, mediaUrl: string, caption: string) {
  await fetch(`https://graph.facebook.com/v20.0/${process.env.META_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: { link: mediaUrl, caption },
    }),
  });
}

async function downloadMetaMediaBuffer(mediaId: string): Promise<Buffer> {
  const metaUrlRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}` },
  });
  const meta = (await metaUrlRes.json()) as { url?: string };
  if (!meta.url) throw new Error('Meta media URL missing');
  const mediaRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}` },
  });
  return Buffer.from(await mediaRes.arrayBuffer());
}

async function transcribeSpeechElevenLabs(audioBuffer: Buffer): Promise<string> {
  const formData = new FormData();
  formData.append("model_id", "scribe_v1");
  formData.append(
    "file",
    new Blob([audioBuffer], { type: "audio/ogg" }),
    "voice_note.ogg"
  );

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`STT Transcription Error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { text?: string };
  return (data.text || "").trim();
}
