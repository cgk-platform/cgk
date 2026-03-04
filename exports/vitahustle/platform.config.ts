/**
 * Platform Configuration
 * Generated from tenant export: vitahustle
 * Export date: 2026-03-04T04:09:26.962Z
 */

export const platformConfig = {
  tenant: {
    slug: 'vitahustle',
    name: 'VitaHustle',
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
