/**
 * Platform Configuration
 * Generated from tenant export: meliusly
 * Export date: 2026-03-04T04:07:33.528Z
 */

export const platformConfig = {
  tenant: {
    slug: 'meliusly',
    name: 'Meliusly',
    status: 'active',
  },

  integrations: {
    shopify: {
      enabled: true,
      storeDomain: 'meliusly.myshopify.com',
    },
    stripe: {
      enabled: false,
      accountId: null,
    },
  },

  settings: {
    theme: {
      primaryColor: '#0268A0',
    },
    features: {
      reviews: true,
    },
  },
} as const

export type PlatformConfig = typeof platformConfig
