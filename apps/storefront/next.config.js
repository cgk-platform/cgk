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
    // Apply to ALL builds (server + client): workspace symlinks bypass
    // serverExternalPackages name-matching, so webpack externals function
    // is required to prevent tracing into jobs/dist and failing to resolve
    // @cgk-platform/admin-core subpaths that are not in jobs' dep tree.
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
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, path: false, os: false, crypto: false,
        stream: false, querystring: false, url: false, child_process: false,
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
