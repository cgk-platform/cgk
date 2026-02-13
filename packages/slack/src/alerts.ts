/**
 * @cgk-platform/slack - Platform-level ops alerting
 *
 * @ai-pattern alerts
 * @ai-note Super admin Slack integration for cross-tenant alerts
 */

import { sql } from '@cgk-platform/db'
import { SlackClient } from './client'
import type {
  PlatformSlackWorkspace,
  PlatformSlackAlert,
  AlertSeverity,
  SlackBlock,
} from './types'

// ============================================================================
// Platform Workspace Management
// ============================================================================

/**
 * Get the platform Slack workspace configuration
 */
export async function getPlatformWorkspace(): Promise<PlatformSlackWorkspace | null> {
  const result = await sql<PlatformSlackWorkspace>`
    SELECT
      id,
      workspace_id as "workspaceId",
      workspace_name as "workspaceName",
      bot_token_encrypted as "botTokenEncrypted",
      user_token_encrypted as "userTokenEncrypted",
      channel_critical as "channelCritical",
      channel_errors as "channelErrors",
      channel_warnings as "channelWarnings",
      channel_info as "channelInfo",
      channel_deployments as "channelDeployments",
      mention_critical as "mentionCritical",
      mention_errors as "mentionErrors",
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM platform_slack_workspace
    WHERE is_active = true
    LIMIT 1
  `

  const row = result.rows[0]
  return row ?? null
}

/**
 * Save or update platform Slack workspace
 */
export async function savePlatformWorkspace(data: {
  workspaceId: string
  workspaceName?: string
  botTokenEncrypted: string
  userTokenEncrypted?: string
  channelCritical?: string
  channelErrors?: string
  channelWarnings?: string
  channelInfo?: string
  channelDeployments?: string
  mentionCritical?: string
  mentionErrors?: string
}): Promise<PlatformSlackWorkspace> {
  const result = await sql<PlatformSlackWorkspace>`
    INSERT INTO platform_slack_workspace (
      workspace_id,
      workspace_name,
      bot_token_encrypted,
      user_token_encrypted,
      channel_critical,
      channel_errors,
      channel_warnings,
      channel_info,
      channel_deployments,
      mention_critical,
      mention_errors,
      is_active
    ) VALUES (
      ${data.workspaceId},
      ${data.workspaceName ?? null},
      ${data.botTokenEncrypted},
      ${data.userTokenEncrypted ?? null},
      ${data.channelCritical ?? null},
      ${data.channelErrors ?? null},
      ${data.channelWarnings ?? null},
      ${data.channelInfo ?? null},
      ${data.channelDeployments ?? null},
      ${data.mentionCritical ?? null},
      ${data.mentionErrors ?? null},
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      workspace_id = EXCLUDED.workspace_id,
      workspace_name = EXCLUDED.workspace_name,
      bot_token_encrypted = EXCLUDED.bot_token_encrypted,
      user_token_encrypted = EXCLUDED.user_token_encrypted,
      channel_critical = EXCLUDED.channel_critical,
      channel_errors = EXCLUDED.channel_errors,
      channel_warnings = EXCLUDED.channel_warnings,
      channel_info = EXCLUDED.channel_info,
      channel_deployments = EXCLUDED.channel_deployments,
      mention_critical = EXCLUDED.mention_critical,
      mention_errors = EXCLUDED.mention_errors,
      is_active = true,
      updated_at = NOW()
    RETURNING
      id,
      workspace_id as "workspaceId",
      workspace_name as "workspaceName",
      bot_token_encrypted as "botTokenEncrypted",
      user_token_encrypted as "userTokenEncrypted",
      channel_critical as "channelCritical",
      channel_errors as "channelErrors",
      channel_warnings as "channelWarnings",
      channel_info as "channelInfo",
      channel_deployments as "channelDeployments",
      mention_critical as "mentionCritical",
      mention_errors as "mentionErrors",
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to save platform Slack workspace')
  }
  return row
}

/**
 * Update platform Slack channel configuration
 */
export async function updatePlatformChannels(data: {
  channelCritical?: string
  channelErrors?: string
  channelWarnings?: string
  channelInfo?: string
  channelDeployments?: string
  mentionCritical?: string
  mentionErrors?: string
}): Promise<PlatformSlackWorkspace | null> {
  const result = await sql<PlatformSlackWorkspace>`
    UPDATE platform_slack_workspace
    SET
      channel_critical = COALESCE(${data.channelCritical ?? null}, channel_critical),
      channel_errors = COALESCE(${data.channelErrors ?? null}, channel_errors),
      channel_warnings = COALESCE(${data.channelWarnings ?? null}, channel_warnings),
      channel_info = COALESCE(${data.channelInfo ?? null}, channel_info),
      channel_deployments = COALESCE(${data.channelDeployments ?? null}, channel_deployments),
      mention_critical = COALESCE(${data.mentionCritical ?? null}, mention_critical),
      mention_errors = COALESCE(${data.mentionErrors ?? null}, mention_errors),
      updated_at = NOW()
    WHERE is_active = true
    RETURNING
      id,
      workspace_id as "workspaceId",
      workspace_name as "workspaceName",
      bot_token_encrypted as "botTokenEncrypted",
      user_token_encrypted as "userTokenEncrypted",
      channel_critical as "channelCritical",
      channel_errors as "channelErrors",
      channel_warnings as "channelWarnings",
      channel_info as "channelInfo",
      channel_deployments as "channelDeployments",
      mention_critical as "mentionCritical",
      mention_errors as "mentionErrors",
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  const row = result.rows[0]
  return row ?? null
}

