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
