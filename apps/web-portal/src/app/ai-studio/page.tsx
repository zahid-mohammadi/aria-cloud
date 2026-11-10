'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@aria-cloud/ui';

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
  { id: 'aria-text-fast', name: 'Aria Multilingual Text (Fast)' },
  { id: 'aria-text-capable', name: 'Aria Multilingual Text (Capable)' },
];

interface Output {
  type: 'voice' | 'image' | 'assistant';
  text?: string;
  audioBase64?: string;
  imageDataUrl?: string;
  credits?: number;
  remaining?: number;
  tokens?: number;
  latencyMs?: number;
  simulated?: boolean;
}

export default function AiStudioPage() {
  const { dir } = useTranslation();
  const [tab, setTab] = useState<'voice' | 'image' | 'assistant'>('voice');
  const [overview, setOverview] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<Output | null>(null);

  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [voiceModel, setVoiceModel] = useState(VOICE_MODELS[0].id);
  const [voiceText, setVoiceText] = useState(
    'به پلتفرم آریا کلاود خوش آمدید. زعفران درجه یک هرات با بسته‌بندی صادراتی و پرداخت آنی حساب‌پی آماده ارسال است.'
  );
  const [imagePrompt, setImagePrompt] = useState('Herat saffron gift box, export packaging, studio product photo');
  const [resolution, setResolution] = useState('1024x1024');
  const [assistantModel, setAssistantModel] = useState(ASSISTANT_MODELS[0].id);
  const [assistantInput, setAssistantInput] = useState('Write a short Dari product description for Herat saffron.');

  async function load() {
    try {
      const [ovRes, jobsRes] = await Promise.all([
        fetch('/api/studio/overview'),
        fetch('/api/jobs'),
      ]);
      const d = await ovRes.json();
      if (ovRes.ok) setOverview(d);
      const j = await jobsRes.json();
      if (jobsRes.ok && Array.isArray(j.jobs)) setJobs(j.jobs);
    } catch {
      /* overview optional */
    }
  }

  async function enqueueAsyncJob(jobType: 'generate_voice' | 'generate_image', payload: Record<string, any>) {
    setBusy(true);
    setError(null);
    setOutput(null);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType, payload }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to queue job.');
      await load();

      // Poll up to 15 times (1s intervals) so completed job result appears inline
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 800));
        const stRes = await fetch(`/api/jobs/${d.jobId}`);
        const st = await stRes.json();
        const job = st.job;
        if (job?.status === 'completed' && job.result) {
          if (jobType === 'generate_voice') {
            setOutput({
              type: 'voice',
              audioBase64: job.result.audioBase64,
              credits: job.result.creditsDeducted,
              remaining: job.result.remainingCredits,
              latencyMs: job.result.latencyMs,
              simulated: job.result.mode !== 'live',
            });
          } else {
            setOutput({
              type: 'image',
              imageDataUrl: job.result.imageDataUrl,
              credits: job.result.creditsDeducted,
              remaining: job.result.remainingCredits,
              latencyMs: job.result.latencyMs,
              simulated: job.result.mode !== 'live',
            });
          }
          await load();
          return;
        }
        if (job?.status === 'failed') {
          throw new Error(job.error_message || 'Async job failed.');
        }
      }
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function synthesize() {
    setBusy(true); setError(null); setOutput(null);
    try {
      const res = await fetch('/api/studio/voice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: voiceText, voiceId, modelId: voiceModel }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || d.error || 'Synthesis failed.');
      setOutput({
        type: 'voice', audioBase64: d.audioBase64, credits: d.creditsDeducted,
        remaining: d.remainingCredits, latencyMs: d.latencyMs, simulated: d.mode !== 'live',
      });
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
      setOutput({
        type: 'image', imageDataUrl: d.imageDataUrl, credits: d.creditsDeducted,
        remaining: d.remainingCredits, latencyMs: d.latencyMs, simulated: d.mode !== 'live',
      });
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function sendAssistant() {
    if (!assistantInput.trim()) return;
    setBusy(true); setError(null); setOutput(null);
    try {
      const res = await fetch('/api/studio/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: assistantInput, modelId: assistantModel, language: 'fa-AF' }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || d.error || 'Assistant failed.');
      setOutput({
        type: 'assistant', text: d.replyText, tokens: d.totalTokens,
        credits: d.creditsDeducted, latencyMs: d.latencyMs, simulated: d.mode !== 'live',
      });
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  const history = overview?.history || [];
  const fmt = (iso: string) => { try { return new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }); } catch { return iso; } };

  return (
    <div dir={dir} className="studio">
      <header className="studio-head">
        <div>
          <h1>AI Studio</h1>
          <p>Voiceovers, product images and a business assistant for your brand.</p>
        </div>
        <div className="studio-credits">
          <span className="studio-credit-num">{overview ? overview.credits.toLocaleString() : '…'}</span>
          <span className="studio-credit-label">AI credits</span>
          {overview?.monthlyQuota ? <span className="studio-credit-label">/ {overview.monthlyQuota.toLocaleString()} quota</span> : null}
          <Link href="/billing" className="studio-topup">Top up →</Link>
        </div>
      </header>

      {error && <div className="studio-error">{error}</div>}

      <div className="studio-tabs">
        {(['voice', 'image', 'assistant'] as const).map((t) => (
          <button key={t} className={`studio-tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setOutput(null); setError(null); }}>
            {t === 'voice' ? '🎙️ Voice' : t === 'image' ? '🎨 Image' : '💬 Assistant'}
          </button>
        ))}
      </div>

      <div className="studio-grid">
        <section className="studio-panel">
          {tab === 'voice' && (
            <>
              <h2>Text to speech</h2>
              <label className="studio-field">Voice
                <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
                  {VOICES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </label>
              <label className="studio-field">Model
                <select value={voiceModel} onChange={(e) => setVoiceModel(e.target.value)}>
                  {VOICE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label className="studio-field">Script
                <textarea rows={4} value={voiceText} onChange={(e) => setVoiceText(e.target.value)} />
              </label>
              <div className="studio-btn-row">
                <button className="studio-btn" onClick={synthesize} disabled={busy}>{busy ? 'Synthesizing…' : 'Generate voice'}</button>
                <button
                  type="button"
                  className="studio-btn secondary"
                  disabled={busy}
                  onClick={() => enqueueAsyncJob('generate_voice', { text: voiceText, voiceId, modelId: voiceModel })}
                >
                  Queue background job
                </button>
              </div>
            </>
          )}

          {tab === 'image' && (
            <>
              <h2>Product image</h2>
              <label className="studio-field">Size
                <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                  {RESOLUTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </label>
              <label className="studio-field">Prompt
                <textarea rows={3} value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} />
              </label>
              <div className="studio-btn-row">
                <button className="studio-btn" onClick={generateImage} disabled={busy}>{busy ? 'Generating…' : 'Generate image'}</button>
                <button
                  type="button"
                  className="studio-btn secondary"
                  disabled={busy}
                  onClick={() => {
                    const r = RESOLUTIONS.find((x) => x.id === resolution)!;
                    enqueueAsyncJob('generate_image', { prompt: imagePrompt, width: r.w, height: r.h });
                  }}
                >
                  Queue background job
                </button>
              </div>
            </>
          )}

          {tab === 'assistant' && (
            <>
              <h2>Business assistant</h2>
              <label className="studio-field">Model
                <select value={assistantModel} onChange={(e) => setAssistantModel(e.target.value)}>
                  {ASSISTANT_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label className="studio-field">Message
                <textarea rows={3} value={assistantInput} onChange={(e) => setAssistantInput(e.target.value)} />
              </label>
              <button className="studio-btn" onClick={sendAssistant} disabled={busy}>{busy ? 'Thinking…' : 'Send'}</button>
            </>
          )}

          {output && (
            <div className="studio-output">
              {output.simulated && <span className="studio-badge warn">simulated — no model key configured</span>}
              {output.type === 'voice' && output.audioBase64 && <audio controls src={output.audioBase64} className="studio-audio" />}
              {output.type === 'voice' && !output.audioBase64 && <p className="studio-muted">No audio returned (simulated mode).</p>}
              {output.type === 'image' && output.imageDataUrl && <img src={output.imageDataUrl} alt="Generated" className="studio-img" />}
              {output.type === 'image' && !output.imageDataUrl && <p className="studio-muted">No image returned (simulated mode).</p>}
              {output.type === 'assistant' && <p className="studio-reply">{output.text}</p>}
              {output.credits != null && (
                <p className="studio-muted">
                  {output.credits} credits{output.remaining != null ? ` · ${output.remaining} remaining` : ''}
                  {output.tokens ? ` · ${output.tokens} tokens` : ''}
                  {output.latencyMs != null ? ` · ${output.latencyMs} ms` : ''}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="studio-panel">
          <h2>Recent activity ({history.length})</h2>
          {history.length === 0 ? (
            <p className="studio-muted">No generations yet — try one on the left.</p>
          ) : (
            <table className="studio-table">
              <thead><tr><th>Type</th><th>Model</th><th>Credits</th><th>When</th></tr></thead>
              <tbody>
                {history.map((h: any, i: number) => (
                  <tr key={i}>
                    <td><span className={`studio-badge ${h.modality === 'image' ? '' : 'blue'}`}>{h.modality}</span></td>
                    <td className="studio-mono">{h.model_id}</td>
                    <td>{h.credits_deducted}</td>
                    <td>{fmt(h.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 style={{ marginTop: 22 }}>Async Job Queue ({jobs.length})</h2>
          {jobs.length === 0 ? (
            <p className="studio-muted">No background jobs queued yet.</p>
          ) : (
            <table className="studio-table">
              <thead><tr><th>Job</th><th>Status</th><th>Attempts</th><th>Created</th></tr></thead>
              <tbody>
                {jobs.slice(0, 6).map((j: any) => (
                  <tr key={j.id}>
                    <td className="studio-mono">{j.job_type}</td>
                    <td><span className={`studio-badge ${j.status === 'completed' ? 'blue' : j.status === 'failed' ? 'warn' : ''}`}>{j.status}</span></td>
                    <td>{j.attempts}/{j.max_attempts}</td>
                    <td>{fmt(j.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <style>{`
        .studio-btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .studio-btn.secondary { background: #fff; color: #16191f; border: 1px solid #d4d9e0; }
        .studio { max-width: 1100px; margin: 0 auto; padding: 24px; color: #16191f; }
        .studio-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
        .studio-head h1 { margin: 0; font-size: 22px; }
        .studio-head p { margin: 4px 0 0; color: #687078; font-size: 13px; }
        .studio-credits { display: flex; align-items: baseline; gap: 10px; background: #fff; border: 1px solid #e3e8ee; border-radius: 10px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(15,23,42,.05); }
        .studio-credit-num { font-size: 22px; font-weight: 800; }
        .studio-credit-label { font-size: 12px; color: #687078; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
        .studio-topup { color: #ff9900; text-decoration: none; font-size: 13px; font-weight: 700; margin-inline-start: 6px; }
        .studio-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
        .studio-tabs { display: flex; gap: 6px; margin-bottom: 16px; }
        .studio-tab { border: 1px solid #e3e8ee; background: #fff; color: #16191f; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; }
        .studio-tab.active { background: #ff9900; color: #fff; border-color: #ff9900; }
        .studio-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; }
        .studio-panel { background: #fff; border: 1px solid #e3e8ee; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(15,23,42,.05); }
        .studio-panel h2 { margin: 0 0 14px; font-size: 16px; }
        .studio-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; font-size: 12px; font-weight: 700; color: #687078; }
        .studio-field select, .studio-field textarea { padding: 9px 11px; border: 1px solid #d4d9e0; border-radius: 7px; font-size: 14px; color: #16191f; font-family: inherit; }
        .studio-btn { background: linear-gradient(135deg,#ff9900,#e68300); color: #fff; border: 0; padding: 11px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
        .studio-btn:disabled { opacity: .5; cursor: not-allowed; }
        .studio-output { margin-top: 16px; padding: 14px; background: #f8fafc; border: 1px solid #eef2f6; border-radius: 10px; display: flex; flex-direction: column; gap: 10px; }
        .studio-audio { width: 100%; }
        .studio-img { max-width: 100%; border-radius: 8px; border: 1px solid #e3e8ee; }
        .studio-reply { margin: 0; font-size: 14px; white-space: pre-wrap; }
        .studio-muted { color: #687078; font-size: 13px; margin: 0; }
        .studio-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
        .studio-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
        .studio-badge.blue { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
        .studio-badge.warn { background: #fffbeb; color: #b45309; border-color: #fde68a; }
        .studio-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .studio-table th { text-align: start; color: #687078; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; padding: 6px 8px; border-bottom: 1px solid #eef2f6; }
        .studio-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
        .studio-table tr:last-child td { border-bottom: 0; }
        @media (max-width: 800px) { .studio-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
