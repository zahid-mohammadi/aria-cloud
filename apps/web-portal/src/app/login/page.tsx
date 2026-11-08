'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
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
        setError(
          data?.error === 'Invalid email or password.'
            ? 'ایمیل یا رمز عبور نادرست است. / Invalid email or password.'
            : data?.error || 'ورود ناموفق بود. / Sign-in failed.'
        );
        setBusy(false);
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('ارتباط با سرور برقرار نشد. / Could not reach the server.');
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="login-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">A</span>
          <div>
            <h1>AriaCloud</h1>
            <p className="tagline">پورتال تاجر · Merchant Console</p>
          </div>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <label htmlFor="email">ایمیل / Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@kabul-saffron.af"
            dir="ltr"
            disabled={busy}
          />

          <label htmlFor="password">رمز عبور / Password</label>
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
            {busy ? 'در حال ورود… / Signing in…' : 'ورود / Sign in'}
          </button>
        </form>

        <p className="forgot">
          <a href="/forgot">رمز عبور را فراموش کرده‌اید؟ / Forgot password?</a>
        </p>

        <p className="footnote">
          حساب ندارید؟ با تیم آریا کلاود در واتساپ تماس بگیرید.
          <br />
          Need an account? Contact AriaCloud support.
        </p>
      </div>

      <style>{`
        .login-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: radial-gradient(1200px 600px at 50% -10%, #0f2f27 0%, #060d0b 55%, #040807 100%);
          font-family: 'Vazirmatn', 'Open Sans', system-ui, sans-serif;
          color: #e2e8f0;
        }
        .login-card {
          width: 100%;
          max-width: 420px;
          background: rgba(13, 25, 21, 0.92);
          border: 1px solid #1b352c;
          border-radius: 18px;
          padding: 32px 28px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
        }
        .brand { display: flex; align-items: center; gap: 14px; margin-bottom: 26px; }
        .brand-mark {
          width: 44px; height: 44px; border-radius: 12px;
          display: grid; place-items: center;
          background: linear-gradient(135deg, #059669, #0d9488);
          font-weight: 800; font-size: 22px; color: #fff;
        }
        h1 { margin: 0; font-size: 20px; letter-spacing: 0.2px; color: #f8fafc; }
        .tagline { margin: 2px 0 0; font-size: 12px; color: #6b8f83; }
        label { display: block; font-size: 12.5px; font-weight: 600; margin: 16px 0 6px; color: #a7c4ba; }
        input {
          width: 100%; box-sizing: border-box;
          padding: 11px 13px; border-radius: 10px;
          border: 1px solid #24463b; background: #08120f; color: #f1f5f9;
          font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s;
        }
        input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.16); }
        input:disabled { opacity: .6; }
        button {
          margin-top: 22px; width: 100%; padding: 12px;
          border: 0; border-radius: 10px; cursor: pointer;
          background: linear-gradient(135deg, #059669, #0d9488);
          color: #fff; font-weight: 700; font-size: 15px;
        }
        button:disabled { opacity: .55; cursor: not-allowed; }
        .error {
          margin: 14px 0 0; padding: 10px 12px; border-radius: 9px;
          background: rgba(225, 29, 72, .12); border: 1px solid rgba(225, 29, 72, .35);
          color: #fda4af; font-size: 12.5px; line-height: 1.6;
        }
        .forgot { margin: 14px 0 0; text-align: center; font-size: 12.5px; }
        .forgot a { color: #34d399; text-decoration: none; }
        .footnote { margin: 22px 0 0; font-size: 11.5px; line-height: 1.7; color: #5c7d72; text-align: center; }
      `}</style>
    </main>
  );
}
