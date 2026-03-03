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
  // Externalize WebSocket packages that cause Turbopack build errors
  // These are optional dependencies of @shopify/hydrogen-react that aren't needed in production
  serverExternalPackages: ['ws', 'bufferutil', 'utf-8-validate'],
  // Enable Turbopack for faster development
  experimental: {
    turbo: {},
  },
}

module.exports = nextConfig
