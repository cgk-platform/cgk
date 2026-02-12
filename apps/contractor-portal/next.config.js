/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cgk/core', '@cgk/db', '@cgk/auth', '@cgk/ui', '@cgk/payments'],
  experimental: {
    typedRoutes: true,
  },
}

module.exports = nextConfig
