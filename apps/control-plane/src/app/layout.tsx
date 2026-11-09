import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aria Cloud & AI Studio | Multi-Tenant Control Plane (me-central-1)',
  description:
    'Enterprise multi-tenant control plane for Aria Cloud Services & AI Studio: ElevenLabs Dari/Pashto Voiceovers, Amazon Nova Canvas Image Studio, Daily WhatsApp Voice Assistant, Stalwart Business Email, and AFN/USD HesabPay settlement.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Vazirmatn:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
