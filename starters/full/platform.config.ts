import { defineConfig } from '@cgk-platform/core'

export default defineConfig({
  brand: {
    name: 'My Brand',
    slug: 'mybrand',
  },
  features: {
    creators: true,
    abTesting: true,
    attribution: {
      enabled: true,
      models: ['last-touch', 'linear', 'first-touch'],
    },
    reviews: true,
    subscriptions: true,
  },
  shopify: {
    storeDomain: 'mybrand.myshopify.com',
  },
  deployment: {
    profile: 'medium',
  },
})
