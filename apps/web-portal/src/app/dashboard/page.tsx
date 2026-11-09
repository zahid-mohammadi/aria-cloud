'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@aria-cloud/ui';
import { AccountSummary } from '@/components/AccountSummary';

interface Invoice {
  invoice_number: string;
  amount_afn: string;
  status: string;
  due_date: string;
  paid_at: string | null;
}

interface Deployment {
  app_name: string;
  framework: string;
  status: string;
  custom_domain: string | null;
}

interface DashboardData {
  overview: any;
  invoices: Invoice[];
  deployments: Deployment[];
}

export default function DashboardPage() {
  const { dir } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load dashboard.');
        setData(json);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, []);

  const statusClass = (s: string) =>
    ({ paid: 'ok', running: 'ok', unpaid: 'warn', deploying: 'warn', paused: 'warn', failed: 'bad', suspended: 'bad' })[s] || 'muted';

  return (
    <div dir={dir} className="dash">
      <AccountSummary />

      {error && <div className="dash-error">{error}</div>}

      <section className="dash-section">
        <div className="dash-section-head">
          <h2>Invoices</h2>
          <Link href="/billing" className="dash-link">Billing →</Link>
        </div>
        {!data ? (
          <p className="dash-muted">Loading…</p>
        ) : data.invoices.length === 0 ? (
          <p className="dash-muted">No invoices yet. They appear here once a plan is active.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr><th>Invoice</th><th>Amount</th><th>Due</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.invoices.map((inv) => (
                <tr key={inv.invoice_number}>
                  <td className="dash-mono">{inv.invoice_number}</td>
                  <td>{Number(inv.amount_afn).toLocaleString()} AFN</td>
                  <td>{inv.due_date?.slice(0, 10)}</td>
                  <td><span className={`dash-badge dash-${statusClass(inv.status)}`}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="dash-section">
        <div className="dash-section-head">
          <h2>Applications</h2>
          <Link href="/store-builder" className="dash-link">Build a website →</Link>
        </div>
        {!data ? (
          <p className="dash-muted">Loading…</p>
        ) : data.deployments.length === 0 ? (
          <p className="dash-muted">No applications deployed yet.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr><th>App</th><th>Runtime</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.deployments.map((d) => (
                <tr key={d.app_name + d.custom_domain}>
                  <td className="dash-strong">{d.app_name}</td>
                  <td className="dash-mono">{d.framework}</td>
                  <td><span className={`dash-badge dash-${statusClass(d.status)}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <style>{`
        .dash { max-width: 1200px; margin: 0 auto; padding: 24px; }
        .dash-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
        .dash-section { background: #ffffff; border: 1px solid #e3e8ee; border-radius: 10px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(15,23,42,.05); }
        .dash-section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .dash-section-head h2 { margin: 0; font-size: 16px; color: #16191f; }
        .dash-link { color: #ff9900; text-decoration: none; font-size: 13px; font-weight: 600; }
        .dash-muted { color: #687078; font-size: 13px; margin: 0; }
        .dash-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .dash-table th { text-align: start; color: #687078; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; padding: 6px 8px; border-bottom: 1px solid #eef2f6; }
        .dash-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; color: #16191f; }
        .dash-table tr:last-child td { border-bottom: 0; }
        .dash-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
        .dash-strong { font-weight: 700; }
        .dash-badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
        .dash-ok { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
        .dash-warn { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
        .dash-bad { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
      `}</style>
    </div>
  );
}
