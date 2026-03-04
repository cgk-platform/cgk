/**
 * Platform Configuration
 * Generated from tenant export: rawdog
 * Export date: 2026-03-04T04:10:22.984Z
 */

export const platformConfig = {
  tenant: {
    slug: 'rawdog',
    name: 'Rawdog',
    status: 'active',
  },

  integrations: {
    shopify: {
      enabled: false,
      storeDomain: null,
    },
    stripe: {
      enabled: false,
      accountId: null,
    },
  },

  settings: {},
} as const

export type PlatformConfig = typeof platformConfig
