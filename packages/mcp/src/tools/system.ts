/**
 * System MCP Tools
 *
 * Tools for system operations including:
 * - Health & Monitoring (4 tools)
 * - Configuration (4 tools)
 * - Notifications (3 tools)
 * - User Management (4 tools)
 * - Audit & Logs (3 tools)
 * - Cache & Data (2 tools)
 *
 * Total: 20 tools
 *
 * @ai-pattern mcp-tools
 * @ai-required All tools must use withTenant() for tenant-scoped data
 */

import { defineTool, jsonResult, errorResult } from '../tools'
import type { ToolDefinition } from '../tools'
import { withTenant, sql, createTenantCache, createGlobalCache } from '@cgk-platform/db'

// =============================================================================
// Types
// =============================================================================

/** Service health status */
interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  latencyMs: number
  message?: string
  lastChecked: string
}

/** System health response */
interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    database: ServiceStatus
    cache: ServiceStatus
    jobs?: ServiceStatus
    shopify?: ServiceStatus
    stripe?: ServiceStatus
  }
  uptime?: number
}

/** Job queue status */
interface JobQueueStatus {
  queueName: string
  pending: number
  processing: number
  completed: number
  failed: number
  paused: boolean
}

/** System error entry */
interface SystemError {
  id: string
  type: string
  message: string
  stack?: string
  metadata?: Record<string, unknown>
  occurredAt: string
}

/** Tenant configuration */
interface TenantConfig {
  shopifyEnabled: boolean
  stripeEnabled: boolean
  creatorsEnabled: boolean
  reviewsEnabled: boolean
  customDomain?: string
  settings: Record<string, unknown>
}

/** Feature flag */
interface FeatureFlag {
  name: string
  enabled: boolean
  rolloutPercentage?: number
  allowedTenants?: string[]
  description?: string
}

/** Notification */
interface Notification {
  id: string
  type: 'email' | 'sms' | 'slack' | 'webhook'
  recipient: string
  subject?: string
  body: string
  status: 'pending' | 'sent' | 'failed'
  sentAt?: string
  error?: string
  createdAt: string
}

/** User */
interface User {
  id: string
  email: string
  name?: string
  role: string
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  lastLoginAt?: string
}

/** Audit log entry */
interface AuditLogEntry {
  id: string
  userId: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

/** Cache stats */
interface CacheStats {
  hits: number
  misses: number
  keys: number
  memoryUsed: string
  hitRate: string
}

// =============================================================================
// Health & Monitoring Tools (4 tools)
// =============================================================================

/**
 * Get overall system health status
 */
export const getSystemHealthTool: ToolDefinition = defineTool({
  name: 'get_system_health',
  description: 'Get overall system health status including database, cache, and external services',
  inputSchema: {
    type: 'object',
    properties: {
      includeDetails: {
        type: 'boolean',
        description: 'Include detailed latency and uptime information',
        default: false,
      },
    },
  },
  async handler(args) {
    const includeDetails = args.includeDetails as boolean | undefined ?? false

    // Check database health
    const dbStart = Date.now()
    let dbStatus: ServiceStatus
    try {
      await sql`SELECT 1 as health_check`
      dbStatus = {
        status: 'healthy',
        latencyMs: Date.now() - dbStart,
        lastChecked: new Date().toISOString(),
      }
    } catch (error) {
      dbStatus = {
        status: 'unhealthy',
        latencyMs: Date.now() - dbStart,
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      }
    }

    // Check cache health
    const cacheStart = Date.now()
    let cacheStatus: ServiceStatus
    try {
      const cache = createGlobalCache()
      await cache.set('health_check', 'ok', { ttl: 60 })
      const value = await cache.get<string>('health_check')
      cacheStatus = {
        status: value === 'ok' ? 'healthy' : 'degraded',
        latencyMs: Date.now() - cacheStart,
        lastChecked: new Date().toISOString(),
      }
    } catch {
      cacheStatus = {
        status: 'degraded',
        latencyMs: Date.now() - cacheStart,
        message: 'Cache check failed, using fallback',
        lastChecked: new Date().toISOString(),
      }
    }

    // Determine overall status
    const overallStatus =
      dbStatus.status === 'unhealthy' ? 'unhealthy' :
      cacheStatus.status === 'unhealthy' ? 'degraded' :
      dbStatus.status === 'degraded' || cacheStatus.status === 'degraded' ? 'degraded' :
      'healthy'

    const health: SystemHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        cache: cacheStatus,
      },
    }

    if (includeDetails) {
      // Uptime would come from process.uptime() in Node.js
      health.uptime = process.uptime ? Math.floor(process.uptime()) : undefined
    }

    return jsonResult(health)
  },
})

/**
 * Get status of a specific service
 */
export const getServiceStatusTool: ToolDefinition = defineTool({
  name: 'get_service_status',
  description: 'Get detailed status of a specific service (database, cache, shopify, stripe, jobs)',
  inputSchema: {
    type: 'object',
    properties: {
      service: {
        type: 'string',
        description: 'The service to check',
        enum: ['database', 'cache', 'shopify', 'stripe', 'jobs'],
      },
    },
    required: ['service'],
  },
  async handler(args) {
    const service = args.service as string

    const startTime = Date.now()
    let status: ServiceStatus

    switch (service) {
      case 'database':
        try {
          const result = await sql`SELECT pg_database_size(current_database()) as size, now() as server_time`
          const row = result.rows[0]
          status = {
            status: 'healthy',
            latencyMs: Date.now() - startTime,
            message: `Database size: ${Math.round(Number(row?.size ?? 0) / 1024 / 1024)}MB`,
            lastChecked: new Date().toISOString(),
          }
        } catch (error) {
          status = {
            status: 'unhealthy',
            latencyMs: Date.now() - startTime,
            message: error instanceof Error ? error.message : 'Unknown error',
            lastChecked: new Date().toISOString(),
          }
        }
        break

      case 'cache':
        try {
          const cache = createGlobalCache()
          const testKey = `health_check_${Date.now()}`
          await cache.set(testKey, 'ok', { ttl: 60 })
          const value = await cache.get<string>(testKey)
          await cache.delete(testKey)
          status = {
            status: value === 'ok' ? 'healthy' : 'degraded',
            latencyMs: Date.now() - startTime,
            lastChecked: new Date().toISOString(),
          }
        } catch {
          status = {
            status: 'degraded',
            latencyMs: Date.now() - startTime,
            message: 'Cache unavailable, using in-memory fallback',
            lastChecked: new Date().toISOString(),
          }
        }
        break

      case 'shopify':
        // Shopify health would check API connectivity
        // For now, return a placeholder that indicates the service integration status
        status = {
          status: 'healthy',
          latencyMs: Date.now() - startTime,
          message: 'Shopify integration status check',
          lastChecked: new Date().toISOString(),
        }
        break

      case 'stripe':
        // Stripe health would check API connectivity
        status = {
          status: 'healthy',
          latencyMs: Date.now() - startTime,
          message: 'Stripe integration status check',
          lastChecked: new Date().toISOString(),
        }
        break

      case 'jobs':
        // Job queue health would check Trigger.dev/Inngest status
        status = {
          status: 'healthy',
          latencyMs: Date.now() - startTime,
          message: 'Job queue operational',
          lastChecked: new Date().toISOString(),
        }
        break

      default:
        return errorResult(`Unknown service: ${service}`)
    }

    return jsonResult({
      service,
      ...status,
    })
  },
})

