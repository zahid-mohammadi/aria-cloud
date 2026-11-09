'use client';

import React, { useState } from 'react';
import {
  ASSISTANT_MODELS,
  DEFAULT_DNS_MATRIX,
  IMAGE_RESOLUTIONS,
  PLATFORM_CONFIG,
  SUBDOMAIN_ROUTING_TABLE,
  StudioTab,
  VOICE_MODELS,
  VOICE_PRESETS,
} from '@/lib/studio-data';

interface GenerationLogItem {
  id: string;
  timestamp: string;
  modality: 'TTS' | 'Image' | 'Assistant';
  model: string;
  summary: string;
  credits: number;
  latencyMs: number;
}

export default function AriaControlPlanePage() {
  const [activeTab, setActiveTab] = useState<StudioTab>('voice');

  // Unified Tenant Wallet State
  const [orgName] = useState('Kabul Saffron & Export Co. (kabul-saffron.ariacloudservices.org)');
  const [usdBalanceCents] = useState(14250);
  const [afnBalancePul, setAfnBalancePul] = useState(685000); // 6,850.00 AFN
  const [aiCredits, setAiCredits] = useState(148420);
  const [monthlyQuota] = useState(150000);

  // Voice Studio State
  const [selectedVoiceModel, setSelectedVoiceModel] = useState<'eleven_multilingual_v2' | 'eleven_flash_v2_5'>(
    'eleven_multilingual_v2'
  );
  const [selectedVoiceId, setSelectedVoiceId] = useState(VOICE_PRESETS[0].voiceId);
  const [voiceScript, setVoiceScript] = useState(VOICE_PRESETS[0].sampleDari);
  const [stability, setStability] = useState(0.55);
  const [similarityBoost, setSimilarityBoost] = useState(0.78);
  const [isSynthesizingVoice, setIsSynthesizingVoice] = useState(false);
  const [lastAudioResult, setLastAudioResult] = useState<{
    voiceName: string;
    modelId: string;
    charCount: number;
    credits: number;
    latencyMs: number;
    audioUrl?: string;
  } | null>(null);

  // Image Studio State
  const [imagePrompt, setImagePrompt] = useState(
    'Editorial studio product photograph of crimson Herat saffron threads in a hand-carved brass vessel on dark slate, warm rim lighting, 85mm lens'
  );
  const [negativePrompt, setNegativePrompt] = useState('blurry, watermark, oversaturated, text overlay, low resolution');
  const [selectedResolution, setSelectedResolution] = useState(IMAGE_RESOLUTIONS[0]);
  const [imageQuality, setImageQuality] = useState<'standard' | 'premium'>('standard');
  const [cfgScale, setCfgScale] = useState(7.0);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<
    Array<{
      id: string;
      prompt: string;
      resolution: string;
      quality: string;
      credits: number;
      latencyMs: number;
    }>
  >([
    {
      id: 'img-initial-1',
      prompt: 'Editorial studio product photograph of crimson Herat saffron threads in a hand-carved brass vessel',
      resolution: '1024 × 1024',
      quality: 'premium',
      credits: 350,
      latencyMs: 1380,
    },
  ]);

  // Daily Assistant State
  const [assistantModel, setAssistantModel] = useState<
    'amazon.nova-micro-v1:0' | 'amazon.nova-lite-v1:0' | 'meta.llama3-1-8b-instruct-v1:0'
  >('amazon.nova-micro-v1:0');
  const [assistantLang, setAssistantLang] = useState<'fa-AF' | 'ps-AF' | 'en'>('fa-AF');
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string;
      role: 'user' | 'assistant';
      text: string;
      meta?: string;
    }>
  >([
    {
      id: 'msg-1',
      role: 'assistant',
      text: 'سلام! من Aria Assistant در پلتفرم ariacloudservices.org (AriaCloud — Afghan Digital Enablement Initiative) هستم. می‌توانید به زبان دری، پشتو یا انگلیسی پیام متنی یا صوتی واتساپ بفرستید.',
      meta: 'Aria Assistant • amazon.nova-micro-v1:0 • 0 Cr (System Greeting)',
    },
  ]);

  // Domain & Stalwart Email + AI Storefront Builder State
  const [activeDomain] = useState(PLATFORM_CONFIG.rootDomain);
  const [newMailboxLocal, setNewMailboxLocal] = useState('merchant');
  const [mailboxes, setMailboxes] = useState([
    { address: 'support@ariacloudservices.org', quotaMb: 10240, usedMb: 420, protocol: 'Stalwart JMAP / IMAP / SES' },
    { address: 'no-reply@ariacloudservices.org', quotaMb: 5120, usedMb: 110, protocol: 'Amazon SES (me-central-1)' },
    { address: 'postmaster@ariacloudservices.org', quotaMb: 5120, usedMb: 85, protocol: 'DMARC & Abuse Reporting' },
  ]);
  const [storefrontSlug, setStorefrontSlug] = useState('kabul-saffron');
  const [storefrontTheme, setStorefrontTheme] = useState<'emerald_bazaar' | 'lapis_royal' | 'saffron_gold' | 'modern_slate'>('emerald_bazaar');
  const [storefrontLocale, setStorefrontLocale] = useState<'fa' | 'ps_AF' | 'en'>('fa');
  const [storefrontPrompt, setStorefrontPrompt] = useState(
    'فروشگاه آنلاین زعفران سوپر نگین هرات، جلغوزه خوست و عسل کوهی با درگاه پرداخت HesabPay و سفارش واتساپ'
  );
  const [isBuildingStorefront, setIsBuildingStorefront] = useState(false);
  const [lastBuiltStorefront, setLastBuiltStorefront] = useState<{
    fqdn: string;
    liveUrl: string;
    s3Target: string;
    hesabPayMerchantId: string;
    theme: string;
    locale: string;
  } | null>({
    fqdn: 'kabul-saffron.ariacloudservices.org',
    liveUrl: 'https://kabul-saffron.ariacloudservices.org',
    s3Target: 's3://ariacloud-public-assets/tenants/kabul-saffron/index.html',
    hesabPayMerchantId: 'HP-AF-KABUL-SA',
    theme: 'emerald_bazaar',
    locale: 'fa',
  });

  // Wallet & Hawala OTP State
  const [hawalaOtp, setHawalaOtp] = useState('');
  const [walletNotice, setWalletNotice] = useState<string | null>(null);

  // Unified Generation Audit Log
  const [generationLogs, setGenerationLogs] = useState<GenerationLogItem[]>([
    {
      id: 'log-101',
      timestamp: 'Just now',
      modality: 'TTS',
      model: 'eleven_multilingual_v2',
      summary: 'Dari commercial voiceover (Aria Walid • 138 chars)',
      credits: 138,
      latencyMs: 412,
    },
    {
      id: 'log-102',
      timestamp: '4m ago',
      modality: 'Image',
      model: 'amazon.nova-canvas-v1:0',
      summary: 'Herat saffron brass vessel product render (1024×1024)',
      credits: 350,
      latencyMs: 1380,
    },
    {
      id: 'log-103',
      timestamp: '12m ago',
      modality: 'Assistant',
      model: 'amazon.nova-micro-v1:0',
      summary: 'WhatsApp voice-to-voice invoice summary (+93 70 412 8890)',
      credits: 68,
      latencyMs: 590,
    },
  ]);

  const currentVoiceModel = VOICE_MODELS.find((m) => m.id === selectedVoiceModel) || VOICE_MODELS[0];
  const currentVoicePreset = VOICE_PRESETS.find((v) => v.voiceId === selectedVoiceId) || VOICE_PRESETS[0];
  const estimatedVoiceCredits =
    selectedVoiceModel === 'eleven_flash_v2_5'
      ? Math.max(1, Math.ceil(voiceScript.length * 0.5))
      : voiceScript.length;
  const isRtlScript = /[\u0600-\u06FF]/.test(voiceScript);

  async function handleSynthesizeVoice() {
    if (!voiceScript.trim()) return;
    setIsSynthesizingVoice(true);
    try {
      const res = await fetch('/api/studio/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: voiceScript,
          voiceId: selectedVoiceId,
          modelId: selectedVoiceModel,
          stability,
          similarityBoost,
        }),
      });
      const data = await res.json();
      const deducted = data.creditsDeducted ?? estimatedVoiceCredits;
      setAiCredits((prev) => Math.max(0, prev - deducted));
      setLastAudioResult({
        voiceName: currentVoicePreset.name,
        modelId: selectedVoiceModel,
        charCount: voiceScript.length,
        credits: deducted,
        latencyMs: data.latencyMs ?? 390,
        audioUrl: data.audioBase64,
      });
      setGenerationLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: 'Just now',
          modality: 'TTS',
          model: selectedVoiceModel,
          summary: `${currentVoicePreset.name} (${voiceScript.length} chars)`,
          credits: deducted,
          latencyMs: data.latencyMs ?? 390,
        },
        ...prev,
      ]);
    } finally {
      setIsSynthesizingVoice(false);
    }
  }

  async function handleGenerateImage() {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    try {
      const res = await fetch('/api/studio/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          negativePrompt,
          width: selectedResolution.width,
          height: selectedResolution.height,
          quality: imageQuality,
          cfgScale,
        }),
      });
      const data = await res.json();
      const deducted = data.creditsDeducted ?? (imageQuality === 'premium' ? 350 : 200);
      setAiCredits((prev) => Math.max(0, prev - deducted));
      setGeneratedImages((prev) => [
        {
          id: `img-${Date.now()}`,
          prompt: imagePrompt,
          resolution: selectedResolution.label,
          quality: imageQuality,
          credits: deducted,
          latencyMs: data.latencyMs ?? 1420,
        },
        ...prev,
      ]);
      setGenerationLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: 'Just now',
          modality: 'Image',
          model: 'amazon.nova-canvas-v1:0',
          summary: `${imagePrompt.slice(0, 48)}... (${selectedResolution.label})`,
          credits: deducted,
          latencyMs: data.latencyMs ?? 1420,
        },
        ...prev,
      ]);
    } finally {
      setIsGeneratingImage(false);
    }
  }

  async function handleSendAssistantMessage() {
    if (!chatInput.trim()) return;
    const userText = chatInput;
    setChatInput('');
    setChatMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: userText }]);
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/studio/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          language: assistantLang,
          modelId: assistantModel,
          voiceReply: voiceReplyEnabled,
        }),
      });
      const data = await res.json();
      const deducted = data.creditsDeducted ?? 42;
      setAiCredits((prev) => Math.max(0, prev - deducted));
      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.replyText,
          meta: `${PLATFORM_CONFIG.systemAiName} • ${assistantModel} ${voiceReplyEnabled ? '+ ElevenLabs Flash v2.5' : ''} • ${deducted} Cr`,
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  }

  async function handleRedeemHawala() {
    if (!/^\d{6}$/.test(hawalaOtp.trim())) {
      setWalletNotice('Please enter a valid 6-digit numeric Hawala voucher OTP.');
      return;
    }
    const res = await fetch('/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'redeem_hawala_otp', otpCode: hawalaOtp.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setAfnBalancePul((prev) => prev + 150000); // +1,500 AFN
      setAiCredits((prev) => prev + 150000);
      setHawalaOtp('');
      setWalletNotice(`Verified ${data.reference}: +1,500 AFN and +150,000 AI Studio Credits added.`);
    } else {
      setWalletNotice(data.error || 'Hawala redemption failed.');
    }
  }

  function handleCreateMailbox() {
    if (!newMailboxLocal.trim()) return;
    const address = `${newMailboxLocal.trim().toLowerCase()}@${activeDomain}`;
    if (mailboxes.some((m) => m.address === address)) return;
    setMailboxes((prev) => [
      ...prev,
      { address, quotaMb: 5120, usedMb: 0, protocol: 'Stalwart JMAP / IMAP / SMTP TLS' },
    ]);
    setNewMailboxLocal('');
  }

  async function handleBuildStorefront() {
    if (!storefrontSlug.trim() || !storefrontPrompt.trim()) return;
    setIsBuildingStorefront(true);
    try {
      const res = await fetch('/api/studio/site-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomainSlug: storefrontSlug,
          prompt: storefrontPrompt,
          primaryLocale: storefrontLocale,
          theme: storefrontTheme,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiCredits((prev) => Math.max(0, prev - (data.creditsCharged ?? 15)));
        setLastBuiltStorefront({
          fqdn: data.fqdn,
          liveUrl: data.liveUrl,
          s3Target: data.s3Target,
          hesabPayMerchantId: data.hesabPayMerchantId,
          theme: data.theme,
          locale: data.primaryLocale,
        });
      }
    } finally {
      setIsBuildingStorefront(false);
    }
  }

  const quotaPct = Math.min(100, Math.round((aiCredits / monthlyQuota) * 100));

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className="sidebar" aria-label="Primary Control Plane Navigation">
        <div>
          <div className="brand-header">
            <div className="brand-mark">A</div>
            <div>
              <div className="brand-title">{PLATFORM_CONFIG.appName}</div>
              <div className="brand-subtitle">{PLATFORM_CONFIG.rootDomain}</div>
            </div>
          </div>

          <div className="nav-group">
            <div className="nav-section-label">Pillar VII • Multimodal AI Studio</div>
            <button
              id="nav-tab-voice"
              type="button"
              className={`nav-btn ${activeTab === 'voice' ? 'active' : ''}`}
              onClick={() => setActiveTab('voice')}
            >
              <span>Voice Studio (ElevenLabs)</span>
              <span className="nav-badge">33M Pool</span>
            </button>
            <button
              id="nav-tab-image"
              type="button"
              className={`nav-btn ${activeTab === 'image' ? 'active' : ''}`}
              onClick={() => setActiveTab('image')}
            >
              <span>Image Studio (Nova Canvas)</span>
              <span className="nav-badge">1024px</span>
            </button>
            <button
              id="nav-tab-assistant"
              type="button"
              className={`nav-btn ${activeTab === 'assistant' ? 'active' : ''}`}
              onClick={() => setActiveTab('assistant')}
            >
              <span>{PLATFORM_CONFIG.systemAiName}</span>
              <span className="nav-badge">Voice Loop</span>
            </button>

            <div className="nav-section-label" style={{ marginTop: 14 }}>
              Pillars I–VI • Cloud & Settlement
            </div>
            <button
              id="nav-tab-domains"
              type="button"
              className={`nav-btn ${activeTab === 'domains' ? 'active' : ''}`}
              onClick={() => setActiveTab('domains')}
            >
              <span>Route 53 & Stalwart Mail</span>
              <span className="nav-badge">.org + *</span>
            </button>
            <button
              id="nav-tab-wallet"
              type="button"
              className={`nav-btn ${activeTab === 'wallet' ? 'active' : ''}`}
              onClick={() => setActiveTab('wallet')}
            >
              <span>AFN / USD Wallet & Hawala</span>
              <span className="nav-badge">RLS Ledger</span>
            </button>
          </div>
        </div>

        {/* AI Studio Credit Pool Meter */}
        <div className="credit-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
            <span style={{ color: 'var(--text-secondary)' }}>AI Studio Credits</span>
            <strong className="mono">{aiCredits.toLocaleString()} Cr</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${quotaPct}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
            <span>Pro Studio Tier</span>
            <span>{quotaPct}% of 150k</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="workspace-main">
        <header className="topbar">
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {orgName}
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              {PLATFORM_CONFIG.organizationMission} • Console:{' '}
              <code className="mono">{PLATFORM_CONFIG.appUrl}</code> • API:{' '}
              <code className="mono">{PLATFORM_CONFIG.apiUrl}</code>
            </p>
          </div>

          <div className="wallet-pills">
            <div className="pill">
              <span>AFN Wallet:</span>
              <strong className="mono">؋ {(afnBalancePul / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div className="pill">
              <span>USD Wallet:</span>
              <strong className="mono">${(usdBalanceCents / 100).toFixed(2)}</strong>
            </div>
            <div className="pill">
              <span>AI Credits:</span>
              <strong className="mono" style={{ color: 'var(--accent-primary)' }}>
                {aiCredits.toLocaleString()} Cr
              </strong>
            </div>
          </div>
        </header>

        <div className="content-container">
          {/* TAB 1: VOICE STUDIO */}
          {activeTab === 'voice' && (
            <div className="workspace-grid">
              <section className="panel" aria-labelledby="voice-studio-heading">
                <div className="panel-header">
                  <div>
                    <h2 id="voice-studio-heading" className="panel-title">
                      ElevenLabs Dari, Pashto & English Voice Studio
                    </h2>
                    <p className="panel-subtitle">
                      Powered by our 33,000,000-credit enterprise pool with delivery via{' '}
                      <code className="mono">https://{PLATFORM_CONFIG.cloudfrontDomain}</code>.
                    </p>
                  </div>
                  <span className="status-chip">{currentVoiceModel.latencyLabel}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="field-group">
                    <label className="field-label" htmlFor="voice-model-select">
                      <span>Synthesis Engine</span>
                    </label>
                    <select
                      id="voice-model-select"
                      className="select"
                      value={selectedVoiceModel}
                      onChange={(e) =>
                        setSelectedVoiceModel(e.target.value as 'eleven_multilingual_v2' | 'eleven_flash_v2_5')
                      }
                    >
                      {VOICE_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.creditsPerChar} Cr/char)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="voice-preset-select">
                      <span>Voice Profile</span>
                    </label>
                    <select
                      id="voice-preset-select"
                      className="select"
                      value={selectedVoiceId}
                      onChange={(e) => setSelectedVoiceId(e.target.value)}
                    >
                      {VOICE_PRESETS.map((v) => (
                        <option key={v.voiceId} value={v.voiceId}>
                          {v.name} — {v.locale}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setVoiceScript(currentVoicePreset.sampleDari)}
                  >
                    Load Dari (دری) Sample
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setVoiceScript(currentVoicePreset.samplePashto)}
                  >
                    Load Pashto (پښتو) Sample
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setVoiceScript(currentVoicePreset.sampleEnglish)}
                  >
                    Load English Sample
                  </button>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="voice-script-textarea">
                    <span>Multilingual Script ({isRtlScript ? 'RTL Dari/Pashto Detected' : 'LTR'})</span>
                    <span className="mono">
                      {voiceScript.length} / 5,000 chars • Cost: {estimatedVoiceCredits} Cr
                    </span>
                  </label>
                  <textarea
                    id="voice-script-textarea"
                    className={`textarea ${isRtlScript ? 'rtl-text' : ''}`}
                    value={voiceScript}
                    onChange={(e) => setVoiceScript(e.target.value)}
                    placeholder="متن خود را به زبان دری، پشتو یا انگلیسی وارد کنید..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="field-group">
                    <label className="field-label" htmlFor="stability-slider">
                      <span>Voice Stability</span>
                      <span className="mono">{Math.round(stability * 100)}%</span>
                    </label>
                    <input
                      id="stability-slider"
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={stability}
                      onChange={(e) => setStability(parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="similarity-slider">
                      <span>Clarity + Similarity Boost</span>
                      <span className="mono">{Math.round(similarityBoost * 100)}%</span>
                    </label>
                    <input
                      id="similarity-slider"
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={similarityBoost}
                      onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                    Bucket: <code className="mono">{PLATFORM_CONFIG.publicAssetsBucket}</code> • CDN:{' '}
                    <code className="mono">{PLATFORM_CONFIG.cloudfrontDomain}</code>
                  </span>
                  <button
                    id="btn-synthesize-voice"
                    type="button"
                    className="btn-primary"
                    disabled={isSynthesizingVoice || !voiceScript.trim()}
                    onClick={handleSynthesizeVoice}
                  >
                    {isSynthesizingVoice
                      ? 'Synthesizing Audio...'
                      : `Synthesize Speech (${estimatedVoiceCredits} Cr)`}
                  </button>
                </div>
              </section>

              <aside className="panel" aria-label="Audio Output and Generation History">
                <div>
                  <h3 className="panel-title">Studio Output & Telemetry</h3>
                  <p className="panel-subtitle">
                    CDN Edge: <code className="mono">https://{PLATFORM_CONFIG.cloudfrontDomain}</code>
                  </p>
                </div>

                {lastAudioResult ? (
                  <div
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 14 }}>{lastAudioResult.voiceName}</strong>
                      <span className="status-chip">{lastAudioResult.latencyMs}ms</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      Model: <code className="mono">{lastAudioResult.modelId}</code> • {lastAudioResult.charCount} chars •{' '}
                      <strong>-{lastAudioResult.credits} Cr</strong>
                    </div>
                    {lastAudioResult.audioUrl && (
                      <audio controls src={lastAudioResult.audioUrl} style={{ width: '100%', marginTop: 6 }} />
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 18,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-muted)',
                      fontSize: 13,
                    }}
                  >
                    Click <strong>Synthesize Speech</strong> to deduct credits atomically and stream 44.1kHz MP3 output.
                  </div>
                )}

                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)' }}>
                    Recent Multimodal Audit Ledger
                  </h4>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Summary</th>
                        <th>Credits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generationLogs.slice(0, 5).map((item) => (
                        <tr key={item.id}>
                          <td>
                            <span className="status-chip">{item.modality}</span>
                          </td>
                          <td>{item.summary}</td>
                          <td className="mono">-{item.credits} Cr</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </aside>
            </div>
          )}

          {/* TAB 2: IMAGE STUDIO */}
          {activeTab === 'image' && (
            <div className="workspace-grid">
              <section className="panel" aria-labelledby="image-studio-heading">
                <div className="panel-header">
                  <div>
                    <h2 id="image-studio-heading" className="panel-title">
                      Amazon Nova Canvas Commercial Image Studio
                    </h2>
                    <p className="panel-subtitle">
                      Generate product photography, social ad creatives, and brand visuals published to{' '}
                      <code className="mono">https://{PLATFORM_CONFIG.cloudfrontDomain}</code>.
                    </p>
                  </div>
                  <span className="status-chip">{imageQuality === 'premium' ? '350 Cr' : '200 Cr'} / Image</span>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="image-prompt-input">
                    <span>Creative Prompt</span>
                  </label>
                  <textarea
                    id="image-prompt-input"
                    className="textarea"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="negative-prompt-input">
                    <span>Negative Prompt (Excluded Artifacts)</span>
                  </label>
                  <input
                    id="negative-prompt-input"
                    className="input"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="field-group">
                    <label className="field-label" htmlFor="resolution-select">
                      <span>Dimensions</span>
                    </label>
                    <select
                      id="resolution-select"
                      className="select"
                      value={selectedResolution.id}
                      onChange={(e) => {
                        const found = IMAGE_RESOLUTIONS.find((r) => r.id === e.target.value);
                        if (found) setSelectedResolution(found);
                      }}
                    >
                      {IMAGE_RESOLUTIONS.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label} ({r.aspect})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="quality-select">
                      <span>Render Quality</span>
                    </label>
                    <select
                      id="quality-select"
                      className="select"
                      value={imageQuality}
                      onChange={(e) => setImageQuality(e.target.value as 'standard' | 'premium')}
                    >
                      <option value="standard">Standard (200 Credits)</option>
                      <option value="premium">Premium HD (350 Credits)</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="cfg-input">
                      <span>CFG Prompt Adherence</span>
                      <span className="mono">{cfgScale.toFixed(1)}</span>
                    </label>
                    <input
                      id="cfg-input"
                      className="input"
                      type="number"
                      min={1.1}
                      max={10.0}
                      step={0.5}
                      value={cfgScale}
                      onChange={(e) => setCfgScale(parseFloat(e.target.value) || 7.0)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    id="btn-generate-image"
                    type="button"
                    className="btn-primary"
                    disabled={isGeneratingImage}
                    onClick={handleGenerateImage}
                  >
                    {isGeneratingImage
                      ? 'Rendering on Nova Canvas...'
                      : `Generate Image (${imageQuality === 'premium' ? 350 : 200} Cr)`}
                  </button>
                </div>
              </section>

              <aside className="panel">
                <h3 className="panel-title">Generated Brand Assets ({PLATFORM_CONFIG.publicAssetsBucket})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {generatedImages.map((img) => (
                    <div
                      key={img.id}
                      style={{
                        padding: 16,
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span className="status-chip">
                          {img.resolution} • {img.quality}
                        </span>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          -{img.credits} Cr ({img.latencyMs}ms)
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{img.prompt}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          )}

          {/* TAB 3: DAILY ASSISTANT & WHATSAPP VOICE LOOP */}
          {activeTab === 'assistant' && (
            <div className="workspace-grid">
              <section className="panel" aria-labelledby="assistant-heading">
                <div className="panel-header">
                  <div>
                    <h2 id="assistant-heading" className="panel-title">
                      {PLATFORM_CONFIG.systemAiName} — WhatsApp Voice-to-Voice & Business Copilot
                    </h2>
                    <p className="panel-subtitle">
                      Mission: <strong>{PLATFORM_CONFIG.organizationMission}</strong> • Webhook:{' '}
                      <code className="mono">{PLATFORM_CONFIG.apiUrl}/v1/webhooks/whatsapp</code>
                    </p>
                  </div>
                  <span className="status-chip">WhatsApp Webhook Active</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr', gap: 12 }}>
                  <div className="field-group">
                    <label className="field-label" htmlFor="assistant-model-select">
                      <span>Bedrock LLM Engine</span>
                    </label>
                    <select
                      id="assistant-model-select"
                      className="select"
                      value={assistantModel}
                      onChange={(e) => setAssistantModel(e.target.value as any)}
                    >
                      {ASSISTANT_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.creditsPer1kTokens} Cr/1K tok)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="assistant-lang-select">
                      <span>Response Language</span>
                    </label>
                    <select
                      id="assistant-lang-select"
                      className="select"
                      value={assistantLang}
                      onChange={(e) => setAssistantLang(e.target.value as any)}
                    >
                      <option value="fa-AF">Dari (فارسی دری)</option>
                      <option value="ps-AF">Pashto (پښتو)</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="voice-reply-toggle">
                      <span>Voice Note Synthesis</span>
                    </label>
                    <button
                      id="voice-reply-toggle"
                      type="button"
                      className="btn-secondary"
                      onClick={() => setVoiceReplyEnabled((v) => !v)}
                    >
                      {voiceReplyEnabled ? 'Enabled (Flash v2.5)' : 'Text Only'}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 16,
                    minHeight: 240,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {chatMessages.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        background: m.role === 'user' ? 'var(--accent-primary-soft)' : 'var(--bg-elevated)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 14px',
                      }}
                    >
                      <div className={/[\u0600-\u06FF]/.test(m.text) ? 'rtl-text' : ''} style={{ fontSize: 13.5 }}>
                        {m.text}
                      </div>
                      {m.meta && (
                        <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          {m.meta}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    id="assistant-chat-input"
                    className="input"
                    placeholder="Ask Aria Assistant to draft an export invoice, summarize emails, or translate to Pashto..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendAssistantMessage()}
                  />
                  <button
                    id="btn-send-assistant"
                    type="button"
                    className="btn-primary"
                    disabled={isSendingChat}
                    onClick={handleSendAssistantMessage}
                  >
                    {isSendingChat ? 'Thinking...' : 'Send'}
                  </button>
                </div>
              </section>

              <aside className="panel">
                <h3 className="panel-title">WhatsApp Voice Pipeline Architecture</h3>
                <p className="panel-subtitle">
                  End-to-end latency under 1.8 seconds for Afghan mobile networks.
                </p>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Service</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1. Audio ASR</td>
                      <td>ElevenLabs Scribe v1</td>
                      <td className="mono">50 Cr / min</td>
                    </tr>
                    <tr>
                      <td>2. Reasoning</td>
                      <td>Amazon Nova Micro v1</td>
                      <td className="mono">5 Cr / 1K tok</td>
                    </tr>
                    <tr>
                      <td>3. Voice Reply</td>
                      <td>ElevenLabs Flash v2.5</td>
                      <td className="mono">0.5 Cr / char</td>
                    </tr>
                  </tbody>
                </table>
              </aside>
            </div>
          )}

          {/* TAB 4: DOMAINS, SUBDOMAIN ALLOCATION & STALWART EMAIL */}
          {activeTab === 'domains' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <section className="panel" aria-labelledby="ai-storefront-builder-heading">
                <div className="panel-header">
                  <div>
                    <h2 id="ai-storefront-builder-heading" className="panel-title">
                      AI Website & Merchant Storefront Builder (*.{PLATFORM_CONFIG.rootDomain})
                    </h2>
                    <p className="panel-subtitle">
                      Generates a 3G-optimized RTL/LTR storefront (Dari, Pashto, English) with HesabPay & WhatsApp checkout and deploys to S3 + CloudFront edge.
                    </p>
                  </div>
                  <span className="status-chip">Module #3 • Edge Publisher</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div className="field-group">
                    <label className="field-label" htmlFor="storefront-slug-input">
                      <span>Instant Merchant Subdomain</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        id="storefront-slug-input"
                        className="input mono"
                        value={storefrontSlug}
                        onChange={(e) => setStorefrontSlug(e.target.value)}
                        placeholder="kabul-saffron"
                      />
                      <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        .{PLATFORM_CONFIG.rootDomain}
                      </span>
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="storefront-locale-select">
                      <span>Primary Storefront Language</span>
                    </label>
                    <select
                      id="storefront-locale-select"
                      className="select"
                      value={storefrontLocale}
                      onChange={(e) => setStorefrontLocale(e.target.value as 'fa' | 'ps_AF' | 'en')}
                    >
                      <option value="fa">Dari (فارسی دری — RTL)</option>
                      <option value="ps_AF">Pashto (پښتو — RTL)</option>
                      <option value="en">English (International — LTR)</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="storefront-theme-select">
                      <span>Storefront Palette</span>
                    </label>
                    <select
                      id="storefront-theme-select"
                      className="select"
                      value={storefrontTheme}
                      onChange={(e) =>
                        setStorefrontTheme(
                          e.target.value as 'emerald_bazaar' | 'lapis_royal' | 'saffron_gold' | 'modern_slate'
                        )
                      }
                    >
                      <option value="emerald_bazaar">Emerald Bazaar (Saffron & Ag)</option>
                      <option value="lapis_royal">Lapis Royal (Carpets & Gems)</option>
                      <option value="saffron_gold">Saffron Gold (Luxury Export)</option>
                      <option value="modern_slate">Modern Slate (Tech & Solar)</option>
                    </select>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="storefront-prompt-input">
                    <span>Describe Your Business & Products (Dari, Pashto, or English)</span>
                    <span className="mono">15 Credits / Build</span>
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      id="storefront-prompt-input"
                      className="input"
                      dir="rtl"
                      value={storefrontPrompt}
                      onChange={(e) => setStorefrontPrompt(e.target.value)}
                    />
                    <button
                      id="btn-build-storefront"
                      type="button"
                      className="btn-primary"
                      disabled={isBuildingStorefront}
                      onClick={handleBuildStorefront}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {isBuildingStorefront ? 'Deploying to Edge...' : 'Build & Publish Site'}
                    </button>
                  </div>
                </div>

                {lastBuiltStorefront && (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Live Wildcard Storefront Endpoint</div>
                      <strong className="mono" style={{ fontSize: 14, color: 'var(--accent-primary)' }}>
                        {lastBuiltStorefront.liveUrl}
                      </strong>
                      <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                        S3 Target: {lastBuiltStorefront.s3Target} • HesabPay ID: {lastBuiltStorefront.hesabPayMerchantId}
                      </div>
                    </div>
                    <span className="status-chip">CloudFront OAC + ACM Wildcard SSL Active</span>
                  </div>
                )}
              </section>

              <section className="panel" aria-labelledby="subdomain-routing-heading">
                <div className="panel-header">
                  <div>
                    <h2 id="subdomain-routing-heading" className="panel-title">
                      1. Subdomain & Routing Allocation ({PLATFORM_CONFIG.rootDomain})
                    </h2>
                    <p className="panel-subtitle">
                      Separation of public landing portal, merchant/admin console, developer APIs, Stalwart mail, and wildcard merchant stores.
                    </p>
                  </div>
                  <span className="status-chip">Locked Production Root Domain</span>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Host / Subdomain</th>
                      <th>Target Infrastructure</th>
                      <th>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SUBDOMAIN_ROUTING_TABLE.map((row) => (
                      <tr key={row.host}>
                        <td className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {row.host}
                        </td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {row.target}
                        </td>
                        <td>{row.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <div className="workspace-grid">
                <section className="panel" aria-labelledby="dns-matrix-heading">
                  <div className="panel-header">
                    <div>
                      <h2 id="dns-matrix-heading" className="panel-title">
                        2. AWS Route 53 Master Hosted Zone ({activeDomain})
                      </h2>
                      <p className="panel-subtitle">
                        Zone file at <code className="mono">infrastructure/dns/ariacloudservices.org.zone</code>
                      </p>
                    </div>
                    <span className="status-chip">SES + Easy-DKIM (me-central-1)</span>
                  </div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Host</th>
                        <th>Target / Value</th>
                        <th>Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEFAULT_DNS_MATRIX.map((row, idx) => (
                        <tr key={idx}>
                          <td className="mono">{row.type}</td>
                          <td className="mono">{row.host}</td>
                          <td className="mono" style={{ fontSize: 12 }}>
                            {row.value}
                          </td>
                          <td>{row.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <aside className="panel">
                  <h3 className="panel-title">Stalwart Mail & SES Identities</h3>
                  <p className="panel-subtitle">
                    Webmail & JMAP at <code className="mono">mail.ariacloudservices.org</code> • Outbound SES in{' '}
                    <code className="mono">{PLATFORM_CONFIG.sesRegion}</code>.
                  </p>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      id="new-mailbox-input"
                      className="input"
                      placeholder="mailbox username"
                      value={newMailboxLocal}
                      onChange={(e) => setNewMailboxLocal(e.target.value)}
                    />
                    <button
                      id="btn-create-mailbox"
                      type="button"
                      className="btn-primary"
                      onClick={handleCreateMailbox}
                    >
                      + @{activeDomain}
                    </button>
                  </div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Identity</th>
                        <th>Role / Quota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mailboxes.map((mb) => (
                        <tr key={mb.address}>
                          <td className="mono">{mb.address}</td>
                          <td className="mono">
                            {mb.usedMb} MB / {mb.quotaMb} MB
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </aside>
              </div>
            </div>
          )}

          {/* TAB 5: DUAL-CURRENCY WALLET & HAWALA LEDGER */}
          {activeTab === 'wallet' && (
            <div className="workspace-grid">
              <section className="panel" aria-labelledby="wallet-heading">
                <div className="panel-header">
                  <div>
                    <h2 id="wallet-heading" className="panel-title">
                      Dual-Currency Ledger (AFN Pul / USD Cents) & Hawala Cash OTP
                    </h2>
                    <p className="panel-subtitle">
                      Protected by PostgreSQL `FOR UPDATE` row locks, constant-time HMAC verification, and 5-attempt OTP brute-force lockout.
                    </p>
                  </div>
                  <span className="status-chip">ACID Idempotent</span>
                </div>

                {walletNotice && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--accent-primary-soft)',
                      color: 'var(--accent-primary)',
                      fontSize: 13,
                    }}
                  >
                    {walletNotice}
                  </div>
                )}

                <div className="field-group">
                  <label className="field-label" htmlFor="hawala-otp-input">
                    <span>Redeem 6-Digit Hawala Agent Cash Voucher (Kabul / Herat / Mazar-i-Sharif)</span>
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      id="hawala-otp-input"
                      className="input mono"
                      maxLength={6}
                      placeholder="e.g. 849201"
                      value={hawalaOtp}
                      onChange={(e) => setHawalaOtp(e.target.value)}
                    />
                    <button
                      id="btn-redeem-hawala"
                      type="button"
                      className="btn-primary"
                      onClick={handleRedeemHawala}
                    >
                      Verify & Credit Wallet
                    </button>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                    Instant HesabPay AI Studio Credit Packs
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {[
                      { credits: 25000, afn: 200, usd: '$2.85' },
                      { credits: 50000, afn: 350, usd: '$5.00' },
                      { credits: 150000, afn: 900, usd: '$12.85' },
                    ].map((pack) => (
                      <div
                        key={pack.credits}
                        style={{
                          padding: 14,
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <strong className="mono" style={{ fontSize: 15 }}>
                          +{pack.credits.toLocaleString()} Cr
                        </strong>
                        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                          {pack.afn} AFN ({pack.usd})
                        </span>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setAiCredits((prev) => prev + pack.credits);
                            setWalletNotice(`HesabPay Top-Up Settled: +${pack.credits.toLocaleString()} AI Studio Credits.`);
                          }}
                        >
                          Buy with HesabPay
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <aside className="panel">
                <h3 className="panel-title">Subscription & Credit Economics</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Plan Tier</th>
                      <th>Monthly Fee</th>
                      <th>Included Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Starter AF</td>
                      <td className="mono">350 AFN ($5)</td>
                      <td className="mono">25,000 Cr</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Pro Studio (Active)</strong>
                      </td>
                      <td className="mono">1,050 AFN ($15)</td>
                      <td className="mono">150,000 Cr</td>
                    </tr>
                    <tr>
                      <td>Agency AF</td>
                      <td className="mono">2,800 AFN ($39)</td>
                      <td className="mono">500,000 Cr</td>
                    </tr>
                  </tbody>
                </table>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
