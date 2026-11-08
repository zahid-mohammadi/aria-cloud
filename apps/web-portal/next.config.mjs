/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@aria-cloud/ui',
    '@cloudscape-design/components',
    '@cloudscape-design/board-components',
    '@cloudscape-design/component-toolkit',
    '@cloudscape-design/design-tokens',
    '@cloudscape-design/global-styles',
  ],
};

export default nextConfig;
