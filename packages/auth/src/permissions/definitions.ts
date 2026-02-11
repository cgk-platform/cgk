/**
 * Permission definitions for RBAC
 * Organized by category with human-readable descriptions
 */

/**
 * Permission definition with metadata
 */
export interface PermissionDefinition {
  key: string
  category: string
  name: string
  description: string
}

/**
 * All permission categories and their permissions
 */
export const PERMISSION_CATEGORIES = {
  TENANT: {
    'tenant.settings.view': 'View tenant settings',
    'tenant.settings.edit': 'Edit tenant settings',
    'tenant.billing.view': 'View billing information',
    'tenant.billing.manage': 'Manage billing and subscriptions',
  },

  TEAM: {
    'team.view': 'View team members',
    'team.invite': 'Invite new team members',
    'team.manage': 'Edit and remove team members',
    'team.roles.manage': 'Create and edit custom roles',
  },

  CREATORS: {
    'creators.view': 'View creators list',
    'creators.manage': 'Approve, reject, edit creators',
    'creators.contracts.view': 'View contracts',
    'creators.contracts.sign': 'Sign contracts on behalf of brand',
    'creators.payments.view': 'View payment history',
    'creators.payments.approve': 'Approve payouts and withdrawals',
  },

  ORDERS: {
    'orders.view': 'View orders',
    'orders.manage': 'Edit orders, process refunds',
  },

  SUBSCRIPTIONS: {
    'subscriptions.view': 'View subscriptions',
    'subscriptions.manage': 'Cancel, pause, modify subscriptions',
  },

  REVIEWS: {
    'reviews.view': 'View product reviews',
    'reviews.manage': 'Approve, reject, respond to reviews',
  },

  PRODUCTS: {
    'products.view': 'View products',
    'products.sync': 'Trigger product sync from Shopify',
  },

  PAYOUTS: {
    'payouts.view': 'View payout history',
    'payouts.process': 'Process pending payouts',
  },

  TREASURY: {
    'treasury.view': 'View treasury dashboard',
    'treasury.approve': 'Approve treasury transactions',
  },

  EXPENSES: {
    'expenses.view': 'View operating expenses',
    'expenses.manage': 'Add, edit, categorize expenses',
  },

  CONTENT: {
    'content.view': 'View blog posts and landing pages',
    'content.edit': 'Create and edit content',
    'content.publish': 'Publish content to live site',
  },

  DAM: {
    'dam.view': 'View digital asset library',
    'dam.manage': 'Upload, organize, delete assets',
  },

  INTEGRATIONS: {
    'integrations.view': 'View connected integrations',
    'integrations.manage': 'Connect, disconnect integrations',
  },

  ANALYTICS: {
    'analytics.view': 'View analytics dashboards',
    'attribution.view': 'View marketing attribution',
    'reports.export': 'Export reports and data',
  },

  AI_AGENTS: {
    'ai.agents.view': 'View AI agents and their configuration',
    'ai.agents.manage': 'Create, edit, and configure AI agents',
    'ai.actions.view': 'View AI agent action logs',
    'ai.approvals.manage': 'Approve or reject AI agent actions',
  },
} as const

/**
 * Get all permissions as a flat array with metadata
 */
export function getAllPermissions(): PermissionDefinition[] {
  const permissions: PermissionDefinition[] = []

  for (const [category, perms] of Object.entries(PERMISSION_CATEGORIES)) {
    for (const [key, description] of Object.entries(perms)) {
      const [, action] = key.split('.')
      const name = formatPermissionName(action || key)
      permissions.push({
        key,
        category: category.toLowerCase(),
        name,
        description,
      })
    }
  }

  return permissions
}

/**
 * Get permissions grouped by category
 */
export function getPermissionsByCategory(): Record<string, PermissionDefinition[]> {
  const grouped: Record<string, PermissionDefinition[]> = {}

  for (const [category, perms] of Object.entries(PERMISSION_CATEGORIES)) {
    const categoryKey = category.toLowerCase()
    grouped[categoryKey] = []

    for (const [key, description] of Object.entries(perms)) {
      const parts = key.split('.')
      const action = parts[parts.length - 1] || key
      const name = formatPermissionName(action)
      grouped[categoryKey].push({
        key,
        category: categoryKey,
        name,
        description,
      })
    }
  }

  return grouped
}

/**
 * Get all category names
 */
export function getCategories(): string[] {
  return Object.keys(PERMISSION_CATEGORIES).map((c) => c.toLowerCase())
}

/**
 * Format a permission action into a readable name
 */
function formatPermissionName(action: string): string {
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Extract category from a permission key
 */
export function getCategoryFromPermission(permission: string): string {
  const [category] = permission.split('.')
  return category || ''
}

/**
 * Extract action from a permission key
 */
export function getActionFromPermission(permission: string): string {
  const parts = permission.split('.')
  return parts[parts.length - 1] || ''
}