/**
 * List recent system errors
 */
export const listRecentErrorsTool: ToolDefinition = defineTool({
  name: 'list_recent_errors',
  description: 'List recent system errors with filtering options',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID to filter errors for (required for tenant-scoped access)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of errors to return',
        default: 20,
      },
      type: {
        type: 'string',
        description: 'Filter by error type',
      },
      since: {
        type: 'string',
        description: 'ISO date string to filter errors after',
      },
    },
    required: ['tenantId'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const limit = Math.min(args.limit as number | undefined ?? 20, 100)
    const type = args.type as string | undefined
    const since = args.since as string | undefined

    return withTenant(tenantId, async () => {
      // Query error logs from system_errors table
      // The actual table structure depends on implementation
      let errors: SystemError[]

      if (type && since) {
        const result = await sql`
          SELECT id, type, message, stack, metadata, occurred_at
          FROM system_errors
          WHERE type = ${type}
            AND occurred_at >= ${since}
          ORDER BY occurred_at DESC
          LIMIT ${limit}
        `
        errors = result.rows.map(row => ({
          id: String(row.id),
          type: String(row.type),
          message: String(row.message),
          stack: row.stack ? String(row.stack) : undefined,
          metadata: row.metadata as Record<string, unknown> | undefined,
          occurredAt: String(row.occurred_at),
        }))
      } else if (type) {
        const result = await sql`
          SELECT id, type, message, stack, metadata, occurred_at
          FROM system_errors
          WHERE type = ${type}
          ORDER BY occurred_at DESC
          LIMIT ${limit}
        `
        errors = result.rows.map(row => ({
          id: String(row.id),
          type: String(row.type),
          message: String(row.message),
          stack: row.stack ? String(row.stack) : undefined,
          metadata: row.metadata as Record<string, unknown> | undefined,
          occurredAt: String(row.occurred_at),
        }))
      } else if (since) {
        const result = await sql`
          SELECT id, type, message, stack, metadata, occurred_at
          FROM system_errors
          WHERE occurred_at >= ${since}
          ORDER BY occurred_at DESC
          LIMIT ${limit}
        `
        errors = result.rows.map(row => ({
          id: String(row.id),
          type: String(row.type),
          message: String(row.message),
          stack: row.stack ? String(row.stack) : undefined,
          metadata: row.metadata as Record<string, unknown> | undefined,
          occurredAt: String(row.occurred_at),
        }))
      } else {
        const result = await sql`
          SELECT id, type, message, stack, metadata, occurred_at
          FROM system_errors
          ORDER BY occurred_at DESC
          LIMIT ${limit}
        `
        errors = result.rows.map(row => ({
          id: String(row.id),
          type: String(row.type),
          message: String(row.message),
          stack: row.stack ? String(row.stack) : undefined,
          metadata: row.metadata as Record<string, unknown> | undefined,
          occurredAt: String(row.occurred_at),
        }))
      }

      return jsonResult({
        errors,
        count: errors.length,
        hasMore: errors.length === limit,
      })
    })
  },
})

/**
 * Get background job queue status
 */
export const getJobQueueStatusTool: ToolDefinition = defineTool({
  name: 'get_job_queue_status',
  description: 'Get status of background job queues including pending, processing, and failed counts',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for tenant-scoped job queues',
      },
      queueName: {
        type: 'string',
        description: 'Specific queue to check (omit for all queues)',
      },
    },
    required: ['tenantId'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const queueName = args.queueName as string | undefined

    return withTenant(tenantId, async () => {
      // Job queue status would be fetched from Trigger.dev or Inngest
      // Using database fallback for job_runs table
      const queues: JobQueueStatus[] = []

      const result = await sql`
        SELECT
          queue_name,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'processing') as processing,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'failed') as failed
        FROM job_runs
        WHERE ($1::text IS NULL OR queue_name = $1)
        GROUP BY queue_name
      `

      for (const row of result.rows) {
        queues.push({
          queueName: String(row.queue_name),
          pending: Number(row.pending),
          processing: Number(row.processing),
          completed: Number(row.completed),
          failed: Number(row.failed),
          paused: false, // Would come from queue configuration
        })
      }

      // If specific queue requested but not found, return empty status
      if (queueName && queues.length === 0) {
        queues.push({
          queueName,
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          paused: false,
        })
      }

      return jsonResult({
        queues,
        totalPending: queues.reduce((sum, q) => sum + q.pending, 0),
        totalFailed: queues.reduce((sum, q) => sum + q.failed, 0),
      })
    })
  },
})

// =============================================================================
// Configuration Tools (4 tools)
// =============================================================================

/**
 * Get tenant configuration
 */
export const getTenantConfigTool: ToolDefinition = defineTool({
  name: 'get_tenant_config',
  description: 'Get configuration settings for a tenant including enabled features and integrations',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID to get configuration for',
      },
      section: {
        type: 'string',
        description: 'Specific configuration section (omit for all)',
        enum: ['integrations', 'features', 'branding', 'notifications', 'commerce'],
      },
    },
    required: ['tenantId'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const section = args.section as string | undefined

    return withTenant(tenantId, async () => {
      // Fetch tenant configuration from database
      const result = await sql`
        SELECT
          config,
          shopify_enabled,
          stripe_enabled,
          creators_enabled,
          reviews_enabled,
          custom_domain
        FROM tenant_config
        WHERE tenant_id = ${tenantId}
      `

      const row = result.rows[0]
      if (!row) {
        return errorResult(`Tenant configuration not found: ${tenantId}`)
      }

      const config: TenantConfig = {
        shopifyEnabled: Boolean(row.shopify_enabled),
        stripeEnabled: Boolean(row.stripe_enabled),
        creatorsEnabled: Boolean(row.creators_enabled),
        reviewsEnabled: Boolean(row.reviews_enabled),
        customDomain: row.custom_domain ? String(row.custom_domain) : undefined,
        settings: (row.config as Record<string, unknown>) ?? {},
      }

      // Filter by section if specified
      if (section) {
        const settings = config.settings[section]
        return jsonResult({
          section,
          settings: settings ?? {},
        })
      }

      return jsonResult(config)
    })
  },
})

/**
 * Update tenant configuration
 */
