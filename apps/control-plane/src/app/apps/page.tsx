'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Deployment {
  id: string;
  appName: string;
  framework: string;
  gitRepoUrl?: string;
  serviceArn?: string;
  customDomain?: string;
  status: 'deploying' | 'running' | 'paused' | 'failed';
  allocatedMemoryGb: number;
  allocatedVcpu: number;
  publicUrl: string;
  healthCheckUrl: string;
  createdAt: string;
  latestLogSnippet?: string;
}

export default function AppsPage() {
  const [apps, setApps] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [appName, setAppName] = useState('');
  const [framework, setFramework] = useState('nodejs');
  const [gitRepoUrl, setGitRepoUrl] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [cpu, setCpu] = useState(0.5);
  const [memory, setMemory] = useState(1.0);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/apps');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to load apps.');
      setApps(data.apps || []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function deploy(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName,
          framework,
          gitRepoUrl: framework !== 'docker' ? gitRepoUrl : undefined,
          imageUri: framework === 'docker' ? imageUri : undefined,
          cpu,
          memory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Deploy failed.');
      setAppName('');
      setGitRepoUrl('');
      setImageUri('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(deployment: Deployment) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: deployment.status === 'paused' ? 'resume' : 'pause',
          deploymentId: deployment.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Action failed.');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="apps-shell">
      <div className="apps-wrap">
        <header className="apps-head">
          <div>
            <h1>Application Runner</h1>
            <p>Deploy and manage containerized apps.</p>
          </div>
          <Link href="/" className="back-link">← Back to console</Link>
        </header>

        <form className="apps-form" onSubmit={deploy}>
          <input
            className="inp"
            placeholder="App name (e.g. my-api)"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            required
          />
          <select className="inp" value={framework} onChange={(e) => setFramework(e.target.value)}>
            <option value="nodejs">Node.js</option>
            <option value="python">Python</option>
            <option value="laravel">Laravel (PHP)</option>
            <option value="docker">Docker image</option>
          </select>
          {framework === 'docker' ? (
            <input
              className="inp"
              placeholder="Image URI (private registry)"
              value={imageUri}
              onChange={(e) => setImageUri(e.target.value)}
              required
            />
          ) : (
            <input
              className="inp"
              placeholder="Git repository URL (https://…)"
              value={gitRepoUrl}
              onChange={(e) => setGitRepoUrl(e.target.value)}
              required
            />
          )}
          <select className="inp" value={cpu} onChange={(e) => setCpu(Number(e.target.value))}>
            <option value={0.25}>0.25 vCPU</option>
            <option value={0.5}>0.5 vCPU</option>
            <option value={1}>1 vCPU</option>
            <option value={2}>2 vCPU</option>
          </select>
          <select className="inp" value={memory} onChange={(e) => setMemory(Number(e.target.value))}>
            <option value={0.5}>0.5 GB</option>
            <option value={1}>1 GB</option>
            <option value={2}>2 GB</option>
            <option value={3}>3 GB</option>
            <option value={4}>4 GB</option>
          </select>
          <button className="btn" type="submit" disabled={busy || !appName}>
            {busy ? 'Working…' : 'Deploy'}
          </button>
        </form>

        {error && <div className="err">{error}</div>}

        <section className="apps-list">
          <h2>Deployments</h2>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : apps.length === 0 ? (
            <p className="muted">No deployments yet.</p>
          ) : (
            <div className="table">
              <div className="row head">
                <span>Name</span><span>Runtime</span><span>Size</span><span>Status</span><span>URL</span><span />
              </div>
              {apps.map((a) => (
                <div className="row" key={a.id}>
                  <span className="strong">{a.appName}</span>
                  <span className="mono">{a.framework}</span>
                  <span className="mono">{a.allocatedVcpu}vCPU / {a.allocatedMemoryGb}GB</span>
                  <span>
                    <span className={`badge badge-${a.status}`}>{a.status}</span>
                  </span>
                  <a className="mono url" href={a.publicUrl} target="_blank" rel="noopener noreferrer">
                    {a.publicUrl}
                  </a>
                  <button
                    className="mini-btn"
                    onClick={() => toggle(a)}
                    disabled={busy || a.status === 'deploying' || a.status === 'failed'}
                  >
                    {a.status === 'paused' ? 'Resume' : 'Pause'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .apps-shell { min-height: 100vh; background: #0b132b; color: #e2e8f0; padding: 32px; font-family: 'Open Sans', system-ui, sans-serif; }
        .apps-wrap { max-width: 1100px; margin: 0 auto; }
        .apps-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .apps-head h1 { margin: 0; font-size: 22px; }
        .apps-head p { margin: 4px 0 0; color: #94a3b8; font-size: 13px; }
        .back-link { color: #f59e0b; text-decoration: none; font-size: 13px; }
        .apps-form { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #111b31; border: 1px solid #24324f; padding: 16px; border-radius: 10px; margin-bottom: 20px; }
        .inp { background: #0b132b; border: 1px solid #24324f; color: #e2e8f0; padding: 10px 12px; border-radius: 7px; font-size: 14px; }
        .btn { grid-column: 1 / -1; background: linear-gradient(135deg, #ec7211, #d86208); color: #fff; border: 0; padding: 12px; border-radius: 7px; font-weight: 700; cursor: pointer; }
        .btn:disabled { opacity: .5; cursor: not-allowed; }
        .err { background: rgba(225,29,72,.15); border: 1px solid rgba(225,29,72,.4); color: #fda4af; padding: 10px 12px; border-radius: 7px; margin-bottom: 20px; font-size: 13px; }
        .apps-list h2 { font-size: 16px; margin: 0 0 12px; }
        .muted { color: #94a3b8; font-size: 13px; }
        .table { border: 1px solid #24324f; border-radius: 10px; overflow: hidden; }
        .row { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr 1.4fr auto; gap: 12px; align-items: center; padding: 12px 16px; border-bottom: 1px solid #1a2844; font-size: 13px; }
        .row:last-child { border-bottom: 0; }
        .row.head { background: #0f1a30; color: #64748b; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
        .strong { font-weight: 700; color: #fff; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
        .url { color: #60a5fa; text-decoration: none; }
        .badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
        .badge-running { background: rgba(16,185,129,.15); color: #34d399; border: 1px solid rgba(16,185,129,.4); }
        .badge-deploying { background: rgba(59,130,246,.15); color: #60a5fa; border: 1px solid rgba(59,130,246,.4); }
        .badge-paused { background: rgba(245,158,11,.15); color: #fbbf24; border: 1px solid rgba(245,158,11,.4); }
        .badge-failed { background: rgba(225,29,72,.15); color: #fda4af; border: 1px solid rgba(225,29,72,.4); }
        .mini-btn { background: #1e293b; border: 1px solid #334155; color: #cbd5e1; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; }
        .mini-btn:disabled { opacity: .4; cursor: not-allowed; }
      `}</style>
    </main>
  );
}
