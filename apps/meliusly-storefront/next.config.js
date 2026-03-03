/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.myshopify.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Externalize WebSocket packages that cause build errors with Turbopack
  // These are optional dependencies of @shopify/hydrogen-react not needed in production
  serverExternalPackages: ['ws', 'bufferutil', 'utf-8-validate'],
  // Turbopack disabled - WebSocket bundling incompatibility
  // Re-enable after Next.js resolves serverExternalPackages support for Turbopack
  // https://github.com/vercel/next.js/issues/84336
}

module.exports = nextConfig
