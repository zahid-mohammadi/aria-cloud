'use client';

import React, { useEffect, useState } from 'react';

interface DashboardData {
  overview: {
    organizationName: string;
    subscriptionTier: string;
    usdBalanceCents: number;
    afnBalancePul: number;
    aiCreditBalance: number;
    monthlyCreditQuota: number;
  } | null;
  invoices: any[];
  deployments: any[];
}

export function AccountSummary() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        if (res.ok) setData(json);
      } catch {
        /* leave summary empty on failure */
      }
    })();
  }, []);

  if (!data?.overview) return null;

  const o = data.overview;

  return (
    <div className="acct-summary">
      <div className="acct-card">
        <span className="acct-label">{o.organizationName}</span>
        <span className="acct-plan">{o.subscriptionTier} plan</span>
      </div>
      <div className="acct-card">
        <span className="acct-label">Balance · AFN</span>
        <b className="acct-value">{(o.afnBalancePul / 100).toFixed(2)}</b>
      </div>
      <div className="acct-card">
        <span className="acct-label">Balance · USD</span>
        <b className="acct-value">${(o.usdBalanceCents / 100).toFixed(2)}</b>
      </div>
      <div className="acct-card">
        <span className="acct-label">AI credits</span>
        <b className="acct-value">{o.aiCreditBalance.toLocaleString()}</b>
      </div>
      <div className="acct-card">
        <span className="acct-label">Monthly quota</span>
        <b className="acct-value">{o.monthlyCreditQuota.toLocaleString()}</b>
      </div>
      <div className="acct-card">
        <span className="acct-label">Invoices · Apps</span>
        <b className="acct-value">{data.invoices.length} · {data.deployments.length}</b>
      </div>

      <style>{`
        .acct-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-block-end: 20px;
        }
        .acct-card {
          background: #ffffff;
          border: 1px solid #e3e8ee;
          border-radius: 10px;
          padding: 14px 16px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .acct-label { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #687078; }
        .acct-value { font-size: 20px; font-weight: 800; color: #16191f; }
        .acct-plan { font-size: 12px; color: #ff9900; font-weight: 700; }
      `}</style>
    </div>
  );
}
