/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@cgk-platform/ui', '@cgk-platform/commerce'],
  images: {
    domains: ['cdn.shopify.com'],
  },
}

module.exports = nextConfig
