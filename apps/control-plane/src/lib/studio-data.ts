export type StudioTab = 'voice' | 'image' | 'assistant' | 'domains' | 'wallet';

export const PLATFORM_CONFIG = {
  rootDomain: process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ariacloudservices.org',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.ariacloudservices.org',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.ariacloudservices.org',
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'AriaCloud',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@ariacloudservices.org',
  systemFromEmail: process.env.SYSTEM_FROM_EMAIL || 'no-reply@ariacloudservices.org',
  sesRegion: process.env.SES_REGION || 'me-central-1',
  publicAssetsBucket: process.env.PUBLIC_ASSETS_BUCKET || 'ariacloud-public-assets',
  cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN || 'cdn.ariacloudservices.org',
  systemAiName: process.env.SYSTEM_AI_NAME || 'Aria Assistant',
  organizationMission:
    process.env.ORGANIZATION_MISSION || 'AriaCloud — Afghan Digital Enablement Initiative',
} as const;

export interface SubdomainAllocationRow {
  host: string;
  target: string;
  purpose: string;
}

export const SUBDOMAIN_ROUTING_TABLE: SubdomainAllocationRow[] = [
  {
    host: 'ariacloudservices.org',
    target: 'CloudFront (d111111abcdef8.cloudfront.net) -> S3 Static Bucket',
    purpose: 'Public landing page, mission manifesto, and sign-up portal',
  },
  {
    host: 'app.ariacloudservices.org',
    target: 'CloudFront (d222222abcdef8.cloudfront.net) -> Next.js Console',
    purpose: 'Merchant & Admin Dashboard (Dari, Pashto, English)',
  },
  {
    host: 'api.ariacloudservices.org',
    target: 'AWS API Gateway (d333333abcdef8.cloudfront.net) -> Lambda / ECS',
    purpose: 'Core API Gateway, webhooks, and Bedrock routing',
  },
  {
    host: 'mail.ariacloudservices.org',
    target: 'Static IP (<MAIL_SERVER_STATIC_IP>) -> Stalwart Mail + SnappyMail',
    purpose: 'Stalwart Mail Server (JMAP/IMAP/SMTP) & SnappyMail Webmail',
  },
  {
    host: 'cdn.ariacloudservices.org',
    target: 'CloudFront -> S3 (ariacloud-public-assets)',
    purpose: 'Global Edge CDN for merchant assets & AI Studio media',
  },
  {
    host: '*.ariacloudservices.org',
    target: 'CloudFront Dynamic Alias (d444444abcdef8.cloudfront.net)',
    purpose: 'Free instant subdomains for merchant stores (e.g. kabul-saffron.ariacloudservices.org)',
  },
];

export interface VoiceModelOption {
  id: 'eleven_multilingual_v2' | 'eleven_flash_v2_5';
  name: string;
  badge: string;
  creditsPerChar: number;
  latencyLabel: string;
  description: string;
}

export interface VoicePreset {
  voiceId: string;
  name: string;
  locale: string;
  gender: 'Female' | 'Male';
  tone: string;
  sampleDari: string;
  samplePashto: string;
  sampleEnglish: string;
}

export interface ImageResolutionOption {
  id: string;
  width: number;
  height: number;
  label: string;
  aspect: string;
}

export interface AssistantModelOption {
  id: 'amazon.nova-micro-v1:0' | 'amazon.nova-lite-v1:0' | 'meta.llama3-1-8b-instruct-v1:0';
  name: string;
  provider: 'Amazon Bedrock';
  creditsPer1kTokens: number;
  useCase: string;
}

export interface DomainRecordRow {
  type: 'A (Alias)' | 'AAAA (Alias)' | 'A' | 'CNAME' | 'MX' | 'TXT';
  host: string;
  value: string;
  purpose: string;
  status: 'Verified' | 'Propagating';
}

export const VOICE_MODELS: VoiceModelOption[] = [
  {
    id: 'eleven_multilingual_v2',
    name: 'Eleven Multilingual v2',
    badge: 'Studio Broadcast',
    creditsPerChar: 1.0,
    latencyLabel: '~650ms TTFB',
    description: 'Highest emotional fidelity for Dari, Pashto, Arabic, and English commercial voiceovers and audiobooks.',
  },
  {
    id: 'eleven_flash_v2_5',
    name: 'Eleven Flash v2.5',
    badge: 'Ultra-Low Latency (50% Off)',
    creditsPerChar: 0.5,
    latencyLabel: '~75ms TTFB',
    description: 'Sub-100ms streaming synthesis engineered for real-time WhatsApp voice notes and interactive IVR agents.',
  },
];

