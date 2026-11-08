# Aria Cloud Services & Aria AI Studio (`aria-cloud`)

Sovereign multi-tenant managed cloud, e-commerce storefront builder, and multimodal AI platform (Text, Vision, Voice) engineered for Afghanistan's commercial SMBs, students, and creators.

## Monorepo Structure

```text
aria-cloud/
├── .env.example                                              # Environment configuration template
├── package.json                                              # Root workspace configuration
├── docs/
│   ├── aria_cloud_services_architecture_execution_plan.md    # Master Architecture Blueprint (Pillars I–VII)
│   └── aria_ai_studio_assistant_specification.md             # Pillar VII Multimodal AI Studio Specification
├── packages/
│   └── database/
│       └── migrations/
│           ├── 001_core_multi_tenant_schema.sql              # Core tenants, users, billing, products, orders & RLS
│           └── 003_ai_studio_system.sql                      # Pillar VII quotas, voices, TTS cache, chats & RLS
├── services/
│   ├── billing/
│   │   └── payment_processor.js                              # HesabPay IPN Webhook & Cash Dual-Handshake OTP Engine
│   └── agent-runtime/
│       └── src/
│           └── handlers/
│               ├── generate-voice.ts                         # ElevenLabs TTS + SHA-256 S3/CloudFront Cache
│               ├── generate-image.ts                         # Amazon Nova Canvas Ad & Visual Generator
│               └── whatsapp-assistant.ts                     # Bidirectional WhatsApp Voice-to-Voice & Image Router
└── apps/
    └── web-portal/                                           # Aria Merchant Dashboard, Field Agent & AI Studio UI
```
