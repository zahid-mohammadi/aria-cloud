'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface TenantSummary {
  id: string;
  business_name: string;
  subdomain: string;
  plan_tier: string;
  account_status: string;
  subscription_end_date: string;
  user_count: number;
  deployment_count: number;
  afn_balance_pul: number;
  credit_balance: number;
}

interface TenantDetail {
  tenant: any;
  wallet: any;
  aiWallet: any;
  users: any[];
  deployments: any[];
  invoices: any[];
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  grace_period: 'Grace',
  suspended: 'Suspended',
  archived: 'Archived',
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadList() {
    try {
      const res = await fetch('/api/admin/tenants');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load tenants.');
      setTenants(data.tenants || []);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function openTenant(id: string) {
    setSelected(id);
    setDetail(null);
    try {
      const res = await fetch(`/api/admin/tenants?id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load tenant.');
      setDetail(data);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function setStatus(action: 'suspend' | 'activate' | 'archive') {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, tenantId: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Action failed.');
      await loadList();
      await openTenant(selected);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function setCompliance(action: 'set_screening' | 'set_kyc', status: string) {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, status, tenantId: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Action failed.');
      await openTenant(selected);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function screenNow() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'screen', tenantId: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Screening failed.');
      await openTenant(selected);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  return (
    <main className="tn-shell">
      <header className="tn-head">
        <div>
          <h1>Tenants</h1>
          <p>Manage every tenant, their wallets, users and deployments.</p>
        </div>
        <Link href="/" className="tn-back">← Overview</Link>
      </header>

      {error && <div className="tn-err">{error}</div>}

      {!selected ? (
        <div className="tn-panel">
          <table className="tn-table">
            <thead>
              <tr>
                <th>Business</th><th>Subdomain</th><th>Plan</th><th>Status</th>
                <th>Users</th><th>Apps</th><th>Credits</th><th>AFN</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="tn-row" onClick={() => openTenant(t.id)}>
                  <td className="tn-strong">{t.business_name}</td>
                  <td className="tn-mono">{t.subdomain}</td>
                  <td>{t.plan_tier}</td>
                  <td>
                    <span className={`tn-badge tn-${t.account_status}`}>{STATUS_LABEL[t.account_status] || t.account_status}</span>
                  </td>
                  <td>{t.user_count}</td>
                  <td>{t.deployment_count}</td>
                  <td>{Number(t.credit_balance).toLocaleString()}</td>
                  <td>{(Number(t.afn_balance_pul) / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tenants.length === 0 && <p className="tn-muted">No tenants yet.</p>}
        </div>
      ) : (
        <div>
          <button className="tn-back-btn" onClick={() => { setSelected(null); setDetail(null); }}>← Back to list</button>

          {detail ? (
            <div className="tn-detail-grid">
              <div className="tn-panel">
                <div className="tn-detail-head">
                  <h2>{detail.tenant?.business_name}</h2>
                  <span className={`tn-badge tn-${detail.tenant?.account_status}`}>
                    {STATUS_LABEL[detail.tenant?.account_status] || detail.tenant?.account_status}
                  </span>
                  <span className={`tn-badge ${detail.tenant?.ofac_screening_status === 'blocked' ? 'tn-blocked' : detail.tenant?.ofac_screening_status === 'clear' ? 'tn-active' : 'tn-warn'}`}>
                    OFAC: {detail.tenant?.ofac_screening_status || 'unscreened'}
                  </span>
                  <span className={`tn-badge ${detail.tenant?.kyc_status === 'verified' ? 'tn-active' : 'tn-warn'}`}>
                    KYC: {detail.tenant?.kyc_status || 'unverified'}
                  </span>
                </div>
                <p className="tn-meta">
                  {detail.tenant?.subdomain} · {detail.tenant?.plan_tier} · until {detail.tenant?.subscription_end_date?.slice(0, 10)}
                </p>

                <div className="tn-actions">
                  <button className="tn-btn tn-btn-pause" disabled={busy} onClick={() => setStatus('suspend')}>Suspend</button>
                  <button className="tn-btn tn-btn-run" disabled={busy} onClick={() => setStatus('activate')}>Activate</button>
                  <button className="tn-btn tn-btn-archive" disabled={busy} onClick={() => setStatus('archive')}>Archive</button>
                </div>
                <div className="tn-actions">
                  <button className="tn-btn tn-btn-run" disabled={busy} onClick={screenNow}>Screen now</button>
                  <button className="tn-btn tn-btn-pause" disabled={busy} onClick={() => setCompliance('set_screening', 'blocked')}>OFAC Block</button>
                  <button className="tn-btn tn-btn-run" disabled={busy} onClick={() => setCompliance('set_screening', 'clear')}>OFAC Clear</button>
                </div>
                <div className="tn-actions">
                  <button className="tn-btn tn-btn-run" disabled={busy} onClick={() => setCompliance('set_kyc', 'verified')}>KYC Verify</button>
                  <button className="tn-btn tn-btn-archive" disabled={busy} onClick={() => setCompliance('set_kyc', 'rejected')}>KYC Reject</button>
                </div>

                <div className="tn-stats">
                  <div><span>USD</span><b>{(Number(detail.wallet?.usd_balance_cents || 0) / 100).toFixed(2)}</b></div>
                  <div><span>AFN</span><b>{(Number(detail.wallet?.afn_balance_pul || 0) / 100).toFixed(2)}</b></div>
                  <div><span>AI credits</span><b>{Number(detail.aiWallet?.credit_balance || 0).toLocaleString()}</b></div>
                </div>
              </div>

              <div className="tn-panel">
                <h3>Users</h3>
                {detail.users.map((u) => (
                  <div key={u.id} className="tn-list-row">
                    <span className="tn-strong">{u.full_name}</span>
                    <span className="tn-mono">{u.email || '—'}</span>
                    <span className="tn-muted">{u.role}</span>
                  </div>
                ))}
                {detail.users.length === 0 && <p className="tn-muted">No users.</p>}
              </div>

              <div className="tn-panel">
                <h3>Deployments</h3>
                {detail.deployments.map((d) => (
                  <div key={d.id} className="tn-list-row">
                    <span className="tn-strong">{d.app_name}</span>
                    <span className="tn-mono">{d.framework}</span>
                    <span className={`tn-badge tn-${d.status === 'running' ? 'active' : d.status}`}>{d.status}</span>
                  </div>
                ))}
                {detail.deployments.length === 0 && <p className="tn-muted">No deployments.</p>}
              </div>

              <div className="tn-panel">
                <h3>Invoices</h3>
                {detail.invoices.map((inv) => (
                  <div key={inv.id} className="tn-list-row">
                    <span className="tn-mono">{inv.invoice_number}</span>
                    <span>{Number(inv.amount_afn).toLocaleString()} AFN</span>
                    <span className={`tn-badge tn-${inv.status}`}>{inv.status}</span>
                  </div>
                ))}
                {detail.invoices.length === 0 && <p className="tn-muted">No invoices.</p>}
              </div>
            </div>
          ) : (
            <p className="tn-muted">Loading tenant…</p>
          )}
        </div>
      )}

      <style>{`
        .tn-shell { min-height: 100vh; background: #0b132b; color: #e2e8f0; padding: 32px; font-family: 'Open Sans', system-ui, sans-serif; }
        .tn-head { max-width: 1200px; margin: 0 auto 24px; display: flex; justify-content: space-between; align-items: flex-start; }
        .tn-head h1 { margin: 0; font-size: 24px; }
        .tn-head p { margin: 6px 0 0; color: #94a3b8; font-size: 13px; }
        .tn-back, .tn-back-btn { color: #f59e0b; text-decoration: none; font-size: 13px; font-weight: 600; background: none; border: 0; cursor: pointer; }
        .tn-back-btn { margin: 0 0 14px; padding: 0; }
        .tn-panel { max-width: 1200px; margin: 0 auto 16px; background: #111b31; border: 1px solid #24324f; border-radius: 10px; padding: 18px 20px; }
        .tn-err { max-width: 1200px; margin: 0 auto 16px; background: rgba(225,29,72,.15); border: 1px solid rgba(225,29,72,.4); color: #fda4af; padding: 10px 12px; border-radius: 7px; font-size: 13px; }
        .tn-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .tn-table th { text-align: start; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; padding: 8px; border-bottom: 1px solid #1a2844; }
        .tn-table td { padding: 10px 8px; border-bottom: 1px solid #16223a; }
        .tn-row { cursor: pointer; }
        .tn-row:hover td { background: #0f1a30; }
        .tn-strong { font-weight: 700; color: #fff; }
        .tn-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #94a3b8; }
        .tn-muted { color: #64748b; font-size: 13px; }
        .tn-meta { color: #64748b; font-size: 12.5px; margin: 4px 0 16px; }
        .tn-badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
        .tn-active { background: rgba(16,185,129,.15); color: #34d399; border: 1px solid rgba(16,185,129,.4); }
        .tn-suspended, .tn-archived, .tn-failed { background: rgba(225,29,72,.15); color: #fda4af; border: 1px solid rgba(225,29,72,.4); }
        .tn-grace_period, .tn-deploying, .tn-unpaid, .tn-paused { background: rgba(245,158,11,.15); color: #fbbf24; border: 1px solid rgba(245,158,11,.4); }
        .tn-blocked { background: rgba(225,29,72,.15); color: #fda4af; border: 1px solid rgba(225,29,72,.4); }
        .tn-warn { background: rgba(245,158,11,.15); color: #fbbf24; border: 1px solid rgba(245,158,11,.4); }
        .tn-paid, .tn-running { background: rgba(16,185,129,.15); color: #34d399; border: 1px solid rgba(16,185,129,.4); }
        .tn-detail-grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .tn-detail-head { display: flex; align-items: center; gap: 10px; }
        .tn-detail-head h2 { margin: 0; font-size: 18px; }
        .tn-actions { display: flex; gap: 8px; margin: 14px 0 18px; }
        .tn-btn { border: 0; padding: 8px 14px; border-radius: 7px; font-weight: 700; cursor: pointer; font-size: 13px; }
        .tn-btn:disabled { opacity: .5; cursor: not-allowed; }
        .tn-btn-pause { background: rgba(245,158,11,.15); color: #fbbf24; border: 1px solid rgba(245,158,11,.4); }
        .tn-btn-run { background: rgba(16,185,129,.15); color: #34d399; border: 1px solid rgba(16,185,129,.4); }
        .tn-btn-archive { background: rgba(225,29,72,.15); color: #fda4af; border: 1px solid rgba(225,29,72,.4); }
        .tn-stats { display: flex; gap: 20px; }
        .tn-stats div { background: #0f1a30; border: 1px solid #1a2844; border-radius: 8px; padding: 12px 16px; min-width: 110px; }
        .tn-stats span { display: block; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
        .tn-stats b { font-size: 18px; color: #fff; }
        .tn-panel h3 { margin: 0 0 12px; font-size: 14px; }
        .tn-list-row { display: flex; gap: 14px; align-items: center; padding: 8px 0; border-bottom: 1px solid #16223a; font-size: 13px; }
        .tn-list-row:last-child { border-bottom: 0; }
        @media (max-width: 900px) { .tn-detail-grid { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  );
}