/**
 * Disconnect platform Slack workspace
 */
export async function disconnectPlatformWorkspace(): Promise<boolean> {
  const result = await sql`
    UPDATE platform_slack_workspace
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true
  `

  return (result.rowCount ?? 0) > 0
}

// ============================================================================
// Alert Sending
// ============================================================================

/**
 * Get the channel for a severity level
 */
function getChannelForSeverity(
  workspace: PlatformSlackWorkspace,
  severity: AlertSeverity,
): string | null {
  switch (severity) {
    case 'critical':
      return workspace.channelCritical
    case 'error':
      return workspace.channelErrors
    case 'warning':
      return workspace.channelWarnings
    case 'info':
      return workspace.channelInfo
    default:
      return workspace.channelInfo
  }
}

/**
 * Get the mention for a severity level
 */
function getMentionForSeverity(
  workspace: PlatformSlackWorkspace,
  severity: AlertSeverity,
): string | null {
  switch (severity) {
    case 'critical':
      return workspace.mentionCritical
    case 'error':
      return workspace.mentionErrors
    default:
      return null
  }
}

/**
 * Build alert blocks
 */
function buildAlertBlocks(
  severity: AlertSeverity,
  service: string,
  title: string,
  message?: string | null,
  tenantId?: string | null,
  mention?: string | null,
): SlackBlock[] {
  const severityEmoji: Record<AlertSeverity, string> = {
    critical: ':rotating_light:',
    error: ':warning:',
    warning: ':large_yellow_circle:',
    info: ':information_source:',
  }

  const blocks: SlackBlock[] = []

  // Header
  blocks.push({
    type: 'header',
    text: {
      type: 'plain_text',
      text: `${severityEmoji[severity]} ${title}`,
      emoji: true,
    },
  })

  // Mention in first section if critical/error
  if (mention) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `<!${mention}>` },
    })
  }

  // Details
  const fields: Array<{ type: string; text: string }> = [
    { type: 'mrkdwn', text: `*Severity:* ${severity.toUpperCase()}` },
    { type: 'mrkdwn', text: `*Service:* ${service}` },
  ]

  if (tenantId) {
    fields.push({ type: 'mrkdwn', text: `*Tenant:* ${tenantId}` })
  }

  blocks.push({
    type: 'section',
    fields,
  })

  // Message
  if (message) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: message },
    })
  }

  // Timestamp
  blocks.push({
    type: 'context',
    elements: [
      { type: 'mrkdwn', text: `CGK Platform Ops | ${new Date().toISOString()}` },
    ],
  })

  return blocks
}

/**
 * Log an alert
 */
async function logAlert(
  severity: AlertSeverity,
  service: string,
  title: string,
  message: string | null,
  tenantId: string | null,
  channelId: string | null,
  messageTs: string | null,
  status: 'sent' | 'failed',
): Promise<void> {
  await sql`
    INSERT INTO platform_slack_alerts (
      severity,
      service,
      tenant_id,
      title,
      message,
      channel_id,
      message_ts,
      status
    ) VALUES (
      ${severity},
      ${service},
      ${tenantId},
      ${title},
      ${message},
      ${channelId},
      ${messageTs},
      ${status}
    )
  `
}

export interface SendAlertResult {
  success: boolean
  messageTs?: string
  channelId?: string
  error?: string
}

/**
 * Send a platform alert
 */
