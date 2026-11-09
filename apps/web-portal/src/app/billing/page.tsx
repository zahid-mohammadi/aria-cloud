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

export default function BillingPage() {
  const { dir } = useTranslation();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/billing/settle');
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load billing.');
        setOverview(data.overview || null);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, []);

  return (
    <div dir={dir} className="billing">
      <header className="billing-head">
        <div>
          <h1>Billing</h1>
          <p>Your plan and HesabPay payments.</p>
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

      <section className="billing-section">
        <h2>Pay with HesabPay</h2>
        <p className="billing-muted">
          Payment is completed via the HesabPay app — scan the QR on your invoice or
          the payment link we send you. Settlement is recorded automatically against
          your account; there is nothing to enter here.
        </p>
        <p className="billing-muted">
          HesabPay is the only supported payment method. Cash collection and other
          rails are disabled.
        </p>
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
        .billing-muted { color: #687078; font-size: 14px; margin: 0 0 10px; }
      `}</style>
    </div>
  );
}
