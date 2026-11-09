'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Overview {
  counts: { tenants: number; users: number; deployments: number; totalAiCredits: number };
  recentAudit: Array<{ action: string; actor_email: string | null; target_tenant_id: string | null; created_at: string }>;
  recentGenerations: Array<{ tenant_id: string; modality: string; model_id: string; credits_deducted: number; created_at: string }>;
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/overview');
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load overview.');
        setOverview(data);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, []);

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  return (
    <main className="ov-shell">
      <header className="ov-head">
        <div>
          <h1>AriaCloud · Platform Overview</h1>
          <p>Multi-tenant infrastructure, AI studio, billing and apps at a glance.</p>
        </div>
        <div className="ov-head-actions">
          <Link href="/admin/tenants" className="ov-link">Tenants</Link>
          <Link href="/studio" className="ov-link">AI Studio</Link>
          <Link href="/apps" className="ov-link">Application Runner</Link>
          <button className="ov-signout" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {error && <div className="ov-err">{error}</div>}

      <section className="ov-cards">
        {[
          { label: 'Tenants', value: overview?.counts.tenants },
          { label: 'Users', value: overview?.counts.users },
          { label: 'App deployments', value: overview?.counts.deployments },
          { label: 'AI credits (platform)', value: overview ? overview.counts.totalAiCredits.toLocaleString() : undefined },
        ].map((c) => (
          <div className="ov-card" key={c.label}>
            <span className="ov-card-label">{c.label}</span>
            <span className="ov-card-value">{c.value ?? '…'}</span>
          </div>
        ))}
      </section>

      <section className="ov-grid">
        <div className="ov-panel">
          <h2>Recent activity (audit)</h2>
          {!overview ? (
            <p className="ov-muted">Loading…</p>
          ) : overview.recentAudit.length === 0 ? (
            <p className="ov-muted">No administrative actions yet.</p>
          ) : (
            <table className="ov-table">
              <thead>
                <tr><th>Action</th><th>Actor</th><th>Tenant</th><th>When</th></tr>
              </thead>
              <tbody>
                {overview.recentAudit.map((a, i) => (
                  <tr key={i}>
                    <td className="ov-mono">{a.action}</td>
                    <td>{a.actor_email || '—'}</td>
                    <td className="ov-mono">{a.target_tenant_id ? a.target_tenant_id.slice(0, 8) : '—'}</td>
                    <td>{fmt(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="ov-panel">
          <h2>Recent AI generations</h2>
          {!overview ? (
            <p className="ov-muted">Loading…</p>
          ) : overview.recentGenerations.length === 0 ? (
            <p className="ov-muted">No generations yet.</p>
          ) : (
            <table className="ov-table">
              <thead>
                <tr><th>Modality</th><th>Model</th><th>Credits</th><th>When</th></tr>
              </thead>
              <tbody>
                {overview.recentGenerations.map((g, i) => (
                  <tr key={i}>
                    <td>{g.modality}</td>
                    <td className="ov-mono">{g.model_id}</td>
                    <td>{g.credits_deducted}</td>
                    <td>{fmt(g.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <style>{`
        .ov-shell { min-height: 100vh; background: #0b132b; color: #e2e8f0; padding: 32px; font-family: 'Open Sans', system-ui, sans-serif; }
        .ov-head { max-width: 1200px; margin: 0 auto 28px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
        .ov-head h1 { margin: 0; font-size: 24px; }
        .ov-head p { margin: 6px 0 0; color: #94a3b8; font-size: 13px; }
        .ov-head-actions { display: flex; gap: 10px; align-items: center; }
        .ov-link { color: #f59e0b; text-decoration: none; font-size: 13px; font-weight: 600; }
        .ov-signout { background: #1e293b; border: 1px solid #334155; color: #cbd5e1; padding: 7px 12px; border-radius: 7px; cursor: pointer; font-size: 13px; }
        .ov-err { max-width: 1200px; margin: 0 auto 20px; background: rgba(225,29,72,.15); border: 1px solid rgba(225,29,72,.4); color: #fda4af; padding: 10px 12px; border-radius: 7px; font-size: 13px; }
        .ov-cards { max-width: 1200px; margin: 0 auto 24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .ov-card { background: #111b31; border: 1px solid #24324f; border-radius: 10px; padding: 18px 20px; }
        .ov-card-label { display: block; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: .04em; font-weight: 700; }
        .ov-card-value { display: block; margin-top: 8px; font-size: 28px; font-weight: 800; color: #fff; }
        .ov-grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .ov-panel { background: #111b31; border: 1px solid #24324f; border-radius: 10px; padding: 18px 20px; }
        .ov-panel h2 { margin: 0 0 14px; font-size: 15px; }
        .ov-muted { color: #64748b; font-size: 13px; }
        .ov-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .ov-table th { text-align: start; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; padding: 6px 8px; border-bottom: 1px solid #1a2844; }
        .ov-table td { padding: 8px; border-bottom: 1px solid #16223a; }
        .ov-table tr:last-child td { border-bottom: 0; }
        .ov-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #94a3b8; }
        @media (max-width: 900px) { .ov-cards, .ov-grid { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  );
}
