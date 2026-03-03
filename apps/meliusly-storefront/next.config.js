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
  // Externalize WebSocket packages that cause build errors
  // These are optional dependencies of @shopify/hydrogen-react that aren't needed in production
  serverExternalPackages: ['ws', 'bufferutil', 'utf-8-validate'],
  // Turbopack disabled due to incompatibility with dynamic requires in ws package
  // Falling back to webpack bundler which handles serverExternalPackages correctly
}

module.exports = nextConfig
