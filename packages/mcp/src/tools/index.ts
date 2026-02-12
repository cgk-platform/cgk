/**
 * MCP Tools Index
 *
 * Exports all tool definitions organized by category.
 * Tools are registered with the MCP handler for AI-accessible operations.
 *
 * Categories:
 * - Analytics: Attribution, metrics, A/B testing, reports (16 tools)
 * - Commerce: Orders, customers, products, inventory (15 tools)
 * - Creators: Directory, projects, payouts, communications (18 tools)
 * - System: Health, config, notifications, users, audit, cache (20 tools)
 *
 * Total: ~69 tools
 *
 * @ai-pattern mcp-tools
 */

// =============================================================================
// Analytics Tools
// =============================================================================

export {
  // Tool definitions
  analyticsTools,
  // Individual tools for selective registration
  getAttributionSummaryTool,
  getTouchpointsTool,
  recalculateAttributionTool,
  exportAttributionDataTool,
  getRevenueMetricsTool,
  getConversionMetricsTool,
  getChannelPerformanceTool,
  getDailyMetricsTool,
  comparePeriodsTool,
  listABTestsTool,
  getABTestTool,
  getABTestStatsTool,
  createABTestTool,
  updateABTestStatusTool,
  generateReportTool,
  exportAnalyticsTool,
} from './analytics'

// =============================================================================
// Commerce Tools
// =============================================================================

export {
  // Tool definitions
  commerceTools,
  // Order tools
  listOrdersTool,
  getOrderTool,
  searchOrdersTool,
  updateOrderStatusTool,
  cancelOrderTool,
  // Customer tools
  listCustomersTool,
  getCustomerTool,
  searchCustomersTool,
  getCustomerOrdersTool,
  // Product tools
  listProductsTool,
  getProductTool,
  updateProductTool,
  syncProductTool,
  // Inventory tools
  getInventoryTool,
  updateInventoryTool,
} from './commerce'

// =============================================================================
// Creator Tools
// =============================================================================

export {
  // Tool definitions
  creatorTools,
  // Creator Management
  listCreatorsTool,
  getCreatorTool,
  searchCreatorsTool,
  updateCreatorTool,
  approveCreatorTool,
  rejectCreatorTool,
  // Projects
  listProjectsTool,
  getProjectTool,
  createProjectTool,
  updateProjectTool,
  updateProjectStatusTool,
  // Payouts
  listPayoutsTool,
  getPayoutTool,
  getCreatorBalanceTool,
  initiatePayoutTool,
  getPayoutHistoryTool,
  // Communications
  sendCreatorEmailTool,
  listCreatorCommunicationsTool,
  scheduleReminderTool,
} from './creators'

// =============================================================================
// System Tools
// =============================================================================

export {
  // Tool definitions
  systemTools,
  systemToolNames,
  // Health & Monitoring
  getSystemHealthTool,
  getServiceStatusTool,
  listRecentErrorsTool,
  getJobQueueStatusTool,
  // Configuration
  getTenantConfigTool,
  updateTenantConfigTool,
  getFeatureFlagsTool,
  toggleFeatureFlagTool,
  // Notifications
  sendNotificationTool,
  listNotificationsTool,
  getNotificationStatsTool,
  // User Management
  listUsersTool,
  getUserTool,
  updateUserRoleTool,
  inviteUserTool,
  // Audit & Logs
  getAuditLogTool,
  searchLogsTool,
  exportAuditLogTool,
  // Cache & Data
  clearCacheTool,
  getCacheStatsTool,
} from './system'

// =============================================================================
// Tool Categories (for registry)
// =============================================================================

import { analyticsTools } from './analytics'
import { commerceTools } from './commerce'
import { creatorTools } from './creators'
import { systemTools } from './system'
import type { ToolDefinition } from '../tools'

/**
 * All tools organized by category
 */
export const toolCategories = {
  analytics: analyticsTools,
  commerce: commerceTools,
  creators: creatorTools,
  system: systemTools,
  // content: [], // TODO: Future phase - Content tools
} as const

/**
 * Get all tools as a flat array
 */
export function getAllTools(): ToolDefinition[] {
  return Object.values(toolCategories).flat()
}

/**
 * Get tools by category
 */
export function getToolsByCategory(
  category: keyof typeof toolCategories
): ToolDefinition[] {
  return toolCategories[category] || []
}

/**
 * Get tool by name
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return getAllTools().find((tool) => tool.name === name)
}

// =============================================================================
// Tool Filtering Functions
// =============================================================================

/** Tenant configuration for tool filtering */
export interface TenantToolConfig {
  enabledCategories?: string[]
  disabledTools?: string[]
  shopifyEnabled?: boolean
  stripeEnabled?: boolean
  creatorsEnabled?: boolean
}

/**
 * Get tools available for a specific tenant
 *
 * Filters tools based on:
 * - Enabled categories
 * - Disabled tools
 * - Required integrations (Shopify, Stripe)
 * - Feature flags
 *
 * @param tenantConfig - Tenant configuration
 * @returns Array of available tools
 */
