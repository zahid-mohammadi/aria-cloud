'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@aria-cloud/ui';

interface KycInfo {
  business_name: string;
  kyc_status: string;
  kyc_document_type: string | null;
  kyc_document_number: string | null;
  kyc_verified_at: string | null;
  business_license_number: string | null;
  ofac_screening_status: string;
  ofac_screened_at: string | null;
}

export default function KycPage() {
  const { dir } = useTranslation();
  const [info, setInfo] = useState<KycInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [docType, setDocType] = useState<'tazkira' | 'passport' | 'business_license'>('tazkira');
  const [docNumber, setDocNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  async function loadKyc() {
    setLoading(true);
    try {
      const res = await fetch('/api/kyc');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load verification status.');
      setInfo(data.kyc || null);
      if (data.kyc?.kyc_document_type) setDocType(data.kyc.kyc_document_type);
      if (data.kyc?.kyc_document_number) setDocNumber(data.kyc.kyc_document_number);
      if (data.kyc?.business_license_number) setLicenseNumber(data.kyc.business_license_number);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKyc();
  }, []);

  async function submitKyc(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kycDocumentType: docType,
          kycDocumentNumber: docNumber,
          businessLicenseNumber: licenseNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Submission failed.');
      setInfo(data.kyc);
      setSuccess(data.message || 'Verification details submitted for review.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const badgeTone = (status?: string) => {
    if (status === 'verified' || status === 'clear') return 'ok';
    if (status === 'rejected' || status === 'blocked') return 'bad';
    return 'warn';
  };

  return (
    <div dir={dir} className="kyc-wrap">
      <header className="kyc-head">
        <div>
          <h1>Business Verification & KYC</h1>
          <p>Verify your Afghan National ID (Tazkira), Passport, or MoIC Business License.</p>
        </div>
        <Link href="/dashboard" className="kyc-back">← Dashboard</Link>
      </header>

      {error && <div className="kyc-err">{error}</div>}
      {success && <div className="kyc-ok">{success}</div>}

      <section className="kyc-cards">
        <div className="kyc-card">
          <span className="kyc-label">KYC Status</span>
          <span className={`kyc-badge ${badgeTone(info?.kyc_status)}`}>
            {loading ? '…' : info?.kyc_status || 'unverified'}
          </span>
        </div>
        <div className="kyc-card">
          <span className="kyc-label">Compliance Screening</span>
          <span className={`kyc-badge ${badgeTone(info?.ofac_screening_status)}`}>
            {loading ? '…' : info?.ofac_screening_status || 'unscreened'}
          </span>
        </div>
        <div className="kyc-card">
          <span className="kyc-label">Verified At</span>
          <b className="kyc-val">{info?.kyc_verified_at ? info.kyc_verified_at.slice(0, 10) : 'Pending'}</b>
        </div>
      </section>

      <section className="kyc-card">
        <h2>Submit Identity & Business License</h2>
        <form onSubmit={submitKyc} className="kyc-form">
          <div className="kyc-row">
            <label className="kyc-field">
              Identity Document Type
              <select value={docType} onChange={(e) => setDocType(e.target.value as any)}>
                <option value="tazkira">Tazkira / e-Tazkira (تذکره الکترونیکی)</option>
                <option value="passport">Afghan Passport (پاسپورت)</option>
                <option value="business_license">MoIC Business License (جواز تجارتی)</option>
              </select>
            </label>
            <label className="kyc-field">
              Document Number
              <input
                type="text"
                dir="ltr"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="1401-0402-12345"
                required
              />
            </label>
          </div>
          <label className="kyc-field">
            MoIC Business License Number (Optional)
            <input
              type="text"
              dir="ltr"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="D-98214 (Ministry of Industry & Commerce)"
            />
          </label>
          <button type="submit" className="kyc-btn" disabled={busy || !docNumber}>
            {busy ? 'Submitting…' : 'Submit Verification Details'}
          </button>
        </form>
      </section>

      <style>{`
        .kyc-wrap { max-width: 1000px; margin: 0 auto; padding: 24px; color: #16191f; }
        .kyc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .kyc-head h1 { margin: 0; font-size: 22px; }
        .kyc-head p { margin: 4px 0 0; color: #687078; font-size: 13px; }
        .kyc-back { color: #ff9900; text-decoration: none; font-size: 13px; font-weight: 600; }
        .kyc-err { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
        .kyc-ok { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
        .kyc-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
        .kyc-card { background: #fff; border: 1px solid #e3e8ee; border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(15,23,42,.05); }
        .kyc-card h2 { margin: 0 0 14px; font-size: 16px; }
        .kyc-label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #687078; margin-bottom: 8px; }
        .kyc-val { font-size: 16px; font-weight: 700; }
        .kyc-badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid transparent; }
        .kyc-badge.ok { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
        .kyc-badge.warn { background: #fffbeb; color: #b45309; border-color: #fde68a; }
        .kyc-badge.bad { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
        .kyc-form { display: flex; flex-direction: column; gap: 14px; }
        .kyc-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .kyc-field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 700; color: #687078; }
        .kyc-field input, .kyc-field select { padding: 9px 11px; border: 1px solid #d4d9e0; border-radius: 7px; font-size: 14px; color: #16191f; }
        .kyc-btn { align-self: flex-start; background: linear-gradient(135deg,#ff9900,#e68300); color: #fff; border: 0; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
        .kyc-btn:disabled { opacity: .5; cursor: not-allowed; }
        @media (max-width: 700px) { .kyc-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
