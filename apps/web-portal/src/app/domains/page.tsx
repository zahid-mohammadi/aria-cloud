'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@aria-cloud/ui';

interface DomainRow {
  id: string;
  domain_name: string;
  is_system_subdomain: boolean;
  ssl_status: string;
  dkim_status: string;
  auto_renew: boolean;
  created_at?: string;
}

const ROOT_DOMAIN = 'ariacloudservices.org';

export default function DomainsPage() {
  const { dir } = useTranslation();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [provisionedResult, setProvisionedResult] = useState<any>(null);

  const [mode, setMode] = useState<'custom_domain' | 'subdomain'>('custom_domain');
  const [customDomain, setCustomDomain] = useState('');
  const [subdomainSlug, setSubdomainSlug] = useState('');
  const [storeTitle, setStoreTitle] = useState('');

  async function loadDomains() {
    setLoading(true);
    try {
      const res = await fetch('/api/domains');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to load domains.');
      setDomains(data.domains || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDomains();
  }, []);

  async function handleProvision(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    setProvisionedResult(null);

    try {
      const payload =
        mode === 'custom_domain'
          ? { action: 'custom_domain', customDomain: customDomain.trim().toLowerCase() }
          : {
              action: 'subdomain',
              subdomainSlug: subdomainSlug.trim().toLowerCase(),
              storeTitle: storeTitle.trim() || 'AriaCloud Store',
            };

      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to provision domain.');

      setProvisionedResult(data);
      setSuccess(
        mode === 'custom_domain'
          ? `Custom domain ${customDomain} registered. Update your registrar nameservers to complete DNS verification.`
          : `Subdomain ${data.fqdn} is live.`
      );
      setCustomDomain('');
      setSubdomainSlug('');
      await loadDomains();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir={dir} className="dom-wrap">
      <header className="dom-head">
        <div>
          <h1>Domains & DNS</h1>
          <p>Connect custom branded domains (.af, .com, .org) or manage your AriaCloud subdomains.</p>
        </div>
        <div className="dom-nav-links">
          <Link href="/email" className="dom-link">Business Email →</Link>
          <Link href="/dashboard" className="dom-back">← Dashboard</Link>
        </div>
      </header>

      {error && <div className="dom-err">{error}</div>}
      {success && <div className="dom-ok">{success}</div>}

      <section className="dom-card">
        <div className="dom-tabs">
          <button
            type="button"
            className={`dom-tab ${mode === 'custom_domain' ? 'active' : ''}`}
            onClick={() => setMode('custom_domain')}
          >
            Connect Custom Domain
          </button>
          <button
            type="button"
            className={`dom-tab ${mode === 'subdomain' ? 'active' : ''}`}
            onClick={() => setMode('subdomain')}
          >
            Claim Free *.{ROOT_DOMAIN}
          </button>
        </div>

        <form onSubmit={handleProvision} className="dom-form">
          {mode === 'custom_domain' ? (
            <label className="dom-field">
              Custom Domain Name
              <input
                type="text"
                dir="ltr"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="herat-saffron.af"
                required
              />
            </label>
          ) : (
            <div className="dom-form-row">
              <label className="dom-field">
                Subdomain Slug
                <input
                  type="text"
                  dir="ltr"
                  value={subdomainSlug}
                  onChange={(e) => setSubdomainSlug(e.target.value)}
                  placeholder="herat-saffron"
                  required
                />
              </label>
              <label className="dom-field">
                Storefront Title
                <input
                  type="text"
                  value={storeTitle}
                  onChange={(e) => setStoreTitle(e.target.value)}
                  placeholder="Herat Saffron Exports"
                />
              </label>
            </div>
          )}

          <button type="submit" className="dom-btn" disabled={busy}>
            {busy ? 'Provisioning…' : mode === 'custom_domain' ? 'Attach Custom Domain' : 'Register Subdomain'}
          </button>
        </form>
      </section>

      {provisionedResult?.nameServers?.length > 0 && (
        <section className="dom-card">
          <h2>Registrar Nameservers (Action Required)</h2>
          <p className="dom-muted">Point your domain registrar to these authoritative nameservers so SSL and email DKIM activate automatically:</p>
          <ul className="dom-ns-list">
            {provisionedResult.nameServers.map((ns: string) => (
              <li key={ns} className="dom-mono">{ns}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="dom-card">
        <h2>Connected Domains ({domains.length})</h2>
        {loading ? (
          <p className="dom-muted">Loading domains…</p>
        ) : domains.length === 0 ? (
          <p className="dom-muted">No domains registered yet. Add a custom domain or claim a free subdomain above.</p>
        ) : (
          <table className="dom-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Type</th>
                <th>SSL</th>
                <th>DKIM</th>
                <th>Auto-Renew</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.id}>
                  <td className="dom-mono">{d.domain_name}</td>
                  <td>{d.is_system_subdomain ? 'System Subdomain' : 'Custom Domain'}</td>
                  <td>
                    <span className={`dom-badge ${d.ssl_status === 'ISSUED' ? 'ok' : 'warn'}`}>
                      {d.ssl_status || 'PENDING'}
                    </span>
                  </td>
                  <td>
                    <span className={`dom-badge ${d.dkim_status === 'ACTIVE' ? 'ok' : 'warn'}`}>
                      {d.dkim_status || 'PENDING'}
                    </span>
                  </td>
                  <td>{d.auto_renew ? 'Enabled' : 'Off'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <style>{`
        .dom-wrap { max-width: 1100px; margin: 0 auto; padding: 24px; color: #16191f; }
        .dom-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
        .dom-head h1 { margin: 0; font-size: 22px; }
        .dom-head p { margin: 4px 0 0; color: #687078; font-size: 13px; }
        .dom-nav-links { display: flex; gap: 14px; align-items: center; }
        .dom-back, .dom-link { color: #ff9900; text-decoration: none; font-size: 13px; font-weight: 600; }
        .dom-err { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
        .dom-ok { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
        .dom-card { background: #fff; border: 1px solid #e3e8ee; border-radius: 10px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(15,23,42,.05); }
        .dom-card h2 { margin: 0 0 12px; font-size: 16px; }
        .dom-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .dom-tab { border: 1px solid #d4d9e0; background: #fff; color: #16191f; padding: 8px 14px; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .dom-tab.active { background: #ff9900; color: #fff; border-color: #ff9900; }
        .dom-form { display: flex; flex-direction: column; gap: 12px; }
        .dom-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .dom-field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 700; color: #687078; }
        .dom-field input { padding: 9px 11px; border: 1px solid #d4d9e0; border-radius: 7px; font-size: 14px; color: #16191f; }
        .dom-btn { align-self: flex-start; background: linear-gradient(135deg,#ff9900,#e68300); color: #fff; border: 0; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
        .dom-btn:disabled { opacity: .5; cursor: not-allowed; }
        .dom-muted { color: #687078; font-size: 13px; margin: 0; }
        .dom-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
        .dom-ns-list { margin: 10px 0 0; padding-inline-start: 20px; display: flex; flex-direction: column; gap: 6px; }
        .dom-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .dom-table th { text-align: start; color: #687078; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; padding: 6px 8px; border-bottom: 1px solid #eef2f6; }
        .dom-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
        .dom-table tr:last-child td { border-bottom: 0; }
        .dom-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
        .dom-badge.ok { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
        .dom-badge.warn { background: #fffbeb; color: #b45309; border-color: #fde68a; }
        @media (max-width: 700px) { .dom-form-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
