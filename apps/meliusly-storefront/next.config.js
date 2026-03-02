/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: '*.myshopify.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Enable Turbopack for faster development
  experimental: {
    turbo: {},
  },
}

module.exports = nextConfig
