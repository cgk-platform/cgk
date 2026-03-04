/**
 * CGK Platform - Brand Configuration
 *
 * This file contains brand-specific configuration for your deployment.
 * It is protected from upstream merges by .gitattributes (merge=ours).
 *
 * Your deployment manages TWO brands (sister companies):
 * 1. CGK Linens (tenant_cgk_linens)
 * 2. Meliusly (tenant_meliusly)
 */

export const platformConfig = {
  /**
   * Deployment Information
   */
  deployment: {
    name: 'CGK Linens + Meliusly',
    organization: 'CGK Linens LLC',
    mode: 'multi-tenant', // This deployment manages 2 brands
  },

  /**
   * Tenants/Brands in this deployment
   * Each tenant gets its own schema in the shared database
   */
  tenants: [
    {
      slug: 'cgk-linens',
      name: 'CGK Linens',
      schema: 'tenant_cgk_linens',
      primaryColor: '#2B3E50', // Navy
      secondaryColor: '#FFB81C', // Gold
      logo: '/brands/cgk-linens/logo.svg',
      domain: 'cgklinens.com',
      apps: {
        storefront: 'shop.cgklinens.com',
        admin: 'admin.cgklinens.com',
      },
    },
    {
      slug: 'meliusly',
      name: 'Meliusly',
      schema: 'tenant_meliusly',
      primaryColor: '#000000', // Black
      secondaryColor: '#FFFFFF', // White
      logo: '/brands/meliusly/logo.svg',
      domain: 'meliusly.com',
      apps: {
        storefront: 'shop.meliusly.com',
        admin: 'admin.meliusly.com',
      },
    },
  ],

  /**
   * Vercel Configuration
   * All apps deployed under single Vercel team
   */
  vercel: {
    team: 'cgk-linens-88e79683',
    projects: [
      'cgk-admin',
      'cgk-storefront',
      'cgk-shopify-app',
      'cgk-orchestrator',
      'cgk-creator-portal',
      'cgk-contractor-portal',
      'cgk-mcp-server',
    ],
  },

  /**
   * Platform Hub Connection
   * Shared infrastructure provided by CGK Platform
   */
  hub: {
    database: 'neon-postgresql', // Schema-per-tenant
    cache: 'upstash-redis', // Tenant-isolated keys
    provider: 'cgk-platform',
  },

  /**
   * Feature Flags
   * Control which features are enabled for this deployment
   */
  features: {
    multiTenant: true, // Supports multiple brands
    shopifyIntegration: true,
    stripeConnect: true,
    wisePayments: true,
    creatorPortal: true,
    contractorPortal: true,
    videoTranscription: true,
    aiFeatures: true,
    analyticsIntegrations: true,
  },
} as const

export type PlatformConfig = typeof platformConfig

/**
 * Get configuration for a specific tenant
 */
export function getTenantConfig(slug: string) {
  return platformConfig.tenants.find((t) => t.slug === slug)
}

/**
 * Get all tenant slugs
 */
export function getAllTenantSlugs() {
  return platformConfig.tenants.map((t) => t.slug)
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof platformConfig.features) {
  return platformConfig.features[feature]
}
