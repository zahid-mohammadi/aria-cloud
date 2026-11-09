/**
 * AriaCloud multimodal agent runtime.
 *
 * Handlers are Lambda-shaped (`handler(event)`) and can be invoked directly or
 * composed by the WhatsApp assistant. Each manages its own PostgreSQL pool and
 * uses the tenant-aware quota/wallet tables.
 */
export {
  handler as generateVoice,
  DEFAULT_VOICES,
  type VoiceGenerationInput,
} from './handlers/generate-voice';

export {
  handler as generateImage,
  type ImageGenerationInput,
} from './handlers/generate-image';

export {
  handleWhatsAppMessage,
  type WhatsAppUserContext,
} from './handlers/whatsapp-assistant';