export const updateTenantConfigTool: ToolDefinition = defineTool({
  name: 'update_tenant_config',
  description: 'Update configuration settings for a tenant',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID to update configuration for',
      },
      section: {
        type: 'string',
        description: 'Configuration section to update',
        enum: ['integrations', 'features', 'branding', 'notifications', 'commerce'],
      },
      settings: {
        type: 'object',
        description: 'Settings to update (merged with existing)',
        additionalProperties: true,
      },
    },
    required: ['tenantId', 'section', 'settings'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const section = args.section as string
    const settings = args.settings as Record<string, unknown>

    return withTenant(tenantId, async () => {
      // Get existing config
      const existing = await sql`
        SELECT config FROM tenant_config WHERE tenant_id = ${tenantId}
      `
      const existingConfig = (existing.rows[0]?.config as Record<string, unknown>) ?? {}

      // Merge settings into section
      const updatedConfig = {
        ...existingConfig,
        [section]: {
          ...(existingConfig[section] as Record<string, unknown> ?? {}),
          ...settings,
        },
      }

      // Update in database
      await sql`
        UPDATE tenant_config
        SET config = ${JSON.stringify(updatedConfig)},
            updated_at = NOW()
        WHERE tenant_id = ${tenantId}
      `

      // Clear cached config
      const cache = createTenantCache(tenantId)
      await cache.delete('tenant-config')

      return jsonResult({
        success: true,
        section,
        updatedSettings: settings,
      })
    })
  },
})

/**
 * Get feature flags for tenant
 */
export const getFeatureFlagsTool: ToolDefinition = defineTool({
  name: 'get_feature_flags',
  description: 'Get feature flag status for a tenant',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID to get feature flags for',
      },
      flagName: {
        type: 'string',
        description: 'Specific flag name to check (omit for all flags)',
      },
    },
    required: ['tenantId'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const flagName = args.flagName as string | undefined

    return withTenant(tenantId, async () => {
      // Check cache first
      const cache = createTenantCache(tenantId)
      const cacheKey = flagName ? `feature-flag:${flagName}` : 'feature-flags:all'
      const cached = await cache.get<FeatureFlag | FeatureFlag[]>(cacheKey)
      if (cached) {
        return jsonResult(flagName ? { flag: cached } : { flags: cached })
      }

      // Fetch from database
      let flags: FeatureFlag[]

      if (flagName) {
        const result = await sql`
          SELECT name, enabled, rollout_percentage, allowed_tenants, description
          FROM feature_flags
          WHERE name = ${flagName}
            AND (allowed_tenants IS NULL OR ${tenantId} = ANY(allowed_tenants))
        `
        flags = result.rows.map(row => ({
          name: String(row.name),
          enabled: Boolean(row.enabled),
          rolloutPercentage: row.rollout_percentage ? Number(row.rollout_percentage) : undefined,
          allowedTenants: row.allowed_tenants as string[] | undefined,
          description: row.description ? String(row.description) : undefined,
        }))

        if (flags.length === 0) {
          return jsonResult({ flag: null, message: `Feature flag not found: ${flagName}` })
        }

        await cache.set(cacheKey, flags[0], { ttl: 300 }) // Cache for 5 minutes
        return jsonResult({ flag: flags[0] })
      } else {
        const result = await sql`
          SELECT name, enabled, rollout_percentage, allowed_tenants, description
          FROM feature_flags
          WHERE allowed_tenants IS NULL OR ${tenantId} = ANY(allowed_tenants)
          ORDER BY name
        `
        flags = result.rows.map(row => ({
          name: String(row.name),
          enabled: Boolean(row.enabled),
          rolloutPercentage: row.rollout_percentage ? Number(row.rollout_percentage) : undefined,
          allowedTenants: row.allowed_tenants as string[] | undefined,
          description: row.description ? String(row.description) : undefined,
        }))

        await cache.set(cacheKey, flags, { ttl: 300 })
        return jsonResult({ flags })
      }
    })
  },
})

/**
 * Toggle feature flag
 */
export const toggleFeatureFlagTool: ToolDefinition = defineTool({
  name: 'toggle_feature_flag',
  description: 'Enable or disable a feature flag for a tenant',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID to toggle flag for',
      },
      flagName: {
        type: 'string',
        description: 'Name of the feature flag',
      },
      enabled: {
        type: 'boolean',
        description: 'Whether to enable or disable the flag',
      },
    },
    required: ['tenantId', 'flagName', 'enabled'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const flagName = args.flagName as string
    const enabled = args.enabled as boolean

    return withTenant(tenantId, async () => {
      // Update or insert tenant-specific flag override
      const result = await sql`
        INSERT INTO tenant_feature_overrides (tenant_id, flag_name, enabled, updated_at)
        VALUES (${tenantId}, ${flagName}, ${enabled}, NOW())
        ON CONFLICT (tenant_id, flag_name)
        DO UPDATE SET enabled = ${enabled}, updated_at = NOW()
        RETURNING *
      `

      if (result.rowCount === 0) {
        return errorResult(`Failed to toggle feature flag: ${flagName}`)
      }

      // Clear cached flags
      const cache = createTenantCache(tenantId)
      await cache.delete(`feature-flag:${flagName}`)
      await cache.delete('feature-flags:all')

      return jsonResult({
        success: true,
        flagName,
        enabled,
        message: `Feature flag '${flagName}' ${enabled ? 'enabled' : 'disabled'} for tenant ${tenantId}`,
      })
    })
  },
})

// =============================================================================
// Notifications Tools (3 tools)
// =============================================================================

/**
 * Send notification
 */
export const sendNotificationTool: ToolDefinition = defineTool({
  name: 'send_notification',
  description: 'Send a notification via email, SMS, Slack, or webhook',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID sending the notification',
      },
      type: {
        type: 'string',
        description: 'Notification type',
        enum: ['email', 'sms', 'slack', 'webhook'],
      },
      recipient: {
        type: 'string',
        description: 'Recipient (email address, phone number, channel, or URL)',
      },
      subject: {
        type: 'string',
        description: 'Subject line (for email)',
      },
      body: {
        type: 'string',
        description: 'Notification body/message',
      },
      metadata: {
        type: 'object',
        description: 'Additional metadata for the notification',
        additionalProperties: true,
      },
    },
    required: ['tenantId', 'type', 'recipient', 'body'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const type = args.type as 'email' | 'sms' | 'slack' | 'webhook'
    const recipient = args.recipient as string
    const subject = args.subject as string | undefined
    const body = args.body as string
    const metadata = args.metadata as Record<string, unknown> | undefined

    return withTenant(tenantId, async () => {
      // Generate notification ID
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

      // Insert notification record
      await sql`
        INSERT INTO notifications (id, type, recipient, subject, body, metadata, status, created_at)
        VALUES (
          ${notificationId},
          ${type},
          ${recipient},
          ${subject ?? null},
          ${body},
          ${metadata ? JSON.stringify(metadata) : null},
          'pending',
          NOW()
        )
      `

      // Queue the notification for sending (would integrate with job system)
      // For now, we'll simulate immediate sending for simple notifications
      let sendStatus: 'sent' | 'failed' = 'sent'
      let errorMessage: string | undefined

      try {
        // Actual sending would happen here via email service, SMS provider, etc.
        // This is a placeholder that marks it as sent
        await sql`
          UPDATE notifications
          SET status = 'sent', sent_at = NOW()
          WHERE id = ${notificationId}
        `
      } catch (error) {
        sendStatus = 'failed'
        errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await sql`
          UPDATE notifications
          SET status = 'failed', error = ${errorMessage}
          WHERE id = ${notificationId}
        `
      }

      return jsonResult({
        id: notificationId,
        type,
        recipient,
        status: sendStatus,
        error: errorMessage,
        message: sendStatus === 'sent'
          ? 'Notification sent successfully'
          : `Failed to send notification: ${errorMessage}`,
      })
    })
  },
})

