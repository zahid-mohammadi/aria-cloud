'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const PLAN_OPTIONS = [
  { id: 'free', label: 'Community Free — 0 AFN/mo (1,000 AI credits · Chat)' },
  { id: 'student_af', label: 'Aria AI Student (محصلین) — 120 AFN/mo (8,000 AI credits)' },
  { id: 'creator_af', label: 'Aria AI Personal Plus — 350 AFN/mo (25,000 AI credits · Voice & Images)' },
  { id: 'starter_af', label: 'Starter Business — 420 AFN/mo (15,000 credits + PWA + 1 Mailbox)' },
  { id: 'business_pro', label: 'Business Pro — 1,100 AFN/mo (45,000 credits + Custom Domain + 5 Mailboxes)' },
  { id: 'agency_af', label: 'School / NGO / Org — 2,500 AFN/mo (100,000 credits + 25 Mailboxes)' },
];

export default function SignupPage() {
  const router = useRouter();
  const [planTier, setPlanTier] = useState('starter_af');
  const [businessName, setBusinessName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [locale, setLocale] = useState<'fa' | 'ps' | 'en'>('fa');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('plan');
    if (q && PLAN_OPTIONS.some((p) => p.id === q)) {
      setPlanTier(q);
    }
  }, []);

  function onBusinessNameChange(val: string) {
    setBusinessName(val);
    // Auto-slugify for convenience if subdomain hasn't been manually heavily edited
    if (!subdomain || subdomain === slugify(businessName)) {
      setSubdomain(slugify(val));
    }
  }

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-')
      .slice(0, 32);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTier,
          businessName,
          subdomain,
          fullName,
          email,
          phone: phone || null,
          password,
          locale,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || 'ثبت‌نام ناموفق بود. / Registration failed.');
        setBusy(false);
        return;
      }

      router.replace(data.redirect || '/dashboard');
      router.refresh();
    } catch {
      setError('ارتباط با سرور برقرار نشد. / Could not reach the server.');
      setBusy(false);
    }
  }

  return (
    <main className="signup-shell">
      <div className="signup-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">A</span>
          <div>
            <h1>AriaCloud</h1>
            <p className="tagline">افتتاح حساب تجاری · Register Business Account</p>
          </div>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="planTier">انتخاب پلن / Plan Selection</label>
            <select
              id="planTier"
              value={planTier}
              onChange={(e) => setPlanTier(e.target.value)}
              disabled={busy}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#050c0a',
                border: '1px solid #223f35',
                color: '#f8fafc',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '14px',
              }}
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="businessName">نام کسب‌وکار یا نام شخصی / Business or Personal Name</label>
            <input
              id="businessName"
              type="text"
              required
              value={businessName}
              onChange={(e) => onBusinessNameChange(e.target.value)}
              placeholder="زعفران هرات / Herat Saffron"
              disabled={busy}
            />
          </div>

          <div className="form-group">
            <label htmlFor="subdomain">زیردامنه انتخابی / Desired Subdomain</label>
            <div className="subdomain-input-wrapper">
              <input
                id="subdomain"
                type="text"
                required
                value={subdomain}
                onChange={(e) => setSubdomain(slugify(e.target.value))}
                placeholder="herat-saffron"
                dir="ltr"
                disabled={busy}
              />
              <span className="domain-suffix">.ariacloudservices.org</span>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label htmlFor="fullName">نام مدیر / Owner Full Name</label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="احمد ولی / Ahmad Wali"
                disabled={busy}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">شماره واتساپ / WhatsApp (اختیاری)</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+93799000000"
                dir="ltr"
                disabled={busy}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">ایمیل تجاری / Business Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@business.af"
              dir="ltr"
              disabled={busy}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">رمز عبور / Password (حداقل ۸ کاراکتر)</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              dir="ltr"
              disabled={busy}
            />
          </div>

          <div className="form-group">
            <label>زبان ارتباطی / Preferred Language</label>
            <div className="lang-selector">
              <button
                type="button"
                className={`lang-btn ${locale === 'fa' ? 'active' : ''}`}
                onClick={() => setLocale('fa')}
              >
                دری (Farsi/Dari)
              </button>
              <button
                type="button"
                className={`lang-btn ${locale === 'ps' ? 'active' : ''}`}
                onClick={() => setLocale('ps')}
              >
                پښتو (Pashto)
              </button>
              <button
                type="button"
                className={`lang-btn ${locale === 'en' ? 'active' : ''}`}
                onClick={() => setLocale('en')}
              >
                English
              </button>
            </div>
          </div>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={busy || !businessName || !subdomain || !fullName || !email || password.length < 8}
          >
            {busy ? 'در حال ثبت حساب… / Creating Account…' : 'ایجاد حساب و ورود به کنسول / Create Account'}
          </button>
        </form>

        <p className="login-link">
          قبلاً حساب ایجاد کرده‌اید؟{' '}
          <Link href="/login">ورود به پورتال / Sign In</Link>
        </p>
      </div>

      <style>{`
        .signup-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          background: radial-gradient(1200px 600px at 50% -10%, #0f2f27 0%, #060d0b 55%, #040807 100%);
          font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif;
          color: #e2e8f0;
        }
        .signup-card {
          width: 100%;
          max-width: 520px;
          background: rgba(13, 25, 21, 0.94);
          border: 1px solid #1b352c;
          border-radius: 14px;
          padding: 32px;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .brand-mark {
          width: 40px;
          height: 40px;
          border-radius: 9px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 20px;
          color: #04120d;
        }
        h1 {
          font-size: 20px;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }
        .tagline {
          font-size: 13px;
          color: #94a3b8;
          margin: 2px 0 0 0;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 500px) {
          .grid-2 {
            grid-template-columns: 1fr;
          }
        }
        label {
          font-size: 13px;
          color: #cbd5e1;
          font-weight: 500;
        }
        input {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #234338;
          background: #091512;
          color: #f8fafc;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        input:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }
        .subdomain-input-wrapper {
          display: flex;
          align-items: center;
          border-radius: 8px;
          border: 1px solid #234338;
          background: #091512;
          overflow: hidden;
        }
        .subdomain-input-wrapper input {
          border: none;
          background: transparent;
          flex: 1;
        }
        .domain-suffix {
          padding: 0 10px;
          font-size: 12px;
          color: #64748b;
          white-space: nowrap;
          direction: ltr;
        }
        .lang-selector {
          display: flex;
          gap: 8px;
        }
        .lang-btn {
          flex: 1;
          padding: 8px 6px;
          border-radius: 7px;
          border: 1px solid #234338;
          background: #091512;
          color: #94a3b8;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .lang-btn.active {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          font-weight: 600;
        }
        .submit-btn {
          margin-top: 8px;
          padding: 12px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #04120d;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }
        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .error {
          font-size: 13px;
          color: #f87171;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          padding: 8px 12px;
          border-radius: 6px;
          margin: 0;
        }
        .login-link {
          text-align: center;
          margin-top: 20px;
          margin-bottom: 0;
          font-size: 13px;
          color: #94a3b8;
        }
        .login-link a {
          color: #34d399;
          text-decoration: none;
          font-weight: 600;
        }
        .login-link a:hover {
          text-decoration: underline;
        }
      `}</style>
    </main>
  );
}
