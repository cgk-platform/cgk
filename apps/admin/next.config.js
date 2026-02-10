/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@cgk/ui', '@cgk/core', '@cgk/db', '@cgk/auth', '@cgk/commerce', '@cgk/shopify'],
}

module.exports = nextConfig
