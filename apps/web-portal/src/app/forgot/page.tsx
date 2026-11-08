'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      /* the response is deliberately generic */
    }
    setSent(true);
    setBusy(false);
  }

  return (
    <main className="shell">
      <div className="card">
        <h1>بازیابی رمز عبور / Reset password</h1>
        {sent ? (
          <p className="note">
            اگر حسابی با این ایمیل وجود داشته باشد، لینک بازیابی ارسال شد.
            <br />
            If an account exists for that address, a reset link has been sent.
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <label htmlFor="email">ایمیل / Email</label>
            <input
              id="email"
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@kabul-saffron.af"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !email}>
              {busy ? 'در حال ارسال…' : 'ارسال لینک بازیابی / Send link'}
            </button>
          </form>
        )}
        <p className="back">
          <Link href="/login">← بازگشت به ورود / Back to sign in</Link>
        </p>
      </div>
      <style>{`
        .shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
          background:radial-gradient(1200px 600px at 50% -10%,#0f2f27 0%,#060d0b 55%,#040807 100%);
          font-family:'Vazirmatn','Open Sans',system-ui,sans-serif;color:#e2e8f0}
        .card{width:100%;max-width:420px;background:rgba(13,25,21,.94);border:1px solid #1b352c;
          border-radius:18px;padding:32px 28px;box-shadow:0 30px 80px rgba(0,0,0,.55)}
        h1{font-size:17px;margin:0 0 18px;color:#f8fafc}
        label{display:block;font-size:12.5px;font-weight:600;margin:0 0 6px;color:#a7c4ba}
        input{width:100%;box-sizing:border-box;padding:11px 13px;border-radius:10px;border:1px solid #24463b;
          background:#08120f;color:#f1f5f9;font-size:14px;outline:none}
        input:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.16)}
        button{margin-top:20px;width:100%;padding:12px;border:0;border-radius:10px;cursor:pointer;
          background:linear-gradient(135deg,#059669,#0d9488);color:#fff;font-weight:700;font-size:14.5px}
        button:disabled{opacity:.55;cursor:not-allowed}
        .note{font-size:13px;line-height:1.9;color:#a7c4ba;margin:0}
        .back{margin:22px 0 0;font-size:12px;text-align:center}
        .back a{color:#34d399;text-decoration:none}
      `}</style>
    </main>
  );
}
