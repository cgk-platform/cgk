/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@cgk-platform/ui', '@cgk-platform/core', '@cgk-platform/db', '@cgk-platform/auth', '@cgk-platform/payments'],
}

module.exports = nextConfig
