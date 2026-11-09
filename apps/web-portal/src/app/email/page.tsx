'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@aria-cloud/ui';

interface Domain {
  id: string;
  domain_name: string;
  is_system_subdomain: boolean;
  ssl_status: string;
  dkim_status: string;
  auto_renew: boolean;
}

interface Mailbox {
  id: string;
  domain_id: string;
  email_address: string;
  quota_mb: number;
  used_mb: number;
  is_active: boolean;
  created_at: string;
  imapHost: string;
  smtpHost: string;
  jmapUrl: string;
}

const ROOT = 'ariacloudservices.org';

function dnsGuidance(domain: string) {
  const d = domain.toLowerCase();
  return [
    { type: 'MX', host: `${d}.`, value: `10 mail.${ROOT}.` },
    { type: 'TXT', host: `${d}.`, value: `"v=spf1 include:amazonses.com ~all"` },
    { type: 'TXT', host: `_dmarc.${d}.`, value: `"v=DMARC1; p=quarantine; rua=mailto:postmaster@${d}; pct=100;"` },
    { type: 'CNAME', host: `mail._domainkey.${d}.`, value: `mail.${ROOT}.` },
  ];
}

export default function BusinessEmailPage() {
  const { dir } = useTranslation();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [created, setCreated] = useState<any>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const [domainId, setDomainId] = useState('');
  const [localPart, setLocalPart] = useState('sales');
  const [password, setPassword] = useState('');
  const [quotaMb, setQuotaMb] = useState('5120');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/email');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to load email.');
      setDomains(data.domains || []);
      setMailboxes(data.mailboxes || []);
      if (!domainId && data.domains?.length) setDomainId(data.domains[0].id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function provision(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setOk(null);
    const domain = domains.find((d) => d.id === domainId);
    if (!domain) {
      setError('Select a domain first.');
      setBusy(false);
      return;
    }
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId,
          domainName: domain.domain_name,
          localPart,
          password,
          quotaMb: Number(quotaMb) || 5120,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Provisioning failed.');
      setOk(`Created ${data.emailAddress}`);
      setCreated(data);
      setPassword('');
      setLocalPart('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); } catch { /* clipboard unavailable */ }
  }

  async function resetMailbox(mailboxId: string) {
    if (resetPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }
    setBusy(true); setError(null); setOk(null);
    try {
      const res = await fetch('/api/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailboxId, password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Reset failed.');
      setOk('Password updated.');
      setResetId(null);
      setResetPassword('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const selectedDomain = domains.find((d) => d.id === domainId);

  return (
    <div dir={dir} className="email">
      <header className="email-head">
        <h1>Business email</h1>
        <Link href="/dashboard" className="email-back">← Dashboard</Link>
      </header>

      {error && <div className="email-error">{error}</div>}
      {ok && <div className="email-ok">{ok}</div>}

      {created && (
        <div className="email-created">
          <strong>Mailbox created — save these credentials now</strong>
          <div className="email-cred"><span>Address</span><code>{created.emailAddress}</code><button onClick={() => copy(created.emailAddress)}>Copy</button></div>
          <div className="email-cred"><span>Password</span><code>{created.password}</code><button onClick={() => copy(created.password)}>Copy</button></div>
          <div className="email-cred"><span>IMAP</span><code>{created.imapHost}:993</code></div>
          <div className="email-cred"><span>SMTP</span><code>{created.smtpHost}:587</code></div>
          <div className="email-cred"><span>Webmail</span><a href={created.jmapUrl} target="_blank" rel="noopener">{created.jmapUrl}</a></div>
          <button className="email-btn" onClick={() => setCreated(null)}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <p className="email-muted">Loading…</p>
      ) : domains.length === 0 ? (
        <div className="email-section">
          <h2>No domain yet</h2>
          <p className="email-muted">
            Business email needs a domain. Connect one first, or build your storefront
            to get a free <span className="email-mono">.ariacloudservices.org</span> subdomain.
          </p>
          <Link href="/store-builder" className="email-link">Build a storefront →</Link>
        </div>
      ) : (
        <>
          <form className="email-form" onSubmit={provision}>
            <h2>Create a mailbox</h2>
            <div className="email-form-grid">
              <label>
                Domain
                <select value={domainId} onChange={(e) => setDomainId(e.target.value)}>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>{d.domain_name}</option>
                  ))}
                </select>
              </label>
              <label>
                Mailbox name
                <div className="email-inline">
                  <input value={localPart} onChange={(e) => setLocalPart(e.target.value)} placeholder="sales" />
                  <span className="email-mono">@{selectedDomain?.domain_name || ROOT}</span>
                </div>
              </label>
              <label>
                Password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 8 characters" />
              </label>
              <label>
                Quota (MB)
                <input type="number" value={quotaMb} onChange={(e) => setQuotaMb(e.target.value)} />
              </label>
            </div>
            <button type="submit" className="email-btn" disabled={busy || !password || !localPart}>
              {busy ? 'Creating…' : 'Create mailbox'}
            </button>
          </form>

          <section className="email-section">
            <h2>Mailboxes ({mailboxes.length})</h2>
            {mailboxes.length === 0 ? (
              <p className="email-muted">No mailboxes yet.</p>
            ) : (
              <table className="email-table">
                <thead><tr><th>Address</th><th>Quota</th><th>IMAP / SMTP</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {mailboxes.map((m) => (
                    <tr key={m.id}>
                      <td className="email-mono">{m.email_address}</td>
                      <td>{(m.used_mb / 1024).toFixed(1)} / {(m.quota_mb / 1024).toFixed(0)} GB</td>
                      <td className="email-mono">{m.imapHost}:993 · {m.smtpHost}:587</td>
                      <td><span className={`email-badge ${m.is_active ? 'ok' : 'warn'}`}>{m.is_active ? 'active' : 'disabled'}</span></td>
                      <td>
                        {resetId === m.id ? (
                          <span className="email-reset-row">
                            <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="new password" />
                            <button className="email-mini" onClick={() => resetMailbox(m.id)} disabled={busy}>Save</button>
                            <button className="email-mini" onClick={() => { setResetId(null); setResetPassword(''); }}>Cancel</button>
                          </span>
                        ) : (
                          <button className="email-mini" onClick={() => { setResetId(m.id); setResetPassword(''); }}>Reset password</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="email-section">
            <h2>Domains</h2>
            <table className="email-table">
              <thead><tr><th>Domain</th><th>Type</th><th>SSL</th><th>DKIM</th></tr></thead>
              <tbody>
                {domains.map((d) => (
                  <tr key={d.id}>
                    <td className="email-mono">{d.domain_name}</td>
                    <td>{d.is_system_subdomain ? 'System' : 'Custom'}</td>
                    <td><span className={`email-badge ${d.ssl_status === 'ISSUED' ? 'ok' : 'warn'}`}>{d.ssl_status || 'pending'}</span></td>
                    <td><span className={`email-badge ${d.dkim_status === 'ACTIVE' ? 'ok' : 'warn'}`}>{d.dkim_status || 'pending'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {selectedDomain && (
            <section className="email-section">
              <h2>DNS records to set at your registrar</h2>
              <p className="email-muted">Add these once; mail, SPF, DMARC and DKIM then work automatically.</p>
              <table className="email-table">
                <thead><tr><th>Type</th><th>Host</th><th>Value</th></tr></thead>
                <tbody>
                  {dnsGuidance(selectedDomain.domain_name).map((r) => (
                    <tr key={r.type + r.host}>
                      <td><span className="email-badge">{r.type}</span></td>
                      <td className="email-mono">{r.host}</td>
                      <td className="email-mono">{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      <style>{`
        .email { max-width: 1100px; margin: 0 auto; padding: 24px; color: #16191f; }
        .email-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .email-head h1 { margin: 0; font-size: 22px; }
        .email-back, .email-link { color: #ff9900; text-decoration: none; font-size: 13px; font-weight: 600; }
        .email-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
        .email-ok { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
        .email-muted { color: #687078; font-size: 13px; margin: 4px 0 0; }
        .email-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
        .email-section, .email-form { background: #ffffff; border: 1px solid #e3e8ee; border-radius: 10px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(15,23,42,.05); }
        .email-section h2, .email-form h2 { margin: 0 0 14px; font-size: 16px; }
        .email-form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 16px; }
        .email-form label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 700; color: #687078; }
        .email-form input, .email-form select { padding: 9px 11px; border: 1px solid #d4d9e0; border-radius: 7px; font-size: 14px; color: #16191f; }
        .email-inline { display: flex; align-items: center; gap: 8px; }
        .email-inline input { flex: 1; }
        .email-btn { background: linear-gradient(135deg,#ff9900,#e68300); color: #fff; border: 0; padding: 11px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
        .email-btn:disabled { opacity: .5; cursor: not-allowed; }
        .email-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .email-table th { text-align: start; color: #687078; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; padding: 6px 8px; border-bottom: 1px solid #eef2f6; }
        .email-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
        .email-table tr:last-child td { border-bottom: 0; }
        .email-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
        .email-badge.ok { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
        .email-badge.warn { background: #fffbeb; color: #b45309; border-color: #fde68a; }
        .email-created { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; }
        .email-created strong { color: #047857; font-size: 14px; }
        .email-cred { display: flex; align-items: center; gap: 10px; font-size: 13px; }
        .email-cred span { color: #687078; font-weight: 700; min-width: 80px; }
        .email-cred code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: #ffffff; padding: 3px 8px; border: 1px solid #d1fae5; border-radius: 6px; }
        .email-cred a { color: #047857; }
        .email-cred button, .email-mini { border: 1px solid #d4d9e0; background: #fff; color: #16191f; border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 12px; font-weight: 600; }
        .email-reset-row { display: inline-flex; gap: 6px; align-items: center; }
        .email-reset-row input { padding: 5px 8px; border: 1px solid #d4d9e0; border-radius: 6px; font-size: 12px; width: 130px; }
        @media (max-width: 700px) { .email-form-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