export function getToolsForTenant(tenantConfig: TenantToolConfig): ToolDefinition[] {
  const {
    enabledCategories = Object.keys(toolCategories),
    disabledTools = [],
    shopifyEnabled = true,
    stripeEnabled = true,
    creatorsEnabled = true,
  } = tenantConfig

  const availableTools: ToolDefinition[] = []
  const categories = toolCategories as Record<string, ToolDefinition[]>

  for (const categoryName of enabledCategories) {
    const categoryTools = categories[categoryName]
    if (!categoryTools) continue

    for (const tool of categoryTools) {
      // Skip disabled tools
      if (disabledTools.includes(tool.name)) continue

      // Check integration requirements based on tool name
      if (tool.name.includes('shopify') && !shopifyEnabled) continue
      if (tool.name.includes('stripe') && !stripeEnabled) continue
      if (tool.name.includes('payout') && !stripeEnabled) continue
      if (tool.name.includes('creator') && !creatorsEnabled) continue
      if (tool.name.includes('project') && !creatorsEnabled) continue

      availableTools.push(tool)
    }
  }

  return availableTools
}

/**
 * Check if a specific tool is enabled for a tenant
 *
 * @param toolName - Name of the tool
 * @param tenantConfig - Tenant configuration
 * @returns True if tool is enabled
 */
export function isToolEnabledForTenant(
  toolName: string,
  tenantConfig: TenantToolConfig
): boolean {
  const availableTools = getToolsForTenant(tenantConfig)
  return availableTools.some((t) => t.name === toolName)
}

// =============================================================================
// Tool Annotations
// =============================================================================

/** Tool annotation metadata */
export interface ToolAnnotations {
  readOnlyHint?: boolean
  destructiveHint?: boolean
  idempotentHint?: boolean
  requiresAuth?: boolean
  requiresAdmin?: boolean
  rateLimitTier?: 'low' | 'medium' | 'high'
}

/** Tool annotations by name */
export const toolAnnotations: Record<string, ToolAnnotations> = {
  // Commerce - Orders
  list_orders: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_order: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  search_orders: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  update_order_status: { destructiveHint: true, requiresAuth: true },
  cancel_order: { destructiveHint: true, requiresAuth: true },

  // Commerce - Customers
  list_customers: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_customer: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  search_customers: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_customer_orders: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },

  // Commerce - Products
  list_products: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_product: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  update_product: { destructiveHint: true, requiresAuth: true },
  sync_product: { destructiveHint: false, requiresAuth: true, rateLimitTier: 'high' },

  // Commerce - Inventory
  get_inventory: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  update_inventory: { destructiveHint: true, requiresAuth: true },

  // Analytics - Attribution
  get_attribution_summary: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_touchpoints: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  recalculate_attribution: { destructiveHint: false, requiresAuth: true, rateLimitTier: 'high' },
  export_attribution_data: { readOnlyHint: true, idempotentHint: true, requiresAuth: true, rateLimitTier: 'high' },

  // Analytics - Metrics
  get_revenue_metrics: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_conversion_metrics: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_channel_performance: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_daily_metrics: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  compare_periods: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },

  // Analytics - A/B Testing
  list_ab_tests: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_ab_test: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_ab_test_stats: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  create_ab_test: { destructiveHint: false, requiresAuth: true },
  update_ab_test_status: { destructiveHint: true, requiresAuth: true },

  // Analytics - Reports
  generate_report: { readOnlyHint: true, idempotentHint: true, requiresAuth: true, rateLimitTier: 'high' },
  export_analytics: { readOnlyHint: true, idempotentHint: true, requiresAuth: true, rateLimitTier: 'high' },

  // Creators - Management
  list_creators: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_creator: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  search_creators: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  update_creator: { destructiveHint: true, requiresAuth: true },
  approve_creator: { destructiveHint: true, requiresAuth: true, requiresAdmin: true },
  reject_creator: { destructiveHint: true, requiresAuth: true, requiresAdmin: true },

  // Creators - Projects
  list_projects: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_project: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  create_project: { destructiveHint: false, requiresAuth: true },
  update_project: { destructiveHint: true, requiresAuth: true },
  update_project_status: { destructiveHint: true, requiresAuth: true },

  // Creators - Payouts
  list_payouts: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_payout: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_creator_balance: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  initiate_payout: { destructiveHint: true, requiresAuth: true, requiresAdmin: true },
  get_payout_history: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },

  // Creators - Communications
  send_creator_email: { destructiveHint: false, requiresAuth: true, rateLimitTier: 'high' },
  list_creator_communications: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  schedule_reminder: { destructiveHint: false, requiresAuth: true },

  // System - Health & Monitoring
  get_system_health: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_service_status: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  list_recent_errors: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_job_queue_status: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },

  // System - Configuration
  get_tenant_config: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  update_tenant_config: { destructiveHint: true, requiresAuth: true, requiresAdmin: true },
  get_feature_flags: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  toggle_feature_flag: { destructiveHint: true, requiresAuth: true, requiresAdmin: true },

  // System - Notifications
  send_notification: { destructiveHint: false, requiresAuth: true, rateLimitTier: 'high' },
  list_notifications: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_notification_stats: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },

  // System - User Management
  list_users: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  get_user: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  update_user_role: { destructiveHint: true, requiresAuth: true, requiresAdmin: true },
  invite_user: { destructiveHint: false, requiresAuth: true, requiresAdmin: true, rateLimitTier: 'high' },

  // System - Audit & Logs
  get_audit_log: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  search_logs: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
  export_audit_log: { readOnlyHint: true, idempotentHint: true, requiresAuth: true, rateLimitTier: 'high' },

  // System - Cache & Data
  clear_cache: { destructiveHint: true, requiresAuth: true, requiresAdmin: true },
  get_cache_stats: { readOnlyHint: true, idempotentHint: true, requiresAuth: true },
}

/**
 * Get annotations for a tool
 *
 * @param toolName - Tool name
 * @returns Tool annotations
 */
export function getToolAnnotations(toolName: string): ToolAnnotations {
  return toolAnnotations[toolName] ?? {}
}
