'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@aria-cloud/ui';

interface Overview {
  organizationName: string;
  subscriptionTier: string;
  usdBalanceCents: number;
  afnBalancePul: number;
  aiCreditBalance: number;
  monthlyCreditQuota: number;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  amount_afn: string;
  billing_period_months: number;
  status: string;
  due_date: string;
  paid_at: string | null;
}

interface TransactionRow {
  id: string;
  amount_afn: string;
  payment_channel: string;
  transaction_reference: string | null;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
}

export default function BillingPage() {
  const { dir } = useTranslation();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{
    invoiceNumber: string;
    amountAfn: number;
    merchantCode: string;
    checkoutUrl: string;
  } | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  async function loadBilling() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/settle');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load billing.');
      setOverview(data.overview || null);
      setInvoices(data.invoices || []);
      setTransactions(data.transactions || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBilling();
  }, []);

  async function initiateHesabPay(invoiceId: string) {
    setPayingId(invoiceId);
    setError(null);
    try {
      const res = await fetch('/api/billing/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to prepare HesabPay checkout.');
      setCheckout({
        invoiceNumber: data.invoiceNumber,
        amountAfn: data.amountAfn,
        merchantCode: data.merchantCode,
        checkoutUrl: data.checkoutUrl,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPayingId(null);
    }
  }

  const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '—');

  return (
    <div dir={dir} className="billing">
      <header className="billing-head">
        <div>
          <h1>Billing & Invoices</h1>
          <p>Your plan, AFN/USD wallets, invoices and HesabPay settlements.</p>
        </div>
        <Link href="/dashboard" className="billing-back">← Dashboard</Link>
      </header>

      {error && <div className="billing-error">{error}</div>}

      <section className="billing-cards">
        <div className="billing-card">
          <span className="billing-label">Organization</span>
          <b className="billing-value">{overview?.organizationName ?? '…'}</b>
        </div>
        <div className="billing-card">
          <span className="billing-label">Plan</span>
          <b className="billing-value">{overview?.subscriptionTier ?? '…'}</b>
        </div>
        <div className="billing-card">
          <span className="billing-label">Balance · AFN</span>
          <b className="billing-value">{overview ? (overview.afnBalancePul / 100).toFixed(2) : '…'}</b>
        </div>
        <div className="billing-card">
          <span className="billing-label">Balance · USD</span>
          <b className="billing-value">{overview ? `$${(overview.usdBalanceCents / 100).toFixed(2)}` : '…'}</b>
        </div>
      </section>

      {checkout && (
        <section className="billing-checkout">
          <div className="billing-checkout-head">
            <h2>HesabPay Payment Instructions · {checkout.invoiceNumber}</h2>
            <button type="button" className="billing-dismiss" onClick={() => setCheckout(null)}>Close</button>
          </div>
          <p className="billing-muted">
            Pay <b>{checkout.amountAfn.toLocaleString()} AFN</b> via the HesabPay app using merchant code{' '}
            <code className="billing-mono">{checkout.merchantCode}</code> and reference{' '}
            <code className="billing-mono">{checkout.invoiceNumber}</code>. Settlement updates automatically once confirmed.
          </p>
          <a href={checkout.checkoutUrl} target="_blank" rel="noopener noreferrer" className="billing-pay-link">
            Open HesabPay Checkout ↗
          </a>
        </section>
      )}

      <section className="billing-section" style={{ marginBottom: 16 }}>
        <h2>Invoices ({invoices.length})</h2>
        {loading ? (
          <p className="billing-muted">Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <p className="billing-muted">No invoices issued yet.</p>
        ) : (
          <table className="billing-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Amount</th>
                <th>Term</th>
                <th>Due</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="billing-mono">{inv.invoice_number}</td>
                  <td>{Number(inv.amount_afn).toLocaleString()} AFN</td>
                  <td>{inv.billing_period_months} mo</td>
                  <td>{fmtDate(inv.due_date)}</td>
                  <td>
                    <span className={`billing-badge ${inv.status === 'paid' ? 'ok' : 'warn'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    {inv.status === 'unpaid' ? (
                      <button
                        type="button"
                        className="billing-pay-btn"
                        disabled={payingId === inv.id}
                        onClick={() => initiateHesabPay(inv.id)}
                      >
                        {payingId === inv.id ? 'Preparing…' : 'Pay with HesabPay'}
                      </button>
                    ) : (
                      <span className="billing-muted">{fmtDate(inv.paid_at)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="billing-section">
        <h2>Verified Payment History ({transactions.length})</h2>
        {transactions.length === 0 ? (
          <p className="billing-muted">
            Payment is completed via HesabPay — scan the QR on your invoice or use the checkout link above.
            Cash collection and other rails are disabled.
          </p>
        ) : (
          <table className="billing-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Channel</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="billing-mono">{tx.transaction_reference || tx.id.slice(0, 8)}</td>
                  <td>{tx.payment_channel}</td>
                  <td>{Number(tx.amount_afn).toLocaleString()} AFN</td>
                  <td>
                    <span className={`billing-badge ${tx.is_verified ? 'ok' : 'warn'}`}>
                      {tx.is_verified ? 'verified' : 'pending'}
                    </span>
                  </td>
                  <td>{fmtDate(tx.verified_at || tx.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <style>{`
        .billing { max-width: 1100px; margin: 0 auto; padding: 24px; color: #16191f; }
        .billing-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .billing-head h1 { margin: 0; font-size: 22px; }
        .billing-head p { margin: 4px 0 0; color: #687078; font-size: 13px; }
        .billing-back { color: #ff9900; text-decoration: none; font-size: 13px; font-weight: 600; }
        .billing-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
        .billing-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px; }
        .billing-card { background: #fff; border: 1px solid #e3e8ee; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(15,23,42,.05); }
        .billing-label { display: block; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #687078; }
        .billing-value { display: block; margin-top: 6px; font-size: 20px; font-weight: 800; }
        .billing-section { background: #fff; border: 1px solid #e3e8ee; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(15,23,42,.05); }
        .billing-section h2 { margin: 0 0 12px; font-size: 16px; }
        .billing-muted { color: #687078; font-size: 13px; margin: 0 0 10px; }
        .billing-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
        .billing-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .billing-table th { text-align: start; color: #687078; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; padding: 6px 8px; border-bottom: 1px solid #eef2f6; }
        .billing-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
        .billing-table tr:last-child td { border-bottom: 0; }
        .billing-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
        .billing-badge.ok { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
        .billing-badge.warn { background: #fffbeb; color: #b45309; border-color: #fde68a; }
        .billing-pay-btn { background: linear-gradient(135deg,#ff9900,#e68300); color: #fff; border: 0; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .billing-pay-btn:disabled { opacity: .5; cursor: not-allowed; }
        .billing-checkout { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .billing-checkout-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .billing-checkout-head h2 { margin: 0; font-size: 15px; color: #047857; }
        .billing-dismiss { border: 1px solid #a7f3d0; background: #fff; color: #047857; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; }
        .billing-pay-link { display: inline-block; margin-top: 6px; background: #047857; color: #fff; text-decoration: none; padding: 8px 14px; border-radius: 7px; font-size: 13px; font-weight: 700; }
      `}</style>
    </div>
  );
}
