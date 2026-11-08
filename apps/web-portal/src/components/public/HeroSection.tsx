'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PublicTranslationSchema } from '../../i18n/publicTranslations';
import { HeroTopologyViz } from './HeroTopologyViz';

interface HeroSectionProps {
  t: PublicTranslationSchema;
}

export function HeroSection({ t }: HeroSectionProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'diagram' | 'cli' | 'config' | 'preview'>('diagram');
  const [copiedCode, setCopiedCode] = useState(false);
  const audioTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Play natural voice tone simulation using Web Audio API
  const handleToggleVoiceSample = () => {
    if (isPlayingAudio) return;

    setIsPlayingAudio(true);

    try {
      if (typeof window !== 'undefined') {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.8);
          osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 1.8);
          osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 3.2);

          gain.gain.setValueAtTime(0.001, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.3);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.8);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + 4.0);
        }
      }
    } catch {
      // AudioContext unavailable or blocked by browser autoplay policy
    }

    if (audioTimerRef.current) {
      clearTimeout(audioTimerRef.current);
    }

    audioTimerRef.current = setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4000);
  };

  const handleCopyCli = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('aria deploy --app kabul-saffron --domain kabul-saffron.af --region me-central-1 --cash-otp');
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (audioTimerRef.current) {
        clearTimeout(audioTimerRef.current);
      }
    };
  }, []);

  return (
    <section className="public-section hero-wrapper" aria-labelledby="hero-heading">
      <HeroTopologyViz />

      <div className="section-container">
        <div className="hero-two-col-grid">
          {/* Left Column: Enterprise Headline & Action Controls */}
          <div className="hero-left-col">
            <div className="section-badge">
              <span className="status-dot-active" aria-hidden="true" />
              <span>{t.hero.badge}</span>
            </div>

            <h1 id="hero-heading" className="hero-headline">
              <span>{t.hero.headlineMain}</span>
              <span className="hero-headline-highlight">{t.hero.headlineHighlight}</span>
            </h1>

            <p className="hero-subheadline">{t.hero.subheadline}</p>

            {/* Quick Specs SLA Bar (Enterprise High-Density Metrics) */}
            <div className="hero-specs-bar" role="region" aria-label="Infrastructure Specifications">
              {t.hero.quickSpecs.map((spec, index) => (
                <div key={index} className="spec-item">
                  <span className="spec-icon" aria-hidden="true">✔</span>
                  <span>{spec}</span>
                </div>
              ))}
            </div>

            {/* Action Group */}
            <div className="hero-actions">
              <Link href="/login" className="btn-enterprise-primary">
                <span>{t.hero.ctaBusiness}</span>
                <span aria-hidden="true">→</span>
              </Link>

              <a
                href="https://wa.me/93700000000?text=Salam%20AriaCloud"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-enterprise-whatsapp"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>{t.hero.ctaWhatsApp}</span>
              </a>

              {/* Natural Voice Audio Proof */}
              <button
                type="button"
                onClick={handleToggleVoiceSample}
                className={`voice-sample-badge ${isPlayingAudio ? 'playing' : ''}`}
                aria-label={isPlayingAudio ? t.hero.samplePlaying : t.hero.listenSample}
              >
                <span className="audio-equalizer" aria-hidden="true">
                  <span className="eq-bar" />
                  <span className="eq-bar" />
                  <span className="eq-bar" />
                </span>
                <span>{isPlayingAudio ? t.hero.samplePlaying : t.hero.listenSample}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Enterprise-Style Interactive Cloud Console & Topology Showcase */}
          <div>
            <div className="console-widget-card">
              {/* Window Header with Tabs */}
              <div className="console-widget-header">
                <div className="console-window-dots" aria-hidden="true">
                  <span className="window-dot window-dot-red" />
                  <span className="window-dot window-dot-yellow" />
                  <span className="window-dot window-dot-green" />
                </div>

                <div className="console-widget-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeConsoleTab === 'diagram'}
                    onClick={() => setActiveConsoleTab('diagram')}
                    className={`console-tab-btn ${activeConsoleTab === 'diagram' ? 'active' : ''}`}
                  >
                    <span>⬡</span>
                    <span>{t.consolePreview.tabDiagram}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeConsoleTab === 'cli'}
                    onClick={() => setActiveConsoleTab('cli')}
                    className={`console-tab-btn ${activeConsoleTab === 'cli' ? 'active' : ''}`}
                  >
                    <span>⌨</span>
                    <span>{t.consolePreview.tabCli}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeConsoleTab === 'config'}
                    onClick={() => setActiveConsoleTab('config')}
                    className={`console-tab-btn ${activeConsoleTab === 'config' ? 'active' : ''}`}
                  >
                    <span>&#123;&#125;</span>
                    <span>{t.consolePreview.tabConfig}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeConsoleTab === 'preview'}
                    onClick={() => setActiveConsoleTab('preview')}
                    className={`console-tab-btn ${activeConsoleTab === 'preview' ? 'active' : ''}`}
                  >
                    <span>📱</span>
                    <span>{t.consolePreview.tabPreview}</span>
                  </button>
                </div>
              </div>

              {/* Console Body Tab Panels */}
              <div className="console-widget-body">
                {activeConsoleTab === 'diagram' && (
                  <div className="topology-flow-box">
                    <div className="topology-node">
                      <div className="topology-node-left">
                        <div className="topology-node-icon">📱</div>
                        <span className="topology-node-title">{t.consolePreview.topology.client}</span>
                      </div>
                      <span className="topology-node-metric">PWA Edge Cache</span>
                    </div>

                    <div className="topology-arrow">▼ 12ms Local Transit</div>

                    <div className="topology-node">
                      <div className="topology-node-left">
                        <div className="topology-node-icon">⚡</div>
                        <span className="topology-node-title">{t.consolePreview.topology.edge}</span>
                      </div>
                      <span className="topology-node-metric">KBL-Edge-1 Fiber</span>
                    </div>

                    <div className="topology-arrow">▼ 46ms Regional Backbone</div>

                    <div className="topology-node">
                      <div className="topology-node-left">
                        <div className="topology-node-icon">🧠</div>
                        <span className="topology-node-title">{t.consolePreview.topology.coreAi}</span>
                      </div>
                      <span className="topology-node-metric">me-central-1</span>
                    </div>

                    <div className="topology-arrow">▼ Instant Verification</div>

                    <div className="topology-node">
                      <div className="topology-node-left">
                        <div className="topology-node-icon">💵</div>
                        <span className="topology-node-title">{t.consolePreview.topology.settlement}</span>
                      </div>
                      <span className="topology-node-metric" style={{ color: '#ff9900', borderColor: 'rgba(255, 153, 0, 0.4)' }}>
                        AFN Settlement
                      </span>
                    </div>
                  </div>
                )}

                {activeConsoleTab === 'cli' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={handleCopyCli}
                        className="btn-enterprise-secondary"
                        style={{ paddingInline: '0.625rem', paddingBlock: '0.25rem', fontSize: '0.75rem' }}
                      >
                        {copiedCode ? t.consolePreview.copiedBtn : t.consolePreview.copyBtn}
                      </button>
                    </div>
                    <pre className="terminal-code-block">
                      <span className="terminal-comment"># Deploy a production PWA storefront on AriaCloud</span>{'\n'}
                      <span className="terminal-cmd">$ aria deploy \</span>{'\n'}
                      {'    '}--app <span style={{ color: '#6ee7b7' }}>kabul-saffron</span> \{'\n'}
                      {'    '}--domain <span style={{ color: '#6ee7b7' }}>kabul-saffron.af</span> \{'\n'}
                      {'    '}--region <span style={{ color: '#f59e0b' }}>me-central-1</span> \{'\n'}
                      {'    '}--settlement <span style={{ color: '#f59e0b' }}>cash-otp</span>{'\n\n'}
                      <span className="terminal-success">✔ Domain registered via MCIT (.af): OK (18ms)</span>{'\n'}
                      <span className="terminal-success">✔ Edge PWA compiled & cached: OK (sub-1.2s)</span>{'\n'}
                      <span className="terminal-success">✔ Cloud Mail SPF & DKIM keys injected: OK</span>{'\n'}
                      <span className="terminal-warning">⚡ OTP Handshake Code generated: 849-201</span>{'\n'}
                      <span className="terminal-cmd">🚀 Live URL: https://kabul-saffron.af</span>
                    </pre>
                  </div>
                )}

                {activeConsoleTab === 'config' && (
                  <pre className="terminal-code-block">
                    <span className="terminal-comment"># aria-manifest.yml — Enterprise Infrastructure Spec</span>{'\n'}
                    <span style={{ color: '#f472b6' }}>apiVersion</span>: <span style={{ color: '#f1f5f9' }}>v1</span>{'\n'}
                    <span style={{ color: '#f472b6' }}>kind</span>: <span style={{ color: '#f1f5f9' }}>SovereignStorefront</span>{'\n'}
                    <span style={{ color: '#f472b6' }}>metadata</span>:{'\n'}
                    {'  '}<span style={{ color: '#f472b6' }}>name</span>: <span style={{ color: '#6ee7b7' }}>kabul-diagnostic-clinic</span>{'\n'}
                    {'  '}<span style={{ color: '#f472b6' }}>region</span>: <span style={{ color: '#f59e0b' }}>me-central-1</span>{'\n'}
                    <span style={{ color: '#f472b6' }}>spec</span>:{'\n'}
                    {'  '}<span style={{ color: '#f472b6' }}>domains</span>:{'\n'}
                    {'    '}- <span style={{ color: '#6ee7b7' }}>kabulclinic.af</span>{'\n'}
                    {'  '}<span style={{ color: '#f472b6' }}>routing</span>:{'\n'}
                    {'    '}<span style={{ color: '#f472b6' }}>edgeCache</span>: <span style={{ color: '#10b981' }}>true</span>{'\n'}
                    {'    '}<span style={{ color: '#f472b6' }}>offlinePwaFallback</span>: <span style={{ color: '#10b981' }}>true</span>{'\n'}
                    {'  '}<span style={{ color: '#f472b6' }}>aiEngine</span>:{'\n'}
                    {'    '}<span style={{ color: '#f472b6' }}>model</span>: <span style={{ color: '#60a5fa' }}>aria-core-v4</span>{'\n'}
                    {'    '}<span style={{ color: '#f472b6' }}>languages</span>: [<span style={{ color: '#6ee7b7' }}>da</span>, <span style={{ color: '#6ee7b7' }}>ps</span>, <span style={{ color: '#6ee7b7' }}>en</span>]{'\n'}
                    {'    '}<span style={{ color: '#f472b6' }}>voiceEngine</span>: <span style={{ color: '#10b981' }}>true</span>{'\n'}
                    {'  '}<span style={{ color: '#f472b6' }}>settlement</span>:{'\n'}
                    {'    '}<span style={{ color: '#f472b6' }}>method</span>: <span style={{ color: '#ff9900' }}>hesabpay-and-cash-otp</span>
                  </pre>
                )}

                {activeConsoleTab === 'preview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', justifyContent: 'center' }}>
                    <div style={{ backgroundColor: '#1a2332', border: '1px solid #2a3649', borderRadius: '6px', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9375rem' }}>کلینیک تشخیصیه کابل · Kabul Clinic</span>
                        <span style={{ fontSize: '0.6875rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', padding: '2px 6px', borderRadius: '4px' }}>
                          PWA آماده آفلاین
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.5 }}>
                        داکتر متخصص داخله: ۹:۰۰ صبح الی ۲:۰۰ بعد از ظهر (نوبت‌دهی فوری با واتساپ)
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#38bdf8', border: '1px solid #2563eb', padding: '2px 8px', borderRadius: '4px' }}>
                          دامنه: kabulclinic.af
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#10b981', border: '1px solid #059669', padding: '2px 8px', borderRadius: '4px' }}>
                          ایمیل: info@kabulclinic.af
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