export async function sendAlert(
  severity: AlertSeverity,
  service: string,
  title: string,
  message?: string | null,
  tenantId?: string | null,
): Promise<SendAlertResult> {
  const workspace = await getPlatformWorkspace()
  if (!workspace) {
    return { success: false, error: 'Platform Slack not connected' }
  }

  const channelId = getChannelForSeverity(workspace, severity)
  if (!channelId) {
    return { success: false, error: `No channel configured for ${severity} alerts` }
  }

  const mention = getMentionForSeverity(workspace, severity)
  const blocks = buildAlertBlocks(severity, service, title, message, tenantId, mention)
  const fallbackText = `[${severity.toUpperCase()}] ${service}: ${title}`

  const client = SlackClient.fromEncryptedTokens(
    workspace.botTokenEncrypted,
    workspace.userTokenEncrypted,
  )

  try {
    const result = await client.postMessage(channelId, blocks, fallbackText)

    await logAlert(
      severity,
      service,
      title,
      message ?? null,
      tenantId ?? null,
      channelId,
      result.ts ?? null,
      result.ok ? 'sent' : 'failed',
    )

    return {
      success: result.ok,
      messageTs: result.ts,
      channelId,
      error: result.error,
    }
  } catch (error) {
    await logAlert(
      severity,
      service,
      title,
      message ?? null,
      tenantId ?? null,
      channelId,
      null,
      'failed',
    )

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send a critical alert
 */
export async function sendCriticalAlert(
  service: string,
  title: string,
  message?: string,
  tenantId?: string,
): Promise<SendAlertResult> {
  return sendAlert('critical', service, title, message, tenantId)
}

/**
 * Send an error alert
 */
export async function sendErrorAlert(
  service: string,
  title: string,
  message?: string,
  tenantId?: string,
): Promise<SendAlertResult> {
  return sendAlert('error', service, title, message, tenantId)
}

/**
 * Send a warning alert
 */
export async function sendWarningAlert(
  service: string,
  title: string,
  message?: string,
  tenantId?: string,
): Promise<SendAlertResult> {
  return sendAlert('warning', service, title, message, tenantId)
}

/**
 * Send an info alert
 */
export async function sendInfoAlert(
  service: string,
  title: string,
  message?: string,
): Promise<SendAlertResult> {
  return sendAlert('info', service, title, message)
}

/**
 * Send a deployment notification
 */
export async function sendDeploymentAlert(
  title: string,
  message: string,
): Promise<SendAlertResult> {
  const workspace = await getPlatformWorkspace()
  if (!workspace) {
    return { success: false, error: 'Platform Slack not connected' }
  }

  const channelId = workspace.channelDeployments || workspace.channelInfo
  if (!channelId) {
    return { success: false, error: 'No deployment channel configured' }
  }

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `:rocket: ${title}`, emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: message },
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `CGK DevOps | ${new Date().toISOString()}` },
      ],
    },
  ]

  const client = SlackClient.fromEncryptedTokens(
    workspace.botTokenEncrypted,
    workspace.userTokenEncrypted,
  )

  try {
    const result = await client.postMessage(
      channelId,
      blocks,
      `[DEPLOYMENT] ${title}`,
    )

    return {
      success: result.ok,
      messageTs: result.ts,
      channelId,
      error: result.error,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// Alert History
// ============================================================================

/**
 * Get recent platform alerts
 */
export async function getAlertHistory(options: {
  limit?: number
  offset?: number
  severity?: AlertSeverity
  service?: string
  tenantId?: string
} = {}): Promise<PlatformSlackAlert[]> {
  const { limit = 50, offset = 0, severity, service, tenantId } = options

  if (severity && service && tenantId) {
    const result = await sql<PlatformSlackAlert>`
      SELECT
        id,
        severity,
        service,
        tenant_id as "tenantId",
        title,
        message,
        channel_id as "channelId",
        message_ts as "messageTs",
        status,
        created_at as "createdAt"
      FROM platform_slack_alerts
      WHERE severity = ${severity}
        AND service = ${service}
        AND tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
    return result.rows
  } else if (severity && service) {
    const result = await sql<PlatformSlackAlert>`
      SELECT
        id,
        severity,
        service,
        tenant_id as "tenantId",
        title,
        message,
        channel_id as "channelId",
        message_ts as "messageTs",
        status,
        created_at as "createdAt"
      FROM platform_slack_alerts
      WHERE severity = ${severity}
        AND service = ${service}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
    return result.rows
  } else if (severity) {
    const result = await sql<PlatformSlackAlert>`
      SELECT
        id,
        severity,
        service,
        tenant_id as "tenantId",
        title,
        message,
        channel_id as "channelId",
        message_ts as "messageTs",
        status,
        created_at as "createdAt"
      FROM platform_slack_alerts
      WHERE severity = ${severity}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
    return result.rows
  } else {
    const result = await sql<PlatformSlackAlert>`
      SELECT
        id,
        severity,
        service,
        tenant_id as "tenantId",
        title,
        message,
        channel_id as "channelId",
        message_ts as "messageTs",
        status,
        created_at as "createdAt"
      FROM platform_slack_alerts
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
    return result.rows
  }
}

/**
 * Test platform Slack connection
 */
export async function testPlatformConnection(): Promise<{
  success: boolean
  workspaceName?: string
  botValid: boolean
  error?: string
}> {
  const workspace = await getPlatformWorkspace()
  if (!workspace) {
    return { success: false, botValid: false, error: 'Not connected' }
  }

  const client = SlackClient.fromEncryptedTokens(
    workspace.botTokenEncrypted,
    workspace.userTokenEncrypted,
  )

  const authResult = await client.testBotAuth()
  const teamInfo = await client.getTeamInfo()

  return {
    success: authResult.ok,
    workspaceName: teamInfo?.name,
    botValid: authResult.ok,
    error: authResult.error,
  }
}