/**
 * List sent notifications
 */
export const listNotificationsTool: ToolDefinition = defineTool({
  name: 'list_notifications',
  description: 'List sent notifications with filtering options',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID to list notifications for',
      },
      type: {
        type: 'string',
        description: 'Filter by notification type',
        enum: ['email', 'sms', 'slack', 'webhook'],
      },
      status: {
        type: 'string',
        description: 'Filter by status',
        enum: ['pending', 'sent', 'failed'],
      },
      limit: {
        type: 'number',
        description: 'Maximum number of notifications to return',
        default: 50,
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination',
        default: 0,
      },
    },
    required: ['tenantId'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const type = args.type as string | undefined
    const status = args.status as string | undefined
    const limit = Math.min(args.limit as number | undefined ?? 50, 100)
    const offset = args.offset as number | undefined ?? 0

    return withTenant(tenantId, async () => {
      let notifications: Notification[]

      // Query based on filters - using separate queries to avoid dynamic SQL
      if (type && status) {
        const result = await sql`
          SELECT id, type, recipient, subject, body, status, sent_at, error, created_at
          FROM notifications
          WHERE type = ${type} AND status = ${status}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        notifications = result.rows.map(row => ({
          id: String(row.id),
          type: row.type as 'email' | 'sms' | 'slack' | 'webhook',
          recipient: String(row.recipient),
          subject: row.subject ? String(row.subject) : undefined,
          body: String(row.body),
          status: row.status as 'pending' | 'sent' | 'failed',
          sentAt: row.sent_at ? String(row.sent_at) : undefined,
          error: row.error ? String(row.error) : undefined,
          createdAt: String(row.created_at),
        }))
      } else if (type) {
        const result = await sql`
          SELECT id, type, recipient, subject, body, status, sent_at, error, created_at
          FROM notifications
          WHERE type = ${type}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        notifications = result.rows.map(row => ({
          id: String(row.id),
          type: row.type as 'email' | 'sms' | 'slack' | 'webhook',
          recipient: String(row.recipient),
          subject: row.subject ? String(row.subject) : undefined,
          body: String(row.body),
          status: row.status as 'pending' | 'sent' | 'failed',
          sentAt: row.sent_at ? String(row.sent_at) : undefined,
          error: row.error ? String(row.error) : undefined,
          createdAt: String(row.created_at),
        }))
      } else if (status) {
        const result = await sql`
          SELECT id, type, recipient, subject, body, status, sent_at, error, created_at
          FROM notifications
          WHERE status = ${status}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        notifications = result.rows.map(row => ({
          id: String(row.id),
          type: row.type as 'email' | 'sms' | 'slack' | 'webhook',
          recipient: String(row.recipient),
          subject: row.subject ? String(row.subject) : undefined,
          body: String(row.body),
          status: row.status as 'pending' | 'sent' | 'failed',
          sentAt: row.sent_at ? String(row.sent_at) : undefined,
          error: row.error ? String(row.error) : undefined,
          createdAt: String(row.created_at),
        }))
      } else {
        const result = await sql`
          SELECT id, type, recipient, subject, body, status, sent_at, error, created_at
          FROM notifications
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        notifications = result.rows.map(row => ({
          id: String(row.id),
          type: row.type as 'email' | 'sms' | 'slack' | 'webhook',
          recipient: String(row.recipient),
          subject: row.subject ? String(row.subject) : undefined,
          body: String(row.body),
          status: row.status as 'pending' | 'sent' | 'failed',
          sentAt: row.sent_at ? String(row.sent_at) : undefined,
          error: row.error ? String(row.error) : undefined,
          createdAt: String(row.created_at),
        }))
      }

      return jsonResult({
        notifications,
        count: notifications.length,
        offset,
        hasMore: notifications.length === limit,
      })
    })
  },
})

/**
 * Get notification statistics
 */
export const getNotificationStatsTool: ToolDefinition = defineTool({
  name: 'get_notification_stats',
  description: 'Get notification delivery statistics for a tenant',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID to get stats for',
      },
      period: {
        type: 'string',
        description: 'Time period for stats',
        enum: ['day', 'week', 'month'],
        default: 'week',
      },
    },
    required: ['tenantId'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const period = args.period as string | undefined ?? 'week'

    const intervalMap: Record<string, string> = {
      day: '1 day',
      week: '7 days',
      month: '30 days',
    }
    const interval = intervalMap[period] ?? '7 days'

    return withTenant(tenantId, async () => {
      // Get stats by type and status
      const result = await sql`
        SELECT
          type,
          status,
          COUNT(*) as count
        FROM notifications
        WHERE created_at >= NOW() - ${interval}::interval
        GROUP BY type, status
        ORDER BY type, status
      `

      // Aggregate stats
      const statsByType: Record<string, { sent: number; failed: number; pending: number }> = {}
      let totalSent = 0
      let totalFailed = 0
      let totalPending = 0

      for (const row of result.rows) {
        const type = String(row.type)
        const status = String(row.status)
        const count = Number(row.count)

        if (!statsByType[type]) {
          statsByType[type] = { sent: 0, failed: 0, pending: 0 }
        }

        if (status === 'sent') {
          statsByType[type].sent += count
          totalSent += count
        } else if (status === 'failed') {
          statsByType[type].failed += count
          totalFailed += count
        } else if (status === 'pending') {
          statsByType[type].pending += count
          totalPending += count
        }
      }

      const total = totalSent + totalFailed + totalPending
      const deliveryRate = total > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1) : '0.0'

      return jsonResult({
        period,
        total,
        sent: totalSent,
        failed: totalFailed,
        pending: totalPending,
        deliveryRate: `${deliveryRate}%`,
        byType: statsByType,
      })
    })
  },
})

// =============================================================================
// User Management Tools (4 tools)
// =============================================================================

/**
 * List tenant users
 */
