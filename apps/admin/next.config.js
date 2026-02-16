/** @type {import('next').NextConfig} */

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

const nextConfig = {
  transpilePackages: [
    '@cgk-platform/ui',
    '@cgk-platform/core',
    '@cgk-platform/db',
    '@cgk-platform/auth',
    '@cgk-platform/commerce',
    '@cgk-platform/shopify',
    '@cgk-platform/dam',
    '@cgk-platform/video',
    '@cgk-platform/jobs',
    '@cgk-platform/slack',
  ],

  // Mark packages that should only run on the server
  serverExternalPackages: [
    '@slack/web-api',
    'sharp',
    'bcryptjs',
  ],

  // Configure webpack to handle node: protocol
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve node: modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        querystring: false,
        url: false,
      }
    }
    return config
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