export const VOICE_PRESETS: VoicePreset[] = [
  {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Aria Walid (Kabul Broadcast)',
    locale: 'fa-AF / ps-AF / en',
    gender: 'Male',
    tone: 'Authoritative, Warm News & Commercial',
    sampleDari: 'به پلتفرم آریا کلود (ariacloudservices.org) خوش آمدید. ما خدمات ابری، دامنه و دستیار صوتی روزانه را برای کسب‌وکارهای افغانستان فراهم می‌کنیم.',
    samplePashto: 'د آریا کلاوډ پلتفارم (ariacloudservices.org) ته ښه راغلاست. موږ د افغانستان سوداګرۍ لپاره کلاوډ، ډومین او غږیز مرستیال چمتو کوو.',
    sampleEnglish: 'Welcome to AriaCloud (ariacloudservices.org) — Afghan Digital Enablement Initiative. Your voiceover, domain, and business email infrastructure is online.',
  },
  {
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    name: 'Aria Maryam (Herat Narrative)',
    locale: 'fa-AF / en-US',
    gender: 'Female',
    tone: 'Clear, Conversational & Educational',
    sampleDari: 'سلام! فروشگاه شما در kabul-saffron.ariacloudservices.org فعال شد و پرداخت حساب‌پی تایید گردید.',
    samplePashto: 'سلام! ستاسو پلورنځی په kabul-saffron.ariacloudservices.org کې فعال شو او د حساب پې تادیه تایید شوه.',
    sampleEnglish: 'Hello! Your merchant storefront at kabul-saffron.ariacloudservices.org is live and your HesabPay settlement has been verified.',
  },
  {
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    name: 'Aria Rostam (Kandahar Commerce)',
    locale: 'ps-AF / fa-AF',
    gender: 'Male',
    tone: 'Dynamic Retail & Brand Promo',
    sampleDari: 'زعفران درجه یک هرات با بسته‌بندی صادراتی و ارسال سریع به سراسر جهان.',
    samplePashto: 'د هرات لومړۍ درجه زعفران د نړیوالو صادراتو او چټک لېږد سره چمتو دي.',
    sampleEnglish: 'Grade-A Herat saffron with export-grade packaging and express global logistics.',
  },
];

export const IMAGE_RESOLUTIONS: ImageResolutionOption[] = [
  { id: '1024x1024', width: 1024, height: 1024, label: '1024 × 1024', aspect: '1:1 Square' },
  { id: '1280x720', width: 1280, height: 720, label: '1280 × 720', aspect: '16:9 Landscape' },
  { id: '720x1280', width: 720, height: 1280, label: '720 × 1280', aspect: '9:16 Social Story' },
];

export const ASSISTANT_MODELS: AssistantModelOption[] = [
  {
    id: 'amazon.nova-micro-v1:0',
    name: 'Amazon Nova Micro v1',
    provider: 'Amazon Bedrock',
    creditsPer1kTokens: 5,
    useCase: 'Fastest daily assistant, WhatsApp voice-note replies, Dari/Pashto translation & email drafting.',
  },
  {
    id: 'amazon.nova-lite-v1:0',
    name: 'Amazon Nova Lite v1',
    provider: 'Amazon Bedrock',
    creditsPer1kTokens: 10,
    useCase: 'Multimodal document analysis, invoice OCR, contract review, and complex business planning.',
  },
  {
    id: 'meta.llama3-1-8b-instruct-v1:0',
    name: 'Meta Llama 3.1 8B Instruct',
    provider: 'Amazon Bedrock',
    creditsPer1kTokens: 15,
    useCase: 'Open-weights reasoning, structured JSON extraction, and multilingual customer support.',
  },
];

export const DEFAULT_DNS_MATRIX: DomainRecordRow[] = [
  {
    type: 'A (Alias)',
    host: 'ariacloudservices.org.',
    value: 'ALIAS d111111abcdef8.cloudfront.net.',
    purpose: 'Apex Public Landing Page & Mission Manifesto (IPv4)',
    status: 'Verified',
  },
  {
    type: 'AAAA (Alias)',
    host: 'ariacloudservices.org.',
    value: 'ALIAS d111111abcdef8.cloudfront.net.',
    purpose: 'Apex Public Landing Page & Mission Manifesto (IPv6)',
    status: 'Verified',
  },
  {
    type: 'CNAME',
    host: 'app.ariacloudservices.org.',
    value: 'd222222abcdef8.cloudfront.net.',
    purpose: 'Merchant & Admin Console (Dari, Pashto, English)',
    status: 'Verified',
  },
  {
    type: 'CNAME',
    host: 'api.ariacloudservices.org.',
    value: 'd333333abcdef8.cloudfront.net.',
    purpose: 'Core API Gateway, Webhooks & Bedrock Routing',
    status: 'Verified',
  },
  {
    type: 'CNAME',
    host: '*.ariacloudservices.org.',
    value: 'd444444abcdef8.cloudfront.net.',
    purpose: 'Merchant Wildcard Storefronts (e.g. kabul-saffron.ariacloudservices.org)',
    status: 'Verified',
  },
  {
    type: 'A',
    host: 'mail.ariacloudservices.org.',
    value: '<MAIL_SERVER_STATIC_IP>',
    purpose: 'Stalwart Mail Server & SnappyMail Webmail Host',
    status: 'Verified',
  },
  {
    type: 'MX',
    host: 'ariacloudservices.org.',
    value: '10 feedback-smtp.me-central-1.amazonses.com. (or mail.ariacloudservices.org.)',
    purpose: 'Amazon SES (me-central-1) + Stalwart Business Email Routing',
    status: 'Verified',
  },
  {
    type: 'TXT',
    host: 'ariacloudservices.org.',
    value: '"v=spf1 include:amazonses.com ip4:<MAIL_SERVER_STATIC_IP> ~all"',
    purpose: 'SPF Record (Permits Amazon SES and Stalwart Mail Host)',
    status: 'Verified',
  },
  {
    type: 'TXT',
    host: '_dmarc.ariacloudservices.org.',
    value: '"v=DMARC1; p=quarantine; rua=mailto:postmaster@ariacloudservices.org; pct=100;"',
    purpose: 'DMARC Anti-Spoofing Policy (100% Enforcement)',
    status: 'Verified',
  },
  {
    type: 'CNAME',
    host: 'token1..3._domainkey.ariacloudservices.org.',
    value: 'token1..3.dkim.amazonses.com.',
    purpose: 'SES Easy-DKIM 2048-bit RSA Cryptographic Signing',
    status: 'Verified',
  },
];
