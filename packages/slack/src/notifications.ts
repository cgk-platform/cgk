/**
 * @cgk-platform/slack - Notification sending and routing
 *
 * @ai-pattern notifications
 * @ai-note Handles sending notifications to configured channels with tenant isolation
 */

import { withTenant, sql, createTenantCache } from '@cgk-platform/db'
import { SlackClient } from './client'
import { buildMessage, getSampleData, type TemplateVariables } from './templates'
import type {
  NotificationType,
  SlackWorkspace,
  SlackChannelMapping,
  SlackNotificationLog,
  NotificationStatus,
  SlackTemplate,
} from './types'

const CHANNEL_CACHE_TTL = 300 // 5 minutes
const USER_CACHE_TTL = 86400 // 24 hours

export interface SendNotificationOptions {
  threadTs?: string
  mentionUserIds?: string[]
  ccUserIds?: string[]
  bypassQuietHours?: boolean
}

export interface SendNotificationResult {
  success: boolean
  messageTs?: string
  channelId?: string
  error?: string
  status: NotificationStatus
}

/**
 * Get the Slack workspace configuration for a tenant
 */
export async function getTenantWorkspace(
  tenantId: string,
): Promise<SlackWorkspace | null> {
  const cache = createTenantCache(tenantId)
  const cacheKey = 'slack:workspace'

  const cached = await cache.get<SlackWorkspace>(cacheKey)
  if (cached) return cached

  const result = await withTenant(tenantId, async () => {
    return sql<SlackWorkspace>`
      SELECT
        id,
        tenant_id as "tenantId",
        workspace_id as "workspaceId",
        workspace_name as "workspaceName",
        bot_token_encrypted as "botTokenEncrypted",
        user_token_encrypted as "userTokenEncrypted",
        connected_by_user_id as "connectedByUserId",
        connected_by_slack_user_id as "connectedBySlackUserId",
        bot_scopes as "botScopes",
        user_scopes as "userScopes",
        is_active as "isActive",
        last_verified_at as "lastVerifiedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM tenant_slack_workspaces
      WHERE is_active = true
      LIMIT 1
    `
  })

  const workspace = result.rows[0]
  if (!workspace) return null

  await cache.set(cacheKey, workspace, { ttl: CHANNEL_CACHE_TTL })
  return workspace
}

/**
 * Get channel mapping for a notification type
 */
export async function getChannelMapping(
  tenantId: string,
  notificationType: NotificationType,
): Promise<SlackChannelMapping | null> {
  const cache = createTenantCache(tenantId)
  const cacheKey = `slack:mapping:${notificationType}`

  const cached = await cache.get<SlackChannelMapping>(cacheKey)
  if (cached) return cached

  const result = await withTenant(tenantId, async () => {
    return sql<SlackChannelMapping>`
      SELECT
        id,
        tenant_id as "tenantId",
        notification_type as "notificationType",
        channel_id as "channelId",
        channel_name as "channelName",
        is_enabled as "isEnabled",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM tenant_slack_channel_mappings
      WHERE notification_type = ${notificationType}
      LIMIT 1
    `
  })

  const mapping = result.rows[0]
  if (!mapping) return null

  await cache.set(cacheKey, mapping, { ttl: CHANNEL_CACHE_TTL })
  return mapping
}

/**
 * Get custom template for a notification type (if exists)
 */
export async function getCustomTemplate(
  tenantId: string,
  notificationType: NotificationType,
): Promise<SlackTemplate | null> {
  const result = await withTenant(tenantId, async () => {
    return sql<SlackTemplate>`
      SELECT
        id,
        tenant_id as "tenantId",
        notification_type as "notificationType",
        blocks,
        fallback_text as "fallbackText",
        version,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM tenant_slack_templates
      WHERE notification_type = ${notificationType}
        AND is_active = true
      LIMIT 1
    `
  })

  const template = result.rows[0]
  return template ?? null
}

/**
 * Log a notification send attempt
 */
