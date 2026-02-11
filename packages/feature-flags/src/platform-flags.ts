/**
 * Platform Feature Flags
 *
 * Pre-defined feature flags for the CGK platform.
 * These are seeded on first run.
 */

import type { PlatformFlagDefinition } from './types.js'

/**
 * All 14 platform flags
 */
export const PLATFORM_FLAGS: PlatformFlagDefinition[] = [
  // Platform flags
  {
    key: 'platform.maintenance_mode',
    name: 'Maintenance Mode',
    description: 'Enable maintenance page across all storefronts',
    type: 'boolean',
    defaultValue: false,
    category: 'platform',
  },
  {
    key: 'platform.new_tenant_signup',
    name: 'New Tenant Signup',
    description: 'Allow new brand/tenant creation',
    type: 'boolean',
    defaultValue: true,
    category: 'platform',
  },

  // Checkout flags
  {
    key: 'checkout.new_flow',
    name: 'New Checkout Flow',
    description: 'New streamlined checkout experience',
    type: 'percentage',
    defaultValue: false,
    category: 'checkout',
    targeting: {
      percentage: 0, // Start at 0%, increase gradually
    },
  },
  {
    key: 'checkout.express_pay',
    name: 'Express Pay',
    description: 'Enable Apple Pay and Google Pay',
    type: 'boolean',
    defaultValue: false,
    category: 'checkout',
  },

  // Payments flags
  {
    key: 'payments.wise_enabled',
    name: 'Wise Payouts',
    description: 'Enable Wise for international creator payouts',
    type: 'tenant_list',
    defaultValue: false,
    category: 'payments',
    targeting: {
      enabledTenants: [], // Add tenant slugs here
    },
  },
  {
    key: 'payments.instant_payouts',
    name: 'Instant Payouts',
    description: 'Enable instant payout option for creators',
    type: 'boolean',
    defaultValue: false,
    category: 'payments',
  },

  // MCP flags
  {
    key: 'mcp.streaming_enabled',
    name: 'MCP Streaming',
    description: 'Enable MCP streaming transport (vs polling)',
    type: 'boolean',
    defaultValue: true,
    category: 'mcp',
  },
  {
    key: 'mcp.tools_v2',
    name: 'MCP Tools V2',
    description: 'New tool implementations with enhanced capabilities',
    type: 'percentage',
    defaultValue: false,
    category: 'mcp',
    targeting: {
      percentage: 0,
    },
  },

  // AI flags
  {
    key: 'ai.review_moderation',
    name: 'AI Review Moderation',
    description: 'Automatically moderate reviews using AI',
    type: 'boolean',
    defaultValue: false,
    category: 'ai',
  },
  {
    key: 'ai.product_descriptions',
    name: 'AI Product Descriptions',
    description: 'Generate product descriptions using AI',
    type: 'boolean',
    defaultValue: false,
    category: 'ai',
  },

  // Creator flags
  {
    key: 'creators.v2_portal',
    name: 'Creator Portal V2',
    description: 'Redesigned creator portal with new UX',
    type: 'tenant_list',
    defaultValue: false,
    category: 'creators',
    targeting: {
      enabledTenants: [],
    },
  },
  {
    key: 'creators.self_service_onboarding',
    name: 'Self-Service Onboarding',
    description: 'Allow creators to onboard without admin approval',
    type: 'boolean',
    defaultValue: false,
    category: 'creators',
  },

  // Admin flags
  {
    key: 'admin.realtime_dashboard',
    name: 'Realtime Dashboard',
    description: 'WebSocket-powered realtime dashboard updates',
    type: 'boolean',
    defaultValue: false,
    category: 'admin',
  },
  {
    key: 'admin.ai_insights',
    name: 'AI Business Insights',
    description: 'AI-powered business insights and recommendations',
    type: 'percentage',
    defaultValue: false,
    category: 'admin',
    targeting: {
      percentage: 0,
    },
  },
]

/**
 * Get a platform flag definition by key
 */
export function getPlatformFlagDefinition(key: string): PlatformFlagDefinition | undefined {
  return PLATFORM_FLAGS.find((f) => f.key === key)
}

/**
 * Get all platform flag keys
 */
export function getPlatformFlagKeys(): string[] {
  return PLATFORM_FLAGS.map((f) => f.key)
}

/**
 * Get platform flags by category
 */
export function getPlatformFlagsByCategory(
  category: PlatformFlagDefinition['category']
): PlatformFlagDefinition[] {
  return PLATFORM_FLAGS.filter((f) => f.category === category)
}

/**
 * Platform flag categories
 */
export const PLATFORM_FLAG_CATEGORIES = [
  { key: 'platform', name: 'Platform', description: 'Core platform settings' },
  { key: 'checkout', name: 'Checkout', description: 'Checkout experience' },
  { key: 'payments', name: 'Payments', description: 'Payment and payout features' },
  { key: 'mcp', name: 'MCP', description: 'Model Context Protocol features' },
  { key: 'ai', name: 'AI', description: 'AI-powered features' },
  { key: 'creators', name: 'Creators', description: 'Creator portal features' },
  { key: 'admin', name: 'Admin', description: 'Admin dashboard features' },
] as const
