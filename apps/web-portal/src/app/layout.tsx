import type { Metadata } from 'next';
import '@cloudscape-design/global-styles/index.css';
import './globals.css';
import { LanguageProvider } from '@aria-cloud/ui';
import { CloudscapeThemeProvider } from '../context/CloudscapeThemeContext';
import { PortalAppShell } from '../components/PortalAppShell';

export const metadata: Metadata = {
  title: 'AriaCloud Console | app.ariacloudservices.org',
  description:
    'AriaCloud (ariacloudservices.org) — Afghan Digital Enablement Platform: Aria Global Edge & DNS, Aria Cloud Mail, Aria Core AI, Aria Creative Studio, Aria Voice Engine, and HesabPay/Aria Verified Handshake Billing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LanguageProvider>
          <CloudscapeThemeProvider>
            <PortalAppShell>{children}</PortalAppShell>
          </CloudscapeThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
