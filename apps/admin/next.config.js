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
    '@cgk-platform/slack',
  ],

  // Mark packages that should only run on the server
  // @cgk-platform/jobs and @cgk-platform/admin-core use Node.js built-ins
  // (child_process, stream/web) and must not be bundled for the client
  serverExternalPackages: [
    '@slack/web-api',
    'sharp',
    'bcryptjs',
    '@cgk-platform/jobs',
    '@cgk-platform/admin-core',
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
        child_process: false,
      }
      // Server-only workspace packages must not be bundled for the client.
      // @cgk-platform/jobs and @cgk-platform/admin-core use Node.js built-ins
      // (child_process, stream/web) that are unavailable in the browser.
      const serverOnlyPackages = [
        '@cgk-platform/jobs',
        '@cgk-platform/admin-core',
      ]
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : config.externals ? [config.externals] : []),
        ({ request }, callback) => {
          if (serverOnlyPackages.some(pkg => request === pkg || request?.startsWith(pkg + '/'))) {
            return callback(null, `commonjs ${request}`)
          }
          callback()
        },
      ]
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
