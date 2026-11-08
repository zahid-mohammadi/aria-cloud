'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || 'Sign-in failed.');
        setBusy(false);
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setError('Could not reach the server.');
      setBusy(false);
    }
  }

  return (
    <main className="admin-shell">
      <div className="admin-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">A</span>
          <div>
            <h1>AriaCloud</h1>
            <p className="tagline">Platform Administration</p>
          </div>
        </div>

        <p className="warning">
          Restricted area. Sign-in attempts are recorded.
        </p>

        <form onSubmit={onSubmit} noValidate>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@ariacloudservices.org"
            dir="ltr"
            disabled={busy}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            dir="ltr"
            disabled={busy}
          />

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy || !email || !password}>
            {busy ? 'Signing in…' : 'Sign in to console'}
          </button>
        </form>

        <p className="footnote">
          Sessions expire after 8 hours. Merchant accounts cannot sign in here.
        </p>
      </div>

      <style>{`
        .admin-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: radial-gradient(1200px 600px at 50% -10%, #2a1a08 0%, #0d0a06 55%, #060504 100%);
          font-family: 'Open Sans', system-ui, sans-serif;
          color: #e2e8f0;
        }
        .admin-card {
          width: 100%;
          max-width: 420px;
          background: rgba(22, 17, 11, 0.94);
          border: 1px solid #3b2818;
          border-radius: 18px;
          padding: 32px 28px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
        }
        .brand { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
        .brand-mark {
          width: 44px; height: 44px; border-radius: 12px;
          display: grid; place-items: center;
          background: linear-gradient(135deg, #d97706, #b45309);
          font-weight: 800; font-size: 22px; color: #fff;
        }
        h1 { margin: 0; font-size: 20px; color: #f8fafc; }
        .tagline { margin: 2px 0 0; font-size: 12px; color: #b08a5a; letter-spacing: .3px; text-transform: uppercase; }
        .warning {
          margin: 0 0 6px; padding: 9px 11px; border-radius: 9px;
          background: rgba(217, 119, 6, .1); border: 1px solid rgba(217, 119, 6, .3);
          color: #fcd34d; font-size: 11.5px; line-height: 1.6;
        }
        label { display: block; font-size: 12.5px; font-weight: 600; margin: 16px 0 6px; color: #c7ab86; }
        input {
          width: 100%; box-sizing: border-box;
          padding: 11px 13px; border-radius: 10px;
          border: 1px solid #3b2818; background: #100c08; color: #f1f5f9;
          font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s;
        }
        input:focus { border-color: #d97706; box-shadow: 0 0 0 3px rgba(217,119,6,.18); }
        input:disabled { opacity: .6; }
        button {
          margin-top: 22px; width: 100%; padding: 12px;
          border: 0; border-radius: 10px; cursor: pointer;
          background: linear-gradient(135deg, #d97706, #b45309);
          color: #fff; font-weight: 700; font-size: 15px;
        }
        button:disabled { opacity: .55; cursor: not-allowed; }
        .error {
          margin: 14px 0 0; padding: 10px 12px; border-radius: 9px;
          background: rgba(225, 29, 72, .12); border: 1px solid rgba(225, 29, 72, .35);
          color: #fda4af; font-size: 12.5px; line-height: 1.6;
        }
        .footnote { margin: 22px 0 0; font-size: 11px; line-height: 1.7; color: #6b5a44; text-align: center; }
      `}</style>
    </main>
  );
}
