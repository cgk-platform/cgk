/**
 * MCP Manifest Endpoint
 *
 * Returns the MCP server manifest for Claude Connector discovery.
 * The manifest describes available tools, capabilities, and OAuth configuration.
 *
 * @route GET /api/mcp/manifest
 *
 * This manifest follows the MCP specification for server discovery:
 * https://modelcontextprotocol.io/docs/concepts/architecture
 */

import { NextResponse } from 'next/server'
import {
  CURRENT_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from '@cgk-platform/mcp'

// =============================================================================
// Edge Runtime Configuration
// =============================================================================

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// =============================================================================
// Types
// =============================================================================

interface MCPManifest {
  /** Manifest schema version */
  schema_version: string
  /** Server identification */
  server: {
    name: string
    version: string
    description: string
    vendor: string
    homepage?: string
    documentation?: string
  }
  /** MCP protocol information */
  protocol: {
    version: string
    supported_versions: string[]
    transport: string
    endpoint: string
  }
  /** OAuth configuration for authentication */
  oauth: {
    authorization_endpoint: string
    token_endpoint: string
    scopes: OAuthScope[]
    pkce_required: boolean
    code_challenge_methods: string[]
  }
  /** Available capabilities */
  capabilities: {
    tools: boolean
    resources: boolean
    prompts: boolean
    streaming: boolean
    logging: boolean
  }
  /** Tool categories and summaries */
  tools: {
    categories: ToolCategory[]
    total_count: number
  }
  /** Resource information */
  resources: {
    available: ResourceInfo[]
  }
  /** Prompt templates */
  prompts: {
    available: PromptInfo[]
  }
  /** Rate limiting information */
  rate_limits?: {
    requests_per_minute: number
    tokens_per_day?: number
  }
}

interface OAuthScope {
  name: string
  description: string
  default?: boolean
}

interface ToolCategory {
  name: string
  description: string
  tool_count: number
  tools: ToolSummary[]
}

interface ToolAnnotations {
  readOnlyHint?: boolean
  destructiveHint?: boolean
  idempotentHint?: boolean
  requiresAuth?: boolean
  requiresAdmin?: boolean
  rateLimitTier?: 'low' | 'medium' | 'high'
}

interface ToolSummary {
  name: string
  description: string
  streaming?: boolean
  annotations?: ToolAnnotations
}

interface ResourceInfo {
  uri_pattern: string
  name: string
  description: string
  mime_type?: string
}

interface PromptInfo {
  name: string
  description: string
  arguments?: {
    name: string
    description: string
    required: boolean
  }[]
}

// =============================================================================
// Constants
// =============================================================================

const SERVER_NAME = 'cgk-mcp-server'
const SERVER_VERSION = '0.1.0'
const MANIFEST_SCHEMA_VERSION = '1.0.0'

// =============================================================================
// Tool Definitions for Manifest
// =============================================================================

/**
 * Tool categories with their tools for the manifest
 * This is a static representation used for discovery
 */
const TOOL_CATEGORIES: ToolCategory[] = [
  {
    name: 'analytics',
    description: 'Analytics, attribution, metrics, A/B testing, and reporting tools for understanding business performance',
    tool_count: 16,
    tools: [
      { name: 'get_attribution_summary', description: 'Get attribution summary by channel for a date range', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_touchpoints', description: 'Get the touchpoint journey for a specific conversion/order', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'recalculate_attribution', description: 'Trigger recalculation of attribution for a date range', annotations: { rateLimitTier: 'high' } },
      { name: 'export_attribution_data', description: 'Export attribution data for a date range', streaming: true, annotations: { readOnlyHint: true, rateLimitTier: 'high' } },
      { name: 'get_revenue_metrics', description: 'Get revenue metrics including gross sales, discounts, refunds, and net revenue', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_conversion_metrics', description: 'Get conversion funnel metrics including sessions, cart adds, and conversion rates', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_channel_performance', description: 'Get performance metrics broken down by marketing channel', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_daily_metrics', description: 'Get daily aggregated metrics for a date range', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'compare_periods', description: 'Compare metrics between two date periods', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'list_ab_tests', description: 'List A/B tests with optional status filter', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_ab_test', description: 'Get detailed A/B test information', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_ab_test_stats', description: 'Get statistical analysis for an A/B test', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'create_ab_test', description: 'Create a new A/B test', annotations: { requiresAuth: true } },
      { name: 'update_ab_test_status', description: 'Start, pause, or complete an A/B test', annotations: { destructiveHint: true, requiresAuth: true } },
      { name: 'generate_report', description: 'Generate an analytics report', annotations: { readOnlyHint: true, rateLimitTier: 'high' } },
      { name: 'export_analytics', description: 'Export analytics data for a date range', streaming: true, annotations: { readOnlyHint: true, rateLimitTier: 'high' } },
    ],
  },
  {
    name: 'commerce',
    description: 'Order management, customer data, product catalog, and inventory tools for commerce operations',
    tool_count: 15,
    tools: [
      { name: 'list_orders', description: 'List recent orders with pagination', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_order', description: 'Get detailed order information', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'search_orders', description: 'Search orders with filters', streaming: true, annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'update_order_status', description: 'Update the status of an order', annotations: { destructiveHint: true, requiresAuth: true } },
      { name: 'cancel_order', description: 'Cancel an order', annotations: { destructiveHint: true, requiresAuth: true } },
      { name: 'list_customers', description: 'List customers with pagination', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_customer', description: 'Get detailed customer information', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'search_customers', description: 'Search customers by name, email, or other criteria', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_customer_orders', description: 'Get order history for a customer', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'list_products', description: 'List products from the catalog', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_product', description: 'Get detailed product information', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'update_product', description: 'Update product information', annotations: { destructiveHint: true, requiresAuth: true } },
      { name: 'sync_product', description: 'Sync product data from commerce provider', annotations: { rateLimitTier: 'high' } },
      { name: 'get_inventory', description: 'Get inventory levels for products', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'update_inventory', description: 'Update inventory levels', annotations: { destructiveHint: true, requiresAuth: true } },
    ],
  },
  {
    name: 'creators',
    description: 'Creator management, project tracking, payout processing, and communication tools',
    tool_count: 18,
    tools: [
      { name: 'list_creators', description: 'List creators with pagination', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_creator', description: 'Get detailed creator information', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'search_creators', description: 'Search creators by name, email, or skills', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'update_creator', description: 'Update creator profile', annotations: { destructiveHint: true, requiresAuth: true } },
      { name: 'approve_creator', description: 'Approve a creator application', annotations: { destructiveHint: true, requiresAdmin: true } },
      { name: 'reject_creator', description: 'Reject a creator application', annotations: { destructiveHint: true, requiresAdmin: true } },
      { name: 'list_projects', description: 'List projects with filters', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_project', description: 'Get detailed project information', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'create_project', description: 'Create a new project', annotations: { requiresAuth: true } },
      { name: 'update_project', description: 'Update project details', annotations: { destructiveHint: true, requiresAuth: true } },
      { name: 'update_project_status', description: 'Update project status', annotations: { destructiveHint: true, requiresAuth: true } },
      { name: 'list_payouts', description: 'List payout records', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_payout', description: 'Get detailed payout information', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_creator_balance', description: 'Get creator balance and pending payouts', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'initiate_payout', description: 'Initiate a payout to a creator', annotations: { destructiveHint: true, requiresAdmin: true } },
      { name: 'get_payout_history', description: 'Get payout history for a creator', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'send_creator_email', description: 'Send an email to a creator', annotations: { rateLimitTier: 'high' } },
      { name: 'list_creator_communications', description: 'List communication history with a creator', annotations: { readOnlyHint: true, idempotentHint: true } },
    ],
  },
  {
    name: 'system',
    description: 'System health monitoring, configuration management, notifications, and administrative tools',
    tool_count: 20,
    tools: [
      { name: 'get_system_health', description: 'Get overall system health status', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_service_status', description: 'Get status of individual services', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'list_recent_errors', description: 'List recent system errors', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_job_queue_status', description: 'Get background job queue status', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_tenant_config', description: 'Get tenant configuration', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'update_tenant_config', description: 'Update tenant configuration', annotations: { destructiveHint: true, requiresAdmin: true } },
      { name: 'get_feature_flags', description: 'Get feature flag status', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'toggle_feature_flag', description: 'Toggle a feature flag', annotations: { destructiveHint: true, requiresAdmin: true } },
      { name: 'send_notification', description: 'Send a notification', annotations: { rateLimitTier: 'high' } },
      { name: 'list_notifications', description: 'List notifications', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_notification_stats', description: 'Get notification statistics', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'list_users', description: 'List users in the tenant', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'get_user', description: 'Get user details', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'update_user_role', description: 'Update user role', annotations: { destructiveHint: true, requiresAdmin: true } },
      { name: 'invite_user', description: 'Invite a new user', annotations: { requiresAdmin: true, rateLimitTier: 'high' } },
      { name: 'get_audit_log', description: 'Get audit log entries', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'search_logs', description: 'Search system logs', annotations: { readOnlyHint: true, idempotentHint: true } },
      { name: 'export_audit_log', description: 'Export audit log', streaming: true, annotations: { readOnlyHint: true, rateLimitTier: 'high' } },
      { name: 'clear_cache', description: 'Clear application cache', annotations: { destructiveHint: true, requiresAdmin: true } },
      { name: 'get_cache_stats', description: 'Get cache statistics', annotations: { readOnlyHint: true, idempotentHint: true } },
    ],
  },
]

// =============================================================================
// Manifest Builder
// =============================================================================

/**
 * Build the MCP manifest with current server configuration
 */
function buildManifest(baseUrl: string): MCPManifest {
  // Use static tool categories
  const categories = TOOL_CATEGORIES

  // Calculate total tools
  const totalTools = categories.reduce((sum, cat) => sum + cat.tool_count, 0)

  return {
    schema_version: MANIFEST_SCHEMA_VERSION,

    server: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      description:
        'CGK Commerce Platform MCP Server - AI-powered commerce operations, analytics, and creator management',
      vendor: 'CGK Platform',
      homepage: 'https://cgk.commerce',
      documentation: 'https://docs.cgk.commerce/mcp',
    },

    protocol: {
      version: CURRENT_PROTOCOL_VERSION,
      supported_versions: [...SUPPORTED_PROTOCOL_VERSIONS],
      transport: 'streamable-http',
      endpoint: `${baseUrl}/api/mcp`,
    },

    oauth: {
      authorization_endpoint: `${baseUrl}/api/mcp/oauth/authorize`,
      token_endpoint: `${baseUrl}/api/mcp/oauth/token`,
      scopes: [
        {
          name: 'read',
          description: 'Read access to commerce data, analytics, and resources',
          default: true,
        },
        {
          name: 'write',
          description: 'Write access to update orders, products, and configurations',
          default: false,
        },
        {
          name: 'admin',
          description: 'Administrative access for tenant configuration and user management',
          default: false,
        },
        {
          name: 'analytics',
          description: 'Access to analytics, attribution, and reporting tools',
          default: true,
        },
        {
          name: 'creators',
          description: 'Access to creator management, projects, and payouts',
          default: false,
        },
        {
          name: 'system',
          description: 'Access to system health, monitoring, and cache tools',
          default: false,
        },
      ],
      pkce_required: true,
      code_challenge_methods: ['S256'],
    },

    capabilities: {
      tools: true,
      resources: true,
      prompts: true,
      streaming: true,
      logging: true,
    },

    tools: {
      categories,
      total_count: totalTools,
    },

    resources: {
      available: [
        {
          uri_pattern: 'cgk://tenant/config',
          name: 'Tenant Configuration',
          description: 'Current tenant settings and feature flags',
          mime_type: 'application/json',
        },
        {
          uri_pattern: 'cgk://orders/{order_id}',
          name: 'Order Details',
          description: 'Full order details including line items and fulfillment status',
          mime_type: 'application/json',
        },
        {
          uri_pattern: 'cgk://customers/{customer_id}',
          name: 'Customer Profile',
          description: 'Customer details, order history, and lifetime value',
          mime_type: 'application/json',
        },
        {
          uri_pattern: 'cgk://products/{product_id}',
          name: 'Product Details',
          description: 'Product information including variants and inventory',
          mime_type: 'application/json',
        },
        {
          uri_pattern: 'cgk://analytics/dashboard',
          name: 'Analytics Dashboard',
          description: 'Key metrics and KPIs for the current period',
          mime_type: 'application/json',
        },
        {
          uri_pattern: 'cgk://creators/{creator_id}',
          name: 'Creator Profile',
          description: 'Creator details, projects, and payout status',
          mime_type: 'application/json',
        },
      ],
    },

    prompts: {
      available: [
        {
          name: 'analyze_sales',
          description: 'Analyze sales data for a time period',
          arguments: [
            {
              name: 'period',
              description: 'Time period (e.g., 7d, 30d, 90d)',
              required: false,
            },
          ],
        },
        {
          name: 'investigate_order',
          description: 'Investigate a specific order issue',
          arguments: [
            {
              name: 'order_id',
              description: 'The order ID to investigate',
              required: true,
            },
            {
              name: 'issue_type',
              description: 'Type of issue (shipping, payment, refund)',
              required: false,
            },
          ],
        },
        {
          name: 'customer_insights',
          description: 'Generate insights about a customer',
          arguments: [
            {
              name: 'customer_id',
              description: 'The customer ID to analyze',
              required: true,
            },
          ],
        },
        {
          name: 'inventory_report',
          description: 'Generate an inventory status report',
          arguments: [
            {
              name: 'low_stock_threshold',
              description: 'Threshold for low stock warning',
              required: false,
            },
          ],
        },
        {
          name: 'attribution_analysis',
          description: 'Analyze marketing attribution and channel performance',
          arguments: [
            {
              name: 'model',
              description: 'Attribution model (first_touch, last_touch, linear, time_decay)',
              required: false,
            },
            {
              name: 'period',
              description: 'Time period to analyze',
              required: false,
            },
          ],
        },
      ],
    },

    rate_limits: {
      requests_per_minute: 60,
      tokens_per_day: 100000,
    },
  }
}


// =============================================================================
// GET Handler - Return Manifest
// =============================================================================

/**
 * Return the MCP server manifest
 *
 * The manifest provides Claude Connector with:
 * - Server identification and version
 * - OAuth endpoints for authentication
 * - Available scopes and permissions
 * - Tool categories and capabilities
 * - Resource patterns
 * - Prompt templates
 */
export async function GET(request: Request): Promise<Response> {
  // Determine base URL from request
  const url = new URL(request.url)
  const baseUrl = `${url.protocol}//${url.host}`

  // Build manifest
  const manifest = buildManifest(baseUrl)

  // Return with appropriate caching headers
  return NextResponse.json(manifest, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// =============================================================================
// OPTIONS Handler - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}

// =============================================================================
// HEAD Handler - Check Availability
// =============================================================================

export async function HEAD(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
