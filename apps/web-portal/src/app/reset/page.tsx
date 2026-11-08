'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Read the token from the URL without needing a Suspense boundary.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    if (password.length < 8) {
      setError('رمز عبور باید حداقل ۸ حرف باشد. / Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('تکرار رمز عبور مطابقت ندارد. / Passwords do not match.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not reset the password.');
        setBusy(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.replace('/login'), 1800);
    } catch {
      setError('ارتباط با سرور برقرار نشد. / Could not reach the server.');
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <div className="card">
        <h1>تعیین رمز عبور جدید / Set a new password</h1>

        {!token && (
          <p className="note">
            این لینک معتبر نیست. دوباره درخواست بازیابی کنید.
            <br />
            This link is missing its token.{' '}
            <Link href="/forgot">Request a new one</Link>.
          </p>
        )}

        {done ? (
          <p className="note">
            رمز عبور تغییر کرد. در حال انتقال به صفحه ورود…
            <br />
            Password updated. Redirecting to sign in…
          </p>
        ) : (
          token && (
            <form onSubmit={onSubmit} noValidate>
              <label htmlFor="password">رمز عبور جدید / New password</label>
              <input
                id="password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
              <label htmlFor="confirm">تکرار رمز / Confirm password</label>
              <input
                id="confirm"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={busy}
              />
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy || !password || !confirm}>
                {busy ? 'در حال ذخیره… / Saving…' : 'ذخیره رمز عبور / Save password'}
              </button>
            </form>
          )
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
        label{display:block;font-size:12.5px;font-weight:600;margin:14px 0 6px;color:#a7c4ba}
        label:first-of-type{margin-top:0}
        input{width:100%;box-sizing:border-box;padding:11px 13px;border-radius:10px;border:1px solid #24463b;
          background:#08120f;color:#f1f5f9;font-size:14px;outline:none}
        input:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.16)}
        button{margin-top:20px;width:100%;padding:12px;border:0;border-radius:10px;cursor:pointer;
          background:linear-gradient(135deg,#059669,#0d9488);color:#fff;font-weight:700;font-size:14.5px}
        button:disabled{opacity:.55;cursor:not-allowed}
        .note{font-size:13px;line-height:1.9;color:#a7c4ba;margin:0}
        .note a{color:#34d399}
        .error{margin:14px 0 0;padding:10px 12px;border-radius:9px;background:rgba(225,29,72,.12);
          border:1px solid rgba(225,29,72,.35);color:#fda4af;font-size:12.5px;line-height:1.6}
        .back{margin:22px 0 0;font-size:12px;text-align:center}
        .back a{color:#34d399;text-decoration:none}
      `}</style>
    </main>
  );
}