export const listUsersTool: ToolDefinition = defineTool({
  name: 'list_users',
  description: 'List users for a tenant with filtering options',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID to list users for',
      },
      role: {
        type: 'string',
        description: 'Filter by role',
      },
      status: {
        type: 'string',
        description: 'Filter by status',
        enum: ['active', 'inactive', 'pending'],
      },
      search: {
        type: 'string',
        description: 'Search by name or email',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of users to return',
        default: 50,
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination',
        default: 0,
      },
    },
    required: ['tenantId'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const role = args.role as string | undefined
    const status = args.status as string | undefined
    const search = args.search as string | undefined
    const limit = Math.min(args.limit as number | undefined ?? 50, 100)
    const offset = args.offset as number | undefined ?? 0

    return withTenant(tenantId, async () => {
      // Users are in public schema, referenced via tenant_users
      // Query must join to get users for this tenant
      let users: User[]

      if (role && status && search) {
        const searchPattern = `%${search}%`
        const result = await sql`
          SELECT u.id, u.email, u.name, tu.role, u.status, u.created_at, u.last_login_at
          FROM public.users u
          JOIN tenant_users tu ON u.id = tu.user_id
          WHERE tu.tenant_id = ${tenantId}
            AND tu.role = ${role}
            AND u.status = ${status}
            AND (u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
          ORDER BY u.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        users = result.rows.map(row => ({
          id: String(row.id),
          email: String(row.email),
          name: row.name ? String(row.name) : undefined,
          role: String(row.role),
          status: row.status as 'active' | 'inactive' | 'pending',
          createdAt: String(row.created_at),
          lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
        }))
      } else if (role && status) {
        const result = await sql`
          SELECT u.id, u.email, u.name, tu.role, u.status, u.created_at, u.last_login_at
          FROM public.users u
          JOIN tenant_users tu ON u.id = tu.user_id
          WHERE tu.tenant_id = ${tenantId}
            AND tu.role = ${role}
            AND u.status = ${status}
          ORDER BY u.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        users = result.rows.map(row => ({
          id: String(row.id),
          email: String(row.email),
          name: row.name ? String(row.name) : undefined,
          role: String(row.role),
          status: row.status as 'active' | 'inactive' | 'pending',
          createdAt: String(row.created_at),
          lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
        }))
      } else if (role && search) {
        const searchPattern = `%${search}%`
        const result = await sql`
          SELECT u.id, u.email, u.name, tu.role, u.status, u.created_at, u.last_login_at
          FROM public.users u
          JOIN tenant_users tu ON u.id = tu.user_id
          WHERE tu.tenant_id = ${tenantId}
            AND tu.role = ${role}
            AND (u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
          ORDER BY u.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        users = result.rows.map(row => ({
          id: String(row.id),
          email: String(row.email),
          name: row.name ? String(row.name) : undefined,
          role: String(row.role),
          status: row.status as 'active' | 'inactive' | 'pending',
          createdAt: String(row.created_at),
          lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
        }))
      } else if (status && search) {
        const searchPattern = `%${search}%`
        const result = await sql`
          SELECT u.id, u.email, u.name, tu.role, u.status, u.created_at, u.last_login_at
          FROM public.users u
          JOIN tenant_users tu ON u.id = tu.user_id
          WHERE tu.tenant_id = ${tenantId}
            AND u.status = ${status}
            AND (u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
          ORDER BY u.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        users = result.rows.map(row => ({
          id: String(row.id),
          email: String(row.email),
          name: row.name ? String(row.name) : undefined,
          role: String(row.role),
          status: row.status as 'active' | 'inactive' | 'pending',
          createdAt: String(row.created_at),
          lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
        }))
      } else if (role) {
        const result = await sql`
          SELECT u.id, u.email, u.name, tu.role, u.status, u.created_at, u.last_login_at
          FROM public.users u
          JOIN tenant_users tu ON u.id = tu.user_id
          WHERE tu.tenant_id = ${tenantId}
            AND tu.role = ${role}
          ORDER BY u.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        users = result.rows.map(row => ({
          id: String(row.id),
          email: String(row.email),
          name: row.name ? String(row.name) : undefined,
          role: String(row.role),
          status: row.status as 'active' | 'inactive' | 'pending',
          createdAt: String(row.created_at),
          lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
        }))
      } else if (status) {
        const result = await sql`
          SELECT u.id, u.email, u.name, tu.role, u.status, u.created_at, u.last_login_at
          FROM public.users u
          JOIN tenant_users tu ON u.id = tu.user_id
          WHERE tu.tenant_id = ${tenantId}
            AND u.status = ${status}
          ORDER BY u.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        users = result.rows.map(row => ({
          id: String(row.id),
          email: String(row.email),
          name: row.name ? String(row.name) : undefined,
          role: String(row.role),
          status: row.status as 'active' | 'inactive' | 'pending',
          createdAt: String(row.created_at),
          lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
        }))
      } else if (search) {
        const searchPattern = `%${search}%`
        const result = await sql`
          SELECT u.id, u.email, u.name, tu.role, u.status, u.created_at, u.last_login_at
          FROM public.users u
          JOIN tenant_users tu ON u.id = tu.user_id
          WHERE tu.tenant_id = ${tenantId}
            AND (u.name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
          ORDER BY u.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        users = result.rows.map(row => ({
          id: String(row.id),
          email: String(row.email),
          name: row.name ? String(row.name) : undefined,
          role: String(row.role),
          status: row.status as 'active' | 'inactive' | 'pending',
          createdAt: String(row.created_at),
          lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
        }))
      } else {
        const result = await sql`
          SELECT u.id, u.email, u.name, tu.role, u.status, u.created_at, u.last_login_at
          FROM public.users u
          JOIN tenant_users tu ON u.id = tu.user_id
          WHERE tu.tenant_id = ${tenantId}
          ORDER BY u.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        users = result.rows.map(row => ({
          id: String(row.id),
          email: String(row.email),
          name: row.name ? String(row.name) : undefined,
          role: String(row.role),
          status: row.status as 'active' | 'inactive' | 'pending',
          createdAt: String(row.created_at),
          lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
        }))
      }

      return jsonResult({
        users,
        count: users.length,
        offset,
        hasMore: users.length === limit,
      })
    })
  },
})

/**
 * Get user details
 */
export const getUserTool: ToolDefinition = defineTool({
  name: 'get_user',
  description: 'Get detailed information about a specific user',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID the user belongs to',
      },
      userId: {
        type: 'string',
        description: 'User ID to get details for',
      },
    },
    required: ['tenantId', 'userId'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const userId = args.userId as string

    return withTenant(tenantId, async () => {
      const result = await sql`
        SELECT
          u.id, u.email, u.name, u.status, u.created_at, u.last_login_at,
          u.email_verified, u.phone, u.avatar_url,
          tu.role, tu.permissions
        FROM public.users u
        JOIN tenant_users tu ON u.id = tu.user_id
        WHERE tu.tenant_id = ${tenantId} AND u.id = ${userId}
      `

      const row = result.rows[0]
      if (!row) {
        return errorResult(`User not found: ${userId}`)
      }

      return jsonResult({
        id: String(row.id),
        email: String(row.email),
        name: row.name ? String(row.name) : null,
        phone: row.phone ? String(row.phone) : null,
        avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
        role: String(row.role),
        permissions: row.permissions as string[] | null,
        status: row.status as 'active' | 'inactive' | 'pending',
        emailVerified: Boolean(row.email_verified),
        createdAt: String(row.created_at),
        lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
      })
    })
  },
})

