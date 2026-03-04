/**
 * CGK Platform - Brand Configuration Template
 *
 * This is a TEMPLATE file for the cgk-template repository.
 * When forking, copy this to platform.config.ts and customize for your brands.
 *
 * This file will be protected from upstream merges by .gitattributes (merge=ours).
 */

export const platformConfig = {
  /**
   * Deployment Information
   * Update with your company/brand information
   */
  deployment: {
    name: process.env.COMPANY_NAME || 'Your Company Name',
    organization: process.env.COMPANY_NAME || 'Your Organization',
    mode: 'single-tenant' as 'single-tenant' | 'multi-tenant',
  },

  /**
   * Tenants/Brands in this deployment
   * Each tenant gets its own schema in the shared database
   *
   * Single-tenant example:
   * tenants: [
   *   {
   *     slug: 'your-brand',
   *     name: 'Your Brand',
   *     schema: 'tenant_your_brand',
   *     primaryColor: '#000000',
   *     secondaryColor: '#FFFFFF',
   *     logo: '/brands/your-brand/logo.svg',
   *     domain: 'yourbrand.com',
   *     apps: {
   *       storefront: 'shop.yourbrand.com',
   *       admin: 'admin.yourbrand.com',
   *     },
   *   },
   * ]
   *
   * Multi-tenant example (sister brands):
   * tenants: [
   *   { slug: 'brand-one', ... },
   *   { slug: 'brand-two', ... },
   * ]
   */
  tenants: [
    {
      slug: process.env.DEFAULT_TENANT_SLUG || 'your-brand',
      name: process.env.NEXT_PUBLIC_SITE_NAME || 'Your Brand',
      schema: `tenant_${process.env.DEFAULT_TENANT_SLUG || 'your-brand'}`,
      primaryColor: process.env.PRIMARY_COLOR || '#000000',
      secondaryColor: process.env.SECONDARY_COLOR || '#FFFFFF',
      logo: '/brands/your-brand/logo.svg',
      domain: process.env.BRAND_DOMAIN || 'yourbrand.com',
      apps: {
        storefront: process.env.NEXT_PUBLIC_STOREFRONT_URL || 'shop.yourbrand.com',
        admin: process.env.NEXT_PUBLIC_ADMIN_URL || 'admin.yourbrand.com',
      },
    },
  ],

  /**
   * Vercel Configuration
   * Update with your Vercel team and project names
   */
  vercel: {
    team: process.env.VERCEL_TEAM || 'your-team-id',
    projects: [
      `${process.env.DEFAULT_TENANT_SLUG || 'your-brand'}-admin`,
      `${process.env.DEFAULT_TENANT_SLUG || 'your-brand'}-storefront`,
      `${process.env.DEFAULT_TENANT_SLUG || 'your-brand'}-creator-portal`,
      `${process.env.DEFAULT_TENANT_SLUG || 'your-brand'}-contractor-portal`,
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
    multiTenant: false, // Set to true if managing multiple brands
    shopifyIntegration: true,
    stripeConnect: true,
    wisePayments: false, // Enable if you need international payments
    creatorPortal: true,
    contractorPortal: true,
    videoTranscription: false, // Enable if using video content
    aiFeatures: false, // Enable if using AI/LLM features
    analyticsIntegrations: false, // Enable if using Google/Meta/TikTok integrations

    // openCLAW Integration (optional)
    // openclawIntegration: false,
    // commandCenter: false,
    // creativeStudio: false,
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
