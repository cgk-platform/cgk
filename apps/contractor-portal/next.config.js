/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cgk-platform/core', '@cgk-platform/db', '@cgk-platform/auth', '@cgk-platform/ui', '@cgk-platform/payments'],
  typedRoutes: true,
}

module.exports = nextConfig