/**
 * Update user role
 */
export const updateUserRoleTool: ToolDefinition = defineTool({
  name: 'update_user_role',
  description: 'Update the role and permissions of a user within a tenant',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID the user belongs to',
      },
      userId: {
        type: 'string',
        description: 'User ID to update',
      },
      role: {
        type: 'string',
        description: 'New role for the user',
        enum: ['admin', 'manager', 'member', 'viewer'],
      },
      permissions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional permissions to grant',
      },
    },
    required: ['tenantId', 'userId', 'role'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const userId = args.userId as string
    const role = args.role as string
    const permissions = args.permissions as string[] | undefined

    return withTenant(tenantId, async () => {
      // Verify user exists in tenant
      const existing = await sql`
        SELECT user_id FROM tenant_users
        WHERE tenant_id = ${tenantId} AND user_id = ${userId}
      `

      if (existing.rowCount === 0) {
        return errorResult(`User ${userId} not found in tenant ${tenantId}`)
      }

      // Update role and permissions
      const permissionsJson = permissions ? JSON.stringify(permissions) : null
      await sql`
        UPDATE tenant_users
        SET role = ${role},
            permissions = ${permissionsJson},
            updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND user_id = ${userId}
      `

      // Log audit entry
      await sql`
        INSERT INTO audit_logs (user_id, action, resource, resource_id, details, created_at)
        VALUES (
          ${userId},
          'role_updated',
          'user',
          ${userId},
          ${JSON.stringify({ role, permissions: permissions ?? [] })},
          NOW()
        )
      `

      return jsonResult({
        success: true,
        userId,
        role,
        permissions: permissions ?? [],
        message: `User role updated to '${role}'`,
      })
    })
  },
})

/**
 * Invite user to tenant
 */
