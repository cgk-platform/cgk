/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@cgk/mcp',
    '@cgk/core',
    '@cgk/db',
    '@cgk/auth',
  ],

  // No external packages needed - everything is Edge compatible
  serverExternalPackages: [],

  // Enable experimental edge runtime by default for API routes
  experimental: {
    // serverActions are enabled by default in Next.js 15+
  },
}

module.exports = nextConfig
