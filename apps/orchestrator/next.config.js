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
  transpilePackages: ['@cgk-platform/ui', '@cgk-platform/core', '@cgk-platform/db', '@cgk-platform/auth'],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}


  // @cgk-platform/jobs uses dynamic imports not resolvable by webpack
  serverExternalPackages: ['@cgk-platform/jobs', '@cgk-platform/admin-core'],

  webpack: (config, { isServer }) => {
    // Mark @cgk-platform/jobs and @cgk-platform/admin-core as external for ALL builds.
    // workspace symlinks bypass serverExternalPackages name-matching, so we must
    // use the externals function for both server and client compilations to prevent
    // webpack from tracing into jobs/dist and failing to resolve admin-core subpaths.
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
        fs: false, path: false, os: false, crypto: false,
        stream: false, querystring: false, url: false, child_process: false,
      }
    }
    return config
  },

module.exports = nextConfig
