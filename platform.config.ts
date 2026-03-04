/**
 * CGK Platform - Brand Configuration TEMPLATE
 *
 * This is the TEMPLATE repository. Real tenant data has been exported to separate forks.
 * This file contains example configuration only.
 *
 * IMPORTANT: When forking for a new tenant:
 * 1. Update deployment.name and deployment.organization
 * 2. Update tenants array with your brand information
 * 3. Update vercel.team with your Vercel team ID
 * 4. Enable/disable features as needed
 */

import { validatePlatformConfig } from '@cgk-platform/core'

const platformConfigDraft = {
  /**
   * Deployment Information
   */
  deployment: {
    name: process.env.COMPANY_NAME || 'My Company',
    organization: process.env.COMPANY_NAME || 'My Organization',
    mode: 'single-tenant', // Change to 'multi-tenant' if managing multiple brands
  },

  /**
   * Tenants/Brands in this deployment
   * Each tenant gets its own schema in the shared database
   *
   * TEMPLATE EXAMPLE - Replace with your brand data
   */
  tenants: [
    {
      slug: process.env.DEFAULT_TENANT_SLUG || 'my-brand',
      name: process.env.NEXT_PUBLIC_SITE_NAME || 'My Brand',
      schema: `tenant_${process.env.DEFAULT_TENANT_SLUG || 'my_brand'}`,
      primaryColor: process.env.PRIMARY_COLOR || '#0268A0',
      secondaryColor: process.env.SECONDARY_COLOR || '#6ABFEF',
      logo: '/brands/my-brand/logo.svg',
      domain: process.env.BRAND_DOMAIN || 'mybrand.com',
      apps: {
        storefront: process.env.NEXT_PUBLIC_STOREFRONT_URL || 'shop.mybrand.com',
        admin: process.env.NEXT_PUBLIC_ADMIN_URL || 'admin.mybrand.com',
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
      `${process.env.DEFAULT_TENANT_SLUG || 'my-brand'}-admin`,
      `${process.env.DEFAULT_TENANT_SLUG || 'my-brand'}-storefront`,
      `${process.env.DEFAULT_TENANT_SLUG || 'my-brand'}-shopify-app`,
      `${process.env.DEFAULT_TENANT_SLUG || 'my-brand'}-orchestrator`,
      `${process.env.DEFAULT_TENANT_SLUG || 'my-brand'}-creator-portal`,
      `${process.env.DEFAULT_TENANT_SLUG || 'my-brand'}-contractor-portal`,
      `${process.env.DEFAULT_TENANT_SLUG || 'my-brand'}-mcp-server`,
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
   * Enable only what you need to reduce complexity
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
  },
} as const

// Validate configuration at module load
// This catches configuration errors immediately rather than at runtime
try {
  validatePlatformConfig(platformConfigDraft)
} catch (error) {
  if (error instanceof Error) {
    console.error('\n' + '='.repeat(80))
    console.error('❌ PLATFORM CONFIGURATION ERROR')
    console.error('='.repeat(80))
    console.error(error.message)
    console.error('='.repeat(80) + '\n')
  }
  throw error
}

// Export validated config
export const platformConfig = platformConfigDraft
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
