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
  transpilePackages: ['@cgk-platform/ui', '@cgk-platform/core', '@cgk-platform/commerce', '@cgk-platform/shopify', '@cgk-platform/analytics'],

  // @cgk-platform/jobs uses Node.js built-ins and dynamic imports of
  // packages not in its dep tree — must not be bundled by webpack
  serverExternalPackages: [
    '@cgk-platform/jobs',
    '@cgk-platform/admin-core',
  ],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Workspace packages that use Node.js built-ins must not be bundled
      // for the client. jobs/dist contains dynamic imports of admin-core
      // subpaths that webpack cannot resolve in the browser context.
      const serverOnlyPackages = ['@cgk-platform/jobs', '@cgk-platform/admin-core']
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
