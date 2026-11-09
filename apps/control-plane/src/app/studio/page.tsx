'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Aria Walid (Kabul Broadcast — Male)' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Aria Maryam (Herat Narrative — Female)' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Aria Rostam (Kandahar Commerce — Male)' },
];

const VOICE_MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2 (studio)' },
  { id: 'eleven_flash_v2_5', name: 'Eleven Flash v2.5 (fast)' },
];

const RESOLUTIONS = [
  { id: '1024x1024', w: 1024, h: 1024, label: '1024 × 1024 (1:1)' },
  { id: '1280x720', w: 1280, h: 720, label: '1280 × 720 (16:9)' },
  { id: '720x1280', w: 720, h: 1280, label: '720 × 1280 (9:16)' },
];

const ASSISTANT_MODELS = [
  { id: 'amazon.nova-micro-v1:0', name: 'Nova Micro (fast)' },
  { id: 'amazon.nova-lite-v1:0', name: 'Nova Lite (capable)' },
];

interface Output {
  type: 'voice' | 'image' | 'assistant';
  text?: string;
  audioBase64?: string;
  imageDataUrl?: string;
  credits?: number;
  tokens?: number;
  latencyMs?: number;
  simulated?: boolean;
}

export default function StudioPage() {
  const [tab, setTab] = useState<'voice' | 'image' | 'assistant'>('voice');
  const [overview, setOverview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<Output | null>(null);

  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [voiceModel, setVoiceModel] = useState(VOICE_MODELS[0].id);
  const [voiceText, setVoiceText] = useState('به پلتفرم آریا کلاود خوش آمدید.');
  const [imagePrompt, setImagePrompt] = useState('Herat saffron gift box, export packaging');
  const [resolution, setResolution] = useState('1024x1024');
  const [assistantModel, setAssistantModel] = useState(ASSISTANT_MODELS[0].id);
  const [assistantInput, setAssistantInput] = useState('Write a short Dari product description for Herat saffron.');
  const [voiceReply, setVoiceReply] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/studio/overview');
      const d = await res.json();
      if (res.ok) setOverview(d);
    } catch { /* overview optional */ }
  }

  useEffect(() => { load(); }, []);

  async function synthesize() {
    setBusy(true); setError(null); setOutput(null);
    try {
      const res = await fetch('/api/studio/voice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: voiceText, voiceId, modelId: voiceModel }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || d.error || 'Synthesis failed.');
      setOutput({ type: 'voice', audioBase64: d.audioBase64, credits: d.creditsDeducted, latencyMs: d.latencyMs, simulated: d.mode !== 'live' });
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function generateImage() {
    setBusy(true); setError(null); setOutput(null);
    try {
      const r = RESOLUTIONS.find((x) => x.id === resolution)!;
      const res = await fetch('/api/studio/image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt, width: r.w, height: r.h }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || d.error || 'Generation failed.');
      setOutput({ type: 'image', imageDataUrl: d.imageDataUrl, credits: d.creditsDeducted, latencyMs: d.latencyMs, simulated: d.mode !== 'live' });
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function sendAssistant() {
    if (!assistantInput.trim()) return;
    setBusy(true); setError(null); setOutput(null);
    try {
      const res = await fetch('/api/studio/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: assistantInput, modelId: assistantModel, language: 'fa-AF', voiceReply }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || d.error || 'Assistant failed.');
      setOutput({ type: 'assistant', text: d.replyText, audioBase64: d.audioBase64, tokens: d.totalTokens, credits: d.creditsDeducted, latencyMs: d.latencyMs, simulated: d.mode !== 'live' });
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  const history = overview?.history || [];
  const fmt = (iso: string) => { try { return new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }); } catch { return iso; } };

  return (
    <main className="st">
      <header className="st-head">
        <div>
          <h1>AI Studio</h1>
          <p>Model playground — voice, image and assistant.</p>
        </div>
        <div className="st-credits">
          <b>{overview ? overview.credits.toLocaleString() : '…'}</b>
          <span>credits</span>
          <Link href="/" className="st-back">← Overview</Link>
        </div>
      </header>

      {error && <div className="st-error">{error}</div>}

      <div className="st-tabs">
        {(['voice', 'image', 'assistant'] as const).map((t) => (
          <button key={t} className={`st-tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setOutput(null); setError(null); }}>
            {t === 'voice' ? '🎙️ Voice' : t === 'image' ? '🎨 Image' : '💬 Assistant'}
          </button>
        ))}
      </div>

      <div className="st-grid">
        <section className="st-panel">
          {tab === 'voice' && (
            <>
              <h2>Text to speech</h2>
              <label className="st-field">Voice
                <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
                  {VOICES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </label>
              <label className="st-field">Model
                <select value={voiceModel} onChange={(e) => setVoiceModel(e.target.value)}>
                  {VOICE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label className="st-field">Script
                <textarea rows={4} value={voiceText} onChange={(e) => setVoiceText(e.target.value)} />
              </label>
              <button className="st-btn" onClick={synthesize} disabled={busy}>{busy ? 'Synthesizing…' : 'Generate voice'}</button>
            </>
          )}

          {tab === 'image' && (
            <>
              <h2>Product image</h2>
              <label className="st-field">Size
                <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                  {RESOLUTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </label>
              <label className="st-field">Prompt
                <textarea rows={3} value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} />
              </label>
              <button className="st-btn" onClick={generateImage} disabled={busy}>{busy ? 'Generating…' : 'Generate image'}</button>
            </>
          )}

          {tab === 'assistant' && (
            <>
              <h2>Business assistant</h2>
              <label className="st-field">Model
                <select value={assistantModel} onChange={(e) => setAssistantModel(e.target.value)}>
                  {ASSISTANT_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label className="st-field">Message
                <textarea rows={3} value={assistantInput} onChange={(e) => setAssistantInput(e.target.value)} />
              </label>
              <label className="st-check">
                <input type="checkbox" checked={voiceReply} onChange={(e) => setVoiceReply(e.target.checked)} />
                Reply with voice (ElevenLabs)
              </label>
              <button className="st-btn" onClick={sendAssistant} disabled={busy}>{busy ? 'Thinking…' : 'Send'}</button>
            </>
          )}

          {output && (
            <div className="st-output">
              {output.simulated && <span className="st-badge warn">simulated — no model key configured</span>}
              {output.type === 'voice' && output.audioBase64 && <audio controls src={output.audioBase64} className="st-audio" />}
              {output.type === 'voice' && !output.audioBase64 && <p className="st-muted">No audio returned (simulated mode).</p>}
              {output.type === 'image' && output.imageDataUrl && <img src={output.imageDataUrl} alt="Generated" className="st-img" />}
              {output.type === 'image' && !output.imageDataUrl && <p className="st-muted">No image returned (simulated mode).</p>}
              {output.type === 'assistant' && <p className="st-reply">{output.text}</p>}
              {output.type === 'assistant' && output.audioBase64 && <audio controls src={output.audioBase64} className="st-audio" />}
              {output.credits != null && (
                <p className="st-muted">{output.credits} credits{output.tokens ? ` · ${output.tokens} tokens` : ''}{output.latencyMs != null ? ` · ${output.latencyMs} ms` : ''}</p>
              )}
            </div>
          )}
        </section>

        <section className="st-panel">
          <h2>Recent activity ({history.length})</h2>
          {history.length === 0 ? (
            <p className="st-muted">No generations yet.</p>
          ) : (
            <table className="st-table">
              <thead><tr><th>Type</th><th>Model</th><th>Credits</th><th>When</th></tr></thead>
              <tbody>
                {history.map((h: any, i: number) => (
                  <tr key={i}>
                    <td><span className={`st-badge ${h.modality === 'image' ? '' : 'blue'}`}>{h.modality}</span></td>
                    <td className="st-mono">{h.model_id}</td>
                    <td>{h.credits_deducted}</td>
                    <td>{fmt(h.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <style>{`
        .st { min-height: 100vh; background: #0b132b; color: #e2e8f0; padding: 32px; font-family: 'Open Sans', system-ui, sans-serif; }
        .st-head { max-width: 1100px; margin: 0 auto 20px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
        .st-head h1 { margin: 0; font-size: 22px; }
        .st-head p { margin: 4px 0 0; color: #94a3b8; font-size: 13px; }
        .st-credits { display: flex; align-items: baseline; gap: 10px; background: #111b31; border: 1px solid #24324f; border-radius: 10px; padding: 12px 16px; }
        .st-credits b { font-size: 22px; }
        .st-credits span { font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
        .st-back { color: #f59e0b; text-decoration: none; font-size: 13px; font-weight: 600; margin-inline-start: 6px; }
        .st-error { max-width: 1100px; margin: 0 auto 16px; background: rgba(225,29,72,.15); border: 1px solid rgba(225,29,72,.4); color: #fda4af; padding: 10px 12px; border-radius: 8px; font-size: 13px; }
        .st-tabs { max-width: 1100px; margin: 0 auto 16px; display: flex; gap: 6px; }
        .st-tab { border: 1px solid #24324f; background: #111b31; color: #cbd5e1; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; }
        .st-tab.active { background: #f59e0b; color: #0b132b; border-color: #f59e0b; }
        .st-grid { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; }
        .st-panel { background: #111b31; border: 1px solid #24324f; border-radius: 10px; padding: 20px; }
        .st-panel h2 { margin: 0 0 14px; font-size: 16px; }
        .st-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; font-size: 12px; font-weight: 700; color: #64748b; }
        .st-field select, .st-field textarea { padding: 9px 11px; border: 1px solid #24324f; border-radius: 7px; font-size: 14px; color: #e2e8f0; background: #0b132b; font-family: inherit; }
        .st-check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #cbd5e1; margin-bottom: 12px; }
        .st-btn { background: linear-gradient(135deg,#ec7211,#d86208); color: #fff; border: 0; padding: 11px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
        .st-btn:disabled { opacity: .5; cursor: not-allowed; }
        .st-output { margin-top: 16px; padding: 14px; background: #0f1a30; border: 1px solid #1a2844; border-radius: 10px; display: flex; flex-direction: column; gap: 10px; }
        .st-audio { width: 100%; }
        .st-img { max-width: 100%; border-radius: 8px; border: 1px solid #24324f; }
        .st-reply { margin: 0; font-size: 14px; white-space: pre-wrap; }
        .st-muted { color: #94a3b8; font-size: 13px; margin: 0; }
        .st-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #94a3b8; }
        .st-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
        .st-badge.blue { background: rgba(59,130,246,.15); color: #60a5fa; border-color: rgba(59,130,246,.4); }
        .st-badge.warn { background: rgba(245,158,11,.15); color: #fbbf24; border-color: rgba(245,158,11,.4); }
        .st-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .st-table th { text-align: start; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; padding: 6px 8px; border-bottom: 1px solid #1a2844; }
        .st-table td { padding: 10px 8px; border-bottom: 1px solid #16223a; }
        .st-table tr:last-child td { border-bottom: 0; }
        @media (max-width: 800px) { .st-grid { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  );
}
