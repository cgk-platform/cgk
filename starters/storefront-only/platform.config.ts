import { defineConfig } from '@cgk-platform/core'

export default defineConfig({
  brand: {
    name: 'My Storefront',
    slug: 'mystore',
  },
  features: {
    creators: false,
    abTesting: false,
    attribution: false,
    reviews: true,
  },
  shopify: {
    storeDomain: 'mystore.myshopify.com',
  },
  deployment: {
    profile: 'small',
  },
})
