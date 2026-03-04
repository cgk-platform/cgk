/**
 * Platform Configuration
 * Generated from tenant export: cgk_linens
 * Export date: 2026-03-04T04:08:36.184Z
 */

export const platformConfig = {
  tenant: {
    slug: 'cgk_linens',
    name: 'CGK Linens',
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