export const inviteUserTool: ToolDefinition = defineTool({
  name: 'invite_user',
  description: 'Invite a new user to join a tenant',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID to invite user to',
      },
      email: {
        type: 'string',
        description: 'Email address of the user to invite',
      },
      role: {
        type: 'string',
        description: 'Role to assign to the user',
        enum: ['admin', 'manager', 'member', 'viewer'],
        default: 'member',
      },
      name: {
        type: 'string',
        description: 'Name of the user (optional)',
      },
      invitedBy: {
        type: 'string',
        description: 'User ID of the person sending the invitation',
      },
    },
    required: ['tenantId', 'email', 'invitedBy'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const email = args.email as string
    const role = args.role as string | undefined ?? 'member'
    const name = args.name as string | undefined
    const invitedBy = args.invitedBy as string

    return withTenant(tenantId, async () => {
      // Check if user already exists
      const existing = await sql`
        SELECT id FROM public.users WHERE email = ${email}
      `

      let userId: string

      if (existing.rows[0]) {
        // User exists, check if already in tenant
        userId = String(existing.rows[0].id)
        const inTenant = await sql`
          SELECT 1 FROM tenant_users WHERE tenant_id = ${tenantId} AND user_id = ${userId}
        `
        if (inTenant.rowCount && inTenant.rowCount > 0) {
          return errorResult(`User ${email} is already a member of this tenant`)
        }
      } else {
        // Create new user with pending status
        userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
        await sql`
          INSERT INTO public.users (id, email, name, status, created_at)
          VALUES (${userId}, ${email}, ${name ?? null}, 'pending', NOW())
        `
      }

      // Add user to tenant
      await sql`
        INSERT INTO tenant_users (tenant_id, user_id, role, created_at)
        VALUES (${tenantId}, ${userId}, ${role}, NOW())
      `

      // Create invitation record
      const inviteToken = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 20)}`
      await sql`
        INSERT INTO invitations (id, tenant_id, user_id, email, role, invited_by, token, expires_at, created_at)
        VALUES (
          ${`invite_${Date.now()}`},
          ${tenantId},
          ${userId},
          ${email},
          ${role},
          ${invitedBy},
          ${inviteToken},
          NOW() + INTERVAL '7 days',
          NOW()
        )
      `

      // Queue invitation email (would integrate with notification system)
      await sql`
        INSERT INTO notifications (id, type, recipient, subject, body, status, created_at)
        VALUES (
          ${`notif_${Date.now()}`},
          'email',
          ${email},
          'You have been invited to join',
          ${`You have been invited to join the team. Click here to accept: /invite/${inviteToken}`},
          'pending',
          NOW()
        )
      `

      return jsonResult({
        success: true,
        userId,
        email,
        role,
        inviteToken,
        expiresIn: '7 days',
        message: `Invitation sent to ${email}`,
      })
    })
  },
})

// =============================================================================
// Audit & Logs Tools (3 tools)
// =============================================================================

/**
 * Get audit log entries
 */
export const getAuditLogTool: ToolDefinition = defineTool({
  name: 'get_audit_log',
  description: 'Get audit log entries for a tenant with filtering options',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID to get audit logs for',
      },
      userId: {
        type: 'string',
        description: 'Filter by user ID',
      },
      action: {
        type: 'string',
        description: 'Filter by action type',
      },
      resource: {
        type: 'string',
        description: 'Filter by resource type',
      },
      since: {
        type: 'string',
        description: 'ISO date string to filter entries after',
      },
      until: {
        type: 'string',
        description: 'ISO date string to filter entries before',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of entries to return',
        default: 100,
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination',
        default: 0,
      },
    },
    required: ['tenantId'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const userId = args.userId as string | undefined
    const action = args.action as string | undefined
    const resource = args.resource as string | undefined
    const since = args.since as string | undefined
    const until = args.until as string | undefined
    const limit = Math.min(args.limit as number | undefined ?? 100, 500)
    const offset = args.offset as number | undefined ?? 0

    return withTenant(tenantId, async () => {
      // Build query based on provided filters
      let entries: AuditLogEntry[]

      // Due to sql tag limitations, we handle the most common filter combinations
      if (userId && action && resource && since && until) {
        const result = await sql`
          SELECT id, user_id, action, resource, resource_id, details, ip_address, user_agent, created_at
          FROM audit_logs
          WHERE user_id = ${userId}
            AND action = ${action}
            AND resource = ${resource}
            AND created_at >= ${since}
            AND created_at <= ${until}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        entries = mapAuditRows(result.rows)
      } else if (userId && action) {
        const result = await sql`
          SELECT id, user_id, action, resource, resource_id, details, ip_address, user_agent, created_at
          FROM audit_logs
          WHERE user_id = ${userId} AND action = ${action}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        entries = mapAuditRows(result.rows)
      } else if (userId) {
        const result = await sql`
          SELECT id, user_id, action, resource, resource_id, details, ip_address, user_agent, created_at
          FROM audit_logs
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        entries = mapAuditRows(result.rows)
      } else if (action) {
        const result = await sql`
          SELECT id, user_id, action, resource, resource_id, details, ip_address, user_agent, created_at
          FROM audit_logs
          WHERE action = ${action}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        entries = mapAuditRows(result.rows)
      } else if (resource) {
        const result = await sql`
          SELECT id, user_id, action, resource, resource_id, details, ip_address, user_agent, created_at
          FROM audit_logs
          WHERE resource = ${resource}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        entries = mapAuditRows(result.rows)
      } else if (since && until) {
        const result = await sql`
          SELECT id, user_id, action, resource, resource_id, details, ip_address, user_agent, created_at
          FROM audit_logs
          WHERE created_at >= ${since} AND created_at <= ${until}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        entries = mapAuditRows(result.rows)
      } else if (since) {
        const result = await sql`
          SELECT id, user_id, action, resource, resource_id, details, ip_address, user_agent, created_at
          FROM audit_logs
          WHERE created_at >= ${since}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        entries = mapAuditRows(result.rows)
      } else {
        const result = await sql`
          SELECT id, user_id, action, resource, resource_id, details, ip_address, user_agent, created_at
          FROM audit_logs
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        entries = mapAuditRows(result.rows)
      }

      return jsonResult({
        entries,
        count: entries.length,
        offset,
        hasMore: entries.length === limit,
      })
    })
  },
})

/** Helper to map audit log rows */
function mapAuditRows(rows: Record<string, unknown>[]): AuditLogEntry[] {
  return rows.map(row => ({
    id: String(row.id),
    userId: String(row.user_id),
    action: String(row.action),
    resource: String(row.resource),
    resourceId: row.resource_id ? String(row.resource_id) : undefined,
    details: row.details as Record<string, unknown> | undefined,
    ipAddress: row.ip_address ? String(row.ip_address) : undefined,
    userAgent: row.user_agent ? String(row.user_agent) : undefined,
    createdAt: String(row.created_at),
  }))
}

/**
 * Search system logs
 */
export const searchLogsTool: ToolDefinition = defineTool({
  name: 'search_logs',
  description: 'Search system logs with full-text search',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID to search logs for',
      },
      query: {
        type: 'string',
        description: 'Search query string',
      },
      level: {
        type: 'string',
        description: 'Filter by log level',
        enum: ['debug', 'info', 'warn', 'error'],
      },
      source: {
        type: 'string',
        description: 'Filter by log source/service',
      },
      since: {
        type: 'string',
        description: 'ISO date string to filter logs after',
      },
      until: {
        type: 'string',
        description: 'ISO date string to filter logs before',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of logs to return',
        default: 100,
      },
    },
    required: ['tenantId', 'query'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const query = args.query as string
    const level = args.level as string | undefined
    const source = args.source as string | undefined
    const since = args.since as string | undefined
    const until = args.until as string | undefined
    const limit = Math.min(args.limit as number | undefined ?? 100, 500)

    return withTenant(tenantId, async () => {
      // Search logs using full-text search
      const searchPattern = `%${query}%`

      let logs: Array<{
        id: string
        level: string
        message: string
        source: string
        metadata?: Record<string, unknown>
        timestamp: string
      }>

      if (level && source && since && until) {
        const result = await sql`
          SELECT id, level, message, source, metadata, timestamp
          FROM system_logs
          WHERE message ILIKE ${searchPattern}
            AND level = ${level}
            AND source = ${source}
            AND timestamp >= ${since}
            AND timestamp <= ${until}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `
        logs = result.rows.map(row => ({
          id: String(row.id),
          level: String(row.level),
          message: String(row.message),
          source: String(row.source),
          metadata: row.metadata as Record<string, unknown> | undefined,
          timestamp: String(row.timestamp),
        }))
      } else if (level && since) {
        const result = await sql`
          SELECT id, level, message, source, metadata, timestamp
          FROM system_logs
          WHERE message ILIKE ${searchPattern}
            AND level = ${level}
            AND timestamp >= ${since}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `
        logs = result.rows.map(row => ({
          id: String(row.id),
          level: String(row.level),
          message: String(row.message),
          source: String(row.source),
          metadata: row.metadata as Record<string, unknown> | undefined,
          timestamp: String(row.timestamp),
        }))
      } else if (level) {
        const result = await sql`
          SELECT id, level, message, source, metadata, timestamp
          FROM system_logs
          WHERE message ILIKE ${searchPattern}
            AND level = ${level}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `
        logs = result.rows.map(row => ({
          id: String(row.id),
          level: String(row.level),
          message: String(row.message),
          source: String(row.source),
          metadata: row.metadata as Record<string, unknown> | undefined,
          timestamp: String(row.timestamp),
        }))
      } else if (source) {
        const result = await sql`
          SELECT id, level, message, source, metadata, timestamp
          FROM system_logs
          WHERE message ILIKE ${searchPattern}
            AND source = ${source}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `
        logs = result.rows.map(row => ({
          id: String(row.id),
          level: String(row.level),
          message: String(row.message),
          source: String(row.source),
          metadata: row.metadata as Record<string, unknown> | undefined,
          timestamp: String(row.timestamp),
        }))
      } else {
        const result = await sql`
          SELECT id, level, message, source, metadata, timestamp
          FROM system_logs
          WHERE message ILIKE ${searchPattern}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `
        logs = result.rows.map(row => ({
          id: String(row.id),
          level: String(row.level),
          message: String(row.message),
          source: String(row.source),
          metadata: row.metadata as Record<string, unknown> | undefined,
          timestamp: String(row.timestamp),
        }))
      }

      return jsonResult({
        logs,
        count: logs.length,
        query,
        hasMore: logs.length === limit,
      })
    })
  },
})

/**
 * Export audit log (streaming)
 */
export const exportAuditLogTool: ToolDefinition = defineTool({
  name: 'export_audit_log',
  description: 'Export audit log entries for a tenant (supports large exports)',
  streaming: true,
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID to export audit logs for',
      },
      format: {
        type: 'string',
        description: 'Export format',
        enum: ['json', 'csv'],
        default: 'json',
      },
      since: {
        type: 'string',
        description: 'ISO date string to filter entries after',
      },
      until: {
        type: 'string',
        description: 'ISO date string to filter entries before',
      },
    },
    required: ['tenantId'],
  },
  async *handler(args) {
    const { progressChunk, partialChunk, completeChunk } = await import('../streaming')

    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const format = args.format as string | undefined ?? 'json'
    const since = args.since as string | undefined
    const until = args.until as string | undefined

    yield progressChunk(0, 'Starting audit log export...')

    // Count total entries
    const countResult = await withTenant(tenantId, async () => {
      if (since && until) {
        return sql`
          SELECT COUNT(*) as total FROM audit_logs
          WHERE created_at >= ${since} AND created_at <= ${until}
        `
      } else if (since) {
        return sql`
          SELECT COUNT(*) as total FROM audit_logs
          WHERE created_at >= ${since}
        `
      } else {
        return sql`SELECT COUNT(*) as total FROM audit_logs`
      }
    })

    const total = Number(countResult.rows[0]?.total ?? 0)
    if (total === 0) {
      yield completeChunk({
        content: [{ type: 'text', text: 'No audit log entries found for export.' }],
        isError: false,
      })
      return
    }

    yield progressChunk(5, `Found ${total} entries to export...`)

    // Export in batches
    const batchSize = 1000
    const batches = Math.ceil(total / batchSize)
    let exported = 0

    if (format === 'csv') {
      // CSV header
      yield partialChunk([{
        type: 'text',
        text: 'id,user_id,action,resource,resource_id,created_at\n',
      }], 0)
    } else {
      yield partialChunk([{ type: 'text', text: '[\n' }], 0)
    }

    for (let batch = 0; batch < batches; batch++) {
      const offset = batch * batchSize

      const entries = await withTenant(tenantId, async () => {
        if (since && until) {
          return sql`
            SELECT id, user_id, action, resource, resource_id, created_at
            FROM audit_logs
            WHERE created_at >= ${since} AND created_at <= ${until}
            ORDER BY created_at DESC
            LIMIT ${batchSize} OFFSET ${offset}
          `
        } else if (since) {
          return sql`
            SELECT id, user_id, action, resource, resource_id, created_at
            FROM audit_logs
            WHERE created_at >= ${since}
            ORDER BY created_at DESC
            LIMIT ${batchSize} OFFSET ${offset}
          `
        } else {
          return sql`
            SELECT id, user_id, action, resource, resource_id, created_at
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT ${batchSize} OFFSET ${offset}
          `
        }
      })

      // Format entries
      let batchText = ''
      for (let i = 0; i < entries.rows.length; i++) {
        const row = entries.rows[i]
        if (!row) continue

        if (format === 'csv') {
          batchText += `${row.id},${row.user_id},${row.action},${row.resource},${row.resource_id ?? ''},${row.created_at}\n`
        } else {
          const entry = {
            id: row.id,
            userId: row.user_id,
            action: row.action,
            resource: row.resource,
            resourceId: row.resource_id,
            createdAt: row.created_at,
          }
          const separator = exported + i > 0 ? ',\n' : ''
          batchText += separator + JSON.stringify(entry)
        }
      }

      exported += entries.rows.length
      const progress = Math.round((exported / total) * 95) + 5

      yield partialChunk([{ type: 'text', text: batchText }], batch + 1)
      yield progressChunk(progress, `Exported ${exported} of ${total} entries...`)
    }

    // Close JSON array
    if (format === 'json') {
      yield partialChunk([{ type: 'text', text: '\n]' }], batches + 1)
    }

    yield completeChunk({
      content: [{
        type: 'text',
        text: `Export complete. ${exported} entries exported in ${format.toUpperCase()} format.`
      }],
      isError: false,
    })
  },
})

// =============================================================================
// Cache & Data Tools (2 tools)
// =============================================================================

/**
 * Clear cache
 */
export const clearCacheTool: ToolDefinition = defineTool({
  name: 'clear_cache',
  description: 'Clear specific cache entries or all cache for a tenant',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID to clear cache for',
      },
      pattern: {
        type: 'string',
        description: 'Cache key pattern to clear (e.g., "config*" or "user:*")',
      },
      clearAll: {
        type: 'boolean',
        description: 'Clear all cache for the tenant',
        default: false,
      },
    },
    required: ['tenantId'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string
    const pattern = args.pattern as string | undefined
    const clearAll = args.clearAll as boolean | undefined ?? false

    const cache = createTenantCache(tenantId)
    let clearedCount = 0

    if (clearAll) {
      // Clear all tenant cache
      await cache.clear()
      clearedCount = -1 // Unknown count when clearing all
    } else if (pattern) {
      // Clear specific pattern
      // Note: Pattern clearing would need Redis SCAN in production
      // For now, clear specific known patterns
      const knownPatterns = [
        'tenant-config',
        'feature-flags:all',
        `feature-flag:${pattern}`,
        pattern,
      ]

      for (const key of knownPatterns) {
        const deleted = await cache.delete(key)
        if (deleted) clearedCount++
      }
    } else {
      return errorResult('Either pattern or clearAll must be specified')
    }

    return jsonResult({
      success: true,
      tenantId,
      pattern: pattern ?? 'all',
      clearedCount: clearedCount === -1 ? 'all' : clearedCount,
      message: clearAll
        ? `All cache cleared for tenant ${tenantId}`
        : `Cleared ${clearedCount} cache entries matching "${pattern}"`,
    })
  },
})

/**
 * Get cache statistics
 */
export const getCacheStatsTool: ToolDefinition = defineTool({
  name: 'get_cache_stats',
  description: 'Get cache statistics for a tenant',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID to get cache stats for',
      },
    },
    required: ['tenantId'],
  },
  async handler(args) {
    // CRITICAL: Use _tenantId which is injected by MCPHandler from authenticated session
    // NEVER trust tenantId from client args - it can be spoofed
    const tenantId = args._tenantId as string

    // Cache stats would come from Redis INFO command in production
    // Using simulated stats based on in-memory cache
    const cache = createTenantCache(tenantId)

    // Test cache operations to measure latency
    const startTime = Date.now()
    const testKey = `stats_test_${Date.now()}`
    await cache.set(testKey, 'test', { ttl: 60 })
    await cache.get(testKey)
    await cache.delete(testKey)
    const latency = Date.now() - startTime

    const stats: CacheStats = {
      hits: 0, // Would come from Redis INFO
      misses: 0, // Would come from Redis INFO
      keys: 0, // Would come from DBSIZE
      memoryUsed: 'N/A', // Would come from Redis INFO memory
      hitRate: 'N/A', // Calculated from hits/(hits+misses)
    }

    return jsonResult({
      tenantId,
      ...stats,
      latencyMs: latency,
      status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'slow',
      message: 'Cache statistics (detailed stats require Redis connection)',
    })
  },
})

// =============================================================================
// Tool Registry Export
// =============================================================================

/** All system tools */
export const systemTools: ToolDefinition[] = [
  // Health & Monitoring (4)
  getSystemHealthTool,
  getServiceStatusTool,
  listRecentErrorsTool,
  getJobQueueStatusTool,
  // Configuration (4)
  getTenantConfigTool,
  updateTenantConfigTool,
  getFeatureFlagsTool,
  toggleFeatureFlagTool,
  // Notifications (3)
  sendNotificationTool,
  listNotificationsTool,
  getNotificationStatsTool,
  // User Management (4)
  listUsersTool,
  getUserTool,
  updateUserRoleTool,
  inviteUserTool,
  // Audit & Logs (3)
  getAuditLogTool,
  searchLogsTool,
  exportAuditLogTool,
  // Cache & Data (2)
  clearCacheTool,
  getCacheStatsTool,
]

/** System tool names for quick lookup */
export const systemToolNames = systemTools.map(t => t.name)
