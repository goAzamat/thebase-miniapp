import createNextIntlPlugin from 'next-intl/plugin';

// Wires next-intl into the build and points it at the request config.
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `xmlrpc` is a Node-only library used by Server Actions / route handlers.
  // Marking it external keeps it out of bundling and out of the Edge runtime.
  serverExternalPackages: ['xmlrpc'],
  // Don't let lint warnings block the deploy. TypeScript type-checking stays
  // ON (real type errors still fail the build) — only ESLint is decoupled.
  eslint: { ignoreDuringBuilds: true },
};

export default withNextIntl(nextConfig);
