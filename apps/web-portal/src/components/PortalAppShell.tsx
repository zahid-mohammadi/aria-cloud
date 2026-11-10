'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Language, useTranslation } from '@aria-cloud/ui';
import { useCloudscapeTheme } from '../context/CloudscapeThemeContext';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
}

export function PortalAppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage, t, dir, isRtl } = useTranslation();
  const { mode, toggleMode, activeNavHref, setActiveNavHref } = useCloudscapeTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (pathname) {
      setActiveNavHref(pathname);
      setMobileMenuOpen(false);
    }
  }, [pathname, setActiveNavHref]);

  const isPublicOrAuth =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot' ||
    pathname === '/reset';

  if (isPublicOrAuth) {
    return <>{children}</>;
  }

  const navItems: NavItem[] = [
    { href: '/dashboard', label: t.nav.dashboard, icon: '📊' },
    { href: '/store-builder', label: t.nav.storefront, icon: '🛍️', badge: 'PWA' },
    { href: '/ai-studio', label: t.nav.aiStudioHeader, icon: '🤖', badge: 'AI' },
    { href: '/domains', label: 'Domains & DNS', icon: '🌐' },
    { href: '/email', label: t.nav.email, icon: '✉️' },
    { href: '/billing', label: t.nav.billingHeader, icon: '💳', badge: 'AFN' },
    { href: '/kyc', label: 'Verification (KYC)', icon: '🛡️' },
  ];

  const searchableItems = [
    ...navItems.map((n) => ({ ...n, keywords: `${n.label} ${n.href}`.toLowerCase() })),
    { href: '/store-builder', label: 'Multi-Page Site Builder', icon: '📄', keywords: 'pages store site website builder pwa' },
    { href: '/ai-studio', label: 'Voice & Image Studio', icon: '🎙️', keywords: 'voice image tts audio assistant studio jobs' },
    { href: '/billing', label: 'Invoices & HesabPay', icon: '🧾', keywords: 'invoice hesabpay payment wallet afn usd' },
    { href: '/domains', label: 'Custom Domain DNS', icon: '🔗', keywords: 'domain dns ssl dkim subdomain' },
    { href: '/kyc', label: 'Tazkira & Business License', icon: '🪪', keywords: 'kyc tazkira passport compliance verification' },
  ];

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const searchResults = trimmedQuery
    ? searchableItems.filter((item) => item.keywords.includes(trimmedQuery) || item.label.toLowerCase().includes(trimmedQuery)).slice(0, 5)
    : [];

  function handleSearchNavigate(href: string) {
    setSearchQuery('');
    router.push(href);
  }

  async function handleSignOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className={`portal-root ${mode === 'dark' ? 'dark' : 'light'}`} dir={dir}>
      {/* Top Header */}
      <header className="portal-header">
        <div className="header-start">
          <button
            type="button"
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle Navigation"
          >
            ☰
          </button>
          <Link href="/dashboard" className="brand-logo">
            <span className="brand-badge">A</span>
            <span className="brand-name">{t.appTitle}</span>
          </Link>
          <span className="tenant-domain-pill">*.ariacloudservices.org</span>
        </div>

        <div className="header-center">
          <div className="search-wrap">
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    e.preventDefault();
                    handleSearchNavigate(searchResults[0].href);
                  } else if (e.key === 'Escape') {
                    setSearchQuery('');
                  }
                }}
                placeholder={t.nav.searchPlaceholder}
                aria-label="Search portal navigation"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            {trimmedQuery && (
              <div className="search-dropdown">
                {searchResults.length === 0 ? (
                  <div className="search-empty">No matching portal section.</div>
                ) : (
                  searchResults.map((res, idx) => (
                    <button
                      key={`${res.href}-${idx}`}
                      type="button"
                      className="search-option"
                      onClick={() => handleSearchNavigate(res.href)}
                    >
                      <span>{res.icon}</span>
                      <span>{res.label}</span>
                      <span className="search-href">{res.href}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="header-end">
          {/* Language Switcher */}
          <div className="lang-group">
            <button
              type="button"
              className={`lang-pill ${language === 'fa' || language === 'da' ? 'active' : ''}`}
              onClick={() => setLanguage('fa')}
              title="دری"
            >
              دری
            </button>
            <button
              type="button"
              className={`lang-pill ${language === 'ps' ? 'active' : ''}`}
              onClick={() => setLanguage('ps')}
              title="پښتو"
            >
              پښتو
            </button>
            <button
              type="button"
              className={`lang-pill ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
              title="English"
            >
              EN
            </button>
          </div>

          {/* Theme Mode Toggle */}
          <button
            type="button"
            className="header-icon-btn"
            onClick={toggleMode}
            title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {mode === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Sign Out */}
          <button
            type="button"
            className="signout-btn"
            onClick={handleSignOut}
          >
            {t.nav.signOut}
          </button>
        </div>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="portal-body">
        {/* Sidebar */}
        <aside className={`portal-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="sidebar-section-title">{t.tagline}</div>
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${active ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <div className="health-dot" />
            <span className="health-text">me-central-1 (UAE) · Active</span>
          </div>
        </aside>

        {/* Content Area */}
        <main className="portal-content">
          <div className="portal-content-inner">{children}</div>
        </main>
      </div>

      <style jsx>{`
        .portal-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #060d0b;
          color: #f1f5f9;
          font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif;
        }
        .portal-root.light {
          background: #f8fafc;
          color: #0f172a;
        }

        /* Top Header */
        .portal-header {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          background: rgba(10, 20, 17, 0.96);
          border-bottom: 1px solid #162c24;
          backdrop-filter: blur(8px);
        }
        .portal-root.light .portal-header {
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid #e2e8f0;
        }

        .header-start {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .mobile-toggle {
          display: none;
          background: transparent;
          border: none;
          font-size: 20px;
          color: inherit;
          cursor: pointer;
        }
        @media (max-width: 860px) {
          .mobile-toggle {
            display: block;
          }
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: inherit;
        }
        .brand-badge {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 16px;
          color: #04120d;
        }
        .brand-name {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .tenant-domain-pill {
          font-size: 11px;
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 3px 8px;
          border-radius: 999px;
          font-family: ui-monospace, SFMono-Regular, monospace;
        }
        @media (max-width: 640px) {
          .tenant-domain-pill {
            display: none;
          }
        }

        .header-center {
          flex: 1;
          max-width: 380px;
          margin: 0 20px;
        }
        @media (max-width: 768px) {
          .header-center {
            display: none;
          }
        }
        .search-wrap {
          position: relative;
        }
        .search-bar {
          display: flex;
          align-items: center;
          background: #0a1813;
          border: 1px solid #162c24;
          border-radius: 8px;
          padding: 6px 12px;
          gap: 8px;
        }
        .portal-root.light .search-bar {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .search-bar input {
          background: transparent;
          border: none;
          outline: none;
          color: inherit;
          font-size: 13px;
          width: 100%;
        }
        .search-clear {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 12px;
          padding: 0 2px;
        }
        .search-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #0d1915;
          border: 1px solid #1e3a30;
          border-radius: 10px;
          padding: 6px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
          z-index: 200;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .portal-root.light .search-dropdown {
          background: #ffffff;
          border-color: #cbd5e1;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
        }
        .search-option {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          text-align: start;
          padding: 8px 10px;
          border: none;
          border-radius: 7px;
          background: transparent;
          color: inherit;
          font-size: 13px;
          cursor: pointer;
        }
        .search-option:hover {
          background: rgba(16, 185, 129, 0.14);
        }
        .search-href {
          margin-inline-start: auto;
          font-size: 11px;
          color: #64748b;
          font-family: ui-monospace, SFMono-Regular, monospace;
        }
        .search-empty {
          padding: 10px 12px;
          font-size: 12px;
          color: #94a3b8;
        }

        .header-end {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lang-group {
          display: flex;
          background: #091512;
          border: 1px solid #162c24;
          border-radius: 8px;
          padding: 2px;
        }
        .portal-root.light .lang-group {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .lang-pill {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .lang-pill.active {
          background: #10b981;
          color: #04120d;
        }

        .header-icon-btn {
          background: #091512;
          border: 1px solid #162c24;
          border-radius: 8px;
          padding: 6px 10px;
          cursor: pointer;
          font-size: 14px;
        }
        .portal-root.light .header-icon-btn {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .signout-btn {
          background: transparent;
          border: 1px solid #234338;
          border-radius: 8px;
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .signout-btn:hover {
          background: rgba(239, 68, 68, 0.12);
          border-color: rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }
        .portal-root.light .signout-btn {
          border-color: #cbd5e1;
          color: #475569;
        }

        /* Body & Sidebar */
        .portal-body {
          display: flex;
          flex: 1;
        }
        .portal-sidebar {
          width: 250px;
          background: #081310;
          border-inline-end: 1px solid #162c24;
          display: flex;
          flex-direction: column;
          padding: 18px 12px;
          transition: transform 0.2s ease;
        }
        .portal-root.light .portal-sidebar {
          background: #ffffff;
          border-inline-end: 1px solid #e2e8f0;
        }
        @media (max-width: 860px) {
          .portal-sidebar {
            position: fixed;
            top: 60px;
            bottom: 0;
            z-index: 99;
            transform: translateX(-100%);
          }
          :global([dir="rtl"]) .portal-sidebar {
            transform: translateX(100%);
          }
          .portal-sidebar.open {
            transform: translateX(0) !important;
          }
        }

        .sidebar-section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          padding: 0 10px 10px;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 8px;
          text-decoration: none;
          color: #94a3b8;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.15s ease;
        }
        .portal-root.light .nav-item {
          color: #475569;
        }
        .nav-item:hover {
          background: rgba(16, 185, 129, 0.08);
          color: #f8fafc;
        }
        .portal-root.light .nav-item:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .nav-item.active {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          font-weight: 600;
        }
        .portal-root.light .nav-item.active {
          background: #ecfdf5;
          color: #059669;
        }
        .nav-icon {
          font-size: 16px;
        }
        .nav-label {
          flex: 1;
        }
        .nav-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 999px;
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }

        .sidebar-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          font-size: 11px;
          color: #64748b;
          border-top: 1px solid #162c24;
        }
        .portal-root.light .sidebar-footer {
          border-top-color: #e2e8f0;
        }
        .health-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        }

        /* Content */
        .portal-content {
          flex: 1;
          padding: 24px 32px;
          overflow-y: auto;
          max-width: 1400px;
          width: 100%;
        }
        @media (max-width: 768px) {
          .portal-content {
            padding: 16px;
          }
        }
        .portal-content-inner {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