async function logNotification(
  tenantId: string,
  notificationType: NotificationType,
  channelId: string,
  status: NotificationStatus,
  messageTs: string | null = null,
  threadTs: string | null = null,
  errorMessage: string | null = null,
  payload: Record<string, unknown> | null = null,
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO tenant_slack_notifications (
        tenant_id,
        notification_type,
        channel_id,
        message_ts,
        thread_ts,
        status,
        error_message,
        payload
      ) VALUES (
        ${tenantId},
        ${notificationType},
        ${channelId},
        ${messageTs},
        ${threadTs},
        ${status},
        ${errorMessage},
        ${payload ? JSON.stringify(payload) : null}
      )
    `
  })
}

/**
 * Resolve a platform user to their Slack user ID
 */
export async function resolveSlackUser(
  tenantId: string,
  platformUserId: string,
  email?: string,
): Promise<string | null> {
  const cache = createTenantCache(tenantId)
  const cacheKey = `slack:user:${platformUserId}`

  const cached = await cache.get<string>(cacheKey)
  if (cached) return cached

  // Check database association
  const result = await withTenant(tenantId, async () => {
    return sql<{ slackUserId: string }>`
      SELECT slack_user_id as "slackUserId"
      FROM tenant_slack_user_associations
      WHERE platform_user_id = ${platformUserId}
        AND lookup_failures < 3
      LIMIT 1
    `
  })

  const row = result.rows[0]
  if (row) {
    const slackUserId = row.slackUserId
    await cache.set(cacheKey, slackUserId, { ttl: USER_CACHE_TTL })
    return slackUserId
  }

  // Try to find by email if provided
  if (email) {
    const workspace = await getTenantWorkspace(tenantId)
    if (workspace) {
      const client = SlackClient.fromEncryptedTokens(
        workspace.botTokenEncrypted,
        workspace.userTokenEncrypted,
      )

      const slackUser = await client.findUserByEmail(email)
      if (slackUser) {
        // Save the association
        await withTenant(tenantId, async () => {
          await sql`
            INSERT INTO tenant_slack_user_associations (
              tenant_id,
              platform_user_id,
              slack_user_id,
              slack_email,
              association_method,
              last_verified_at
            ) VALUES (
              ${tenantId},
              ${platformUserId},
              ${slackUser.id},
              ${email},
              'auto',
              NOW()
            )
            ON CONFLICT (tenant_id, platform_user_id)
            DO UPDATE SET
              slack_user_id = EXCLUDED.slack_user_id,
              slack_email = EXCLUDED.slack_email,
              last_verified_at = NOW(),
              lookup_failures = 0
          `
        })

        await cache.set(cacheKey, slackUser.id, { ttl: USER_CACHE_TTL })
        return slackUser.id
      } else {
        // Increment lookup failures
        await withTenant(tenantId, async () => {
          await sql`
            INSERT INTO tenant_slack_user_associations (
              tenant_id,
              platform_user_id,
              slack_user_id,
              association_method,
              lookup_failures
            ) VALUES (
              ${tenantId},
              ${platformUserId},
              '',
              'auto',
              1
            )
            ON CONFLICT (tenant_id, platform_user_id)
            DO UPDATE SET lookup_failures = tenant_slack_user_associations.lookup_failures + 1
          `
        })
      }
    }
  }

  return null
}

/**
 * Send a notification to a tenant's Slack channel
 */
export async function sendNotification(
  tenantId: string,
  notificationType: NotificationType,
  variables: TemplateVariables,
  options: SendNotificationOptions = {},
): Promise<SendNotificationResult> {
  // Get workspace
  const workspace = await getTenantWorkspace(tenantId)
  if (!workspace) {
    return {
      success: false,
      error: 'Slack workspace not connected',
      status: 'failed',
    }
  }

  // Get channel mapping
  const mapping = await getChannelMapping(tenantId, notificationType)
  if (!mapping) {
    return {
      success: false,
      error: `No channel configured for ${notificationType}`,
      status: 'failed',
    }
  }

  if (!mapping.isEnabled) {
    return {
      success: false,
      error: `Notifications disabled for ${notificationType}`,
      status: 'failed',
    }
  }

  // Get custom template or use default
  const customTemplate = await getCustomTemplate(tenantId, notificationType)
  let blocks: unknown[]
  let fallbackText: string

  if (customTemplate) {
    blocks = customTemplate.blocks
    fallbackText = customTemplate.fallbackText
  } else {
    const message = buildMessage(notificationType, variables)
    blocks = message.blocks
    fallbackText = message.fallbackText
  }

  // Create client and send
  const client = SlackClient.fromEncryptedTokens(
    workspace.botTokenEncrypted,
    workspace.userTokenEncrypted,
  )

  try {
    const result = await client.postMessage(
      mapping.channelId,
      blocks as never[],
      fallbackText,
      { threadTs: options.threadTs },
    )

    if (result.ok) {
      await logNotification(
        tenantId,
        notificationType,
        mapping.channelId,
        'sent',
        result.ts ?? null,
        options.threadTs ?? null,
        null,
        variables as Record<string, unknown>,
      )

      return {
        success: true,
        messageTs: result.ts,
        channelId: mapping.channelId,
        status: 'sent',
      }
    } else {
      await logNotification(
        tenantId,
        notificationType,
        mapping.channelId,
        'failed',
        null,
        null,
        result.error ?? 'Unknown error',
        variables as Record<string, unknown>,
      )

      return {
        success: false,
        error: result.error,
        status: 'failed',
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Handle specific Slack errors
    if (errorMessage.includes('channel_not_found')) {
      // Disable the mapping since channel was deleted
      await withTenant(tenantId, async () => {
        await sql`
          UPDATE tenant_slack_channel_mappings
          SET is_enabled = false, updated_at = NOW()
          WHERE notification_type = ${notificationType}
        `
      })
    } else if (errorMessage.includes('token_revoked') || errorMessage.includes('invalid_auth')) {
      // Mark workspace as disconnected
      await withTenant(tenantId, async () => {
        await sql`
          UPDATE tenant_slack_workspaces
          SET is_active = false, updated_at = NOW()
        `
      })
    }

    await logNotification(
      tenantId,
      notificationType,
      mapping.channelId,
      'failed',
      null,
      null,
      errorMessage,
      variables as Record<string, unknown>,
    )

    return {
      success: false,
      error: errorMessage,
      status: 'failed',
    }
  }
}

/**
 * Send a test notification
 */
export async function sendTestNotification(
  tenantId: string,
  notificationType: NotificationType,
  channelId?: string,
  useSampleData: boolean = true,
): Promise<SendNotificationResult> {
  const workspace = await getTenantWorkspace(tenantId)
  if (!workspace) {
    return {
      success: false,
      error: 'Slack workspace not connected',
      status: 'failed',
    }
  }

  // Use provided channel or get from mapping
  let targetChannelId = channelId
  if (!targetChannelId) {
    const mapping = await getChannelMapping(tenantId, notificationType)
    if (!mapping) {
      return {
        success: false,
        error: `No channel configured for ${notificationType}`,
        status: 'failed',
      }
    }
    targetChannelId = mapping.channelId
  }

  // Get sample data or empty variables
  const variables = useSampleData ? getSampleData(notificationType) : {}

  // Build message
  const customTemplate = await getCustomTemplate(tenantId, notificationType)
  let blocks: unknown[]
  let fallbackText: string

  if (customTemplate) {
    blocks = customTemplate.blocks
    fallbackText = customTemplate.fallbackText
  } else {
    const message = buildMessage(notificationType, variables)
    blocks = message.blocks
    fallbackText = message.fallbackText
  }

  // Send
  const client = SlackClient.fromEncryptedTokens(
    workspace.botTokenEncrypted,
    workspace.userTokenEncrypted,
  )

  try {
    const result = await client.postMessage(
      targetChannelId,
      blocks as never[],
      `[TEST] ${fallbackText}`,
    )

    return {
      success: result.ok,
      messageTs: result.ts,
      channelId: targetChannelId,
      error: result.error,
      status: result.ok ? 'sent' : 'failed',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'failed',
    }
  }
}

/**
 * Get notification logs for a tenant
 */
export async function getNotificationLogs(
  tenantId: string,
  options: {
    limit?: number
    offset?: number
    notificationType?: NotificationType
    status?: NotificationStatus
  } = {},
): Promise<SlackNotificationLog[]> {
  const { limit = 50, offset = 0, notificationType, status } = options

  const result = await withTenant(tenantId, async () => {
    if (notificationType && status) {
      return sql<SlackNotificationLog>`
        SELECT
          id,
          tenant_id as "tenantId",
          notification_type as "notificationType",
          channel_id as "channelId",
          message_ts as "messageTs",
          thread_ts as "threadTs",
          status,
          error_message as "errorMessage",
          payload,
          created_at as "createdAt"
        FROM tenant_slack_notifications
        WHERE notification_type = ${notificationType}
          AND status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    } else if (notificationType) {
      return sql<SlackNotificationLog>`
        SELECT
          id,
          tenant_id as "tenantId",
          notification_type as "notificationType",
          channel_id as "channelId",
          message_ts as "messageTs",
          thread_ts as "threadTs",
          status,
          error_message as "errorMessage",
          payload,
          created_at as "createdAt"
        FROM tenant_slack_notifications
        WHERE notification_type = ${notificationType}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    } else if (status) {
      return sql<SlackNotificationLog>`
        SELECT
          id,
          tenant_id as "tenantId",
          notification_type as "notificationType",
          channel_id as "channelId",
          message_ts as "messageTs",
          thread_ts as "threadTs",
          status,
          error_message as "errorMessage",
          payload,
          created_at as "createdAt"
        FROM tenant_slack_notifications
        WHERE status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    } else {
      return sql<SlackNotificationLog>`
        SELECT
          id,
          tenant_id as "tenantId",
          notification_type as "notificationType",
          channel_id as "channelId",
          message_ts as "messageTs",
          thread_ts as "threadTs",
          status,
          error_message as "errorMessage",
          payload,
          created_at as "createdAt"
        FROM tenant_slack_notifications
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    }
  })

  return result.rows
}

/**
 * Invalidate all Slack caches for a tenant
 */
export async function invalidateSlackCache(tenantId: string): Promise<void> {
  const cache = createTenantCache(tenantId)
  await cache.delete('slack:workspace')
  // Note: Individual mapping caches will expire naturally
}
