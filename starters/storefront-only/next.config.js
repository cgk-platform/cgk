/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@cgk/ui', '@cgk/commerce'],
  images: {
    domains: ['cdn.shopify.com'],
  },
}

module.exports = nextConfig
