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
    '@cgk-platform/video',
  ],

  serverExternalPackages: [
    '@cgk-platform/admin-core',
    '@cgk-platform/dam',
    '@cgk-platform/slack',
    '@slack/web-api',
    'sharp',
    'bcryptjs',
    'mux-node',
    '@mux/mux-node',
  ],

  webpack: (config, { isServer, webpack }) => {
    // Memory optimization: reduce parallelism to prevent OOM
    config.parallelism = 1

    if (!isServer) {
      // Client components transitively reach @slack/web-api through the chain:
      // video-card.tsx → @cgk-platform/video → integrations → jobs →
      // admin-core/workflow → slack → @slack/web-api → node:fs/os/path/etc.
      //
      // webpack can't handle the node: URI scheme in client bundles.
      // Strip the prefix so resolve.fallback entries (fs: false, etc.) apply.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '')
        })
      )
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,
        child_process: false,
        dns: false,
        fs: false,
        'fs/promises': false,
        net: false,
        os: false,
        path: false,
        querystring: false,
        stream: false,
        'stream/web': false,
        tls: false,
      }

      // Optimize chunks to reduce memory usage
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // CGK packages chunk
            cgk: {
              name: 'cgk',
              chunks: 'all',
              test: /@cgk-platform/,
              priority: 10,
            },
          },
        },
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
