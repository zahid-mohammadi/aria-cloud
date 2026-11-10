/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Dev mode requires unsafe-eval for Next.js HMR/source-maps; production stays strict.
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''}`,

      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data: https:",
      "img-src 'self' data: https:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
];

async function headers() {
  return [{ source: '/(.*)', headers: securityHeaders }];
}

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@aria-cloud/database'],
  headers,
};

export default nextConfig;
