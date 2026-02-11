/**
 * Slack notifications for treasury events
 */

import type { DrawRequestWithItems, StripeTopup, LowBalanceAlert } from './types'
import { getTreasurySettings } from './db/settings'

/**
 * Slack message attachment
 */
interface SlackAttachment {
  fallback: string
  color: string
  title?: string
  title_link?: string
  text?: string
  fields?: {
    title: string
    value: string
    short?: boolean
  }[]
  footer?: string
  ts?: number
}

/**
 * Slack message payload
 */
interface SlackMessage {
  text: string
  attachments?: SlackAttachment[]
  blocks?: unknown[]
}

/**
 * Format currency for display
 */
function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

/**
 * Send a message to Slack
 */
export async function sendSlackNotification(
  webhookUrl: string,
  message: SlackMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `Slack API error: ${text}` }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if Slack notifications are enabled for a tenant
 */
export async function isSlackEnabled(tenantSlug: string): Promise<{
  enabled: boolean
  webhookUrl: string | null
}> {
  const settings = await getTreasurySettings(tenantSlug)
  return {
    enabled: settings.slack_notifications_enabled && !!settings.slack_webhook_url,
    webhookUrl: settings.slack_webhook_url,
  }
}

/**
 * Notify about a new draw request
 */
export async function notifyDrawRequestCreated(
  tenantSlug: string,
  request: DrawRequestWithItems,
  adminUrl: string
): Promise<{ success: boolean; error?: string }> {
  const slack = await isSlackEnabled(tenantSlug)
  if (!slack.enabled || !slack.webhookUrl) {
    return { success: true } // Silently skip if not enabled
  }

  const message: SlackMessage = {
    text: `New Draw Request Created: ${request.request_number}`,
    attachments: [
      {
        fallback: `Draw Request ${request.request_number} for ${formatCurrency(request.total_amount_cents)}`,
        color: '#3b82f6', // Blue
        title: `Draw Request ${request.request_number}`,
        title_link: `${adminUrl}/admin/treasury?request=${request.id}`,
        fields: [
          {
            title: 'Amount',
            value: formatCurrency(request.total_amount_cents),
            short: true,
          },
          {
            title: 'Treasurer',
            value: request.treasurer_name,
            short: true,
          },
          {
            title: 'Description',
            value: request.description,
            short: false,
          },
          {
            title: 'Payees',
            value: request.items.map((i) => `${i.creator_name}: ${formatCurrency(i.net_amount_cents)}`).join('\n'),
            short: false,
          },
        ],
        footer: 'CGK Treasury',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }

  return sendSlackNotification(slack.webhookUrl, message)
}

/**
 * Notify about draw request approval
 */
export async function notifyDrawRequestApproved(
  tenantSlug: string,
  request: DrawRequestWithItems,
  approvedBy: string,
  adminUrl: string
): Promise<{ success: boolean; error?: string }> {
  const slack = await isSlackEnabled(tenantSlug)
  if (!slack.enabled || !slack.webhookUrl) {
    return { success: true }
  }

  const message: SlackMessage = {
    text: `Draw Request Approved: ${request.request_number}`,
    attachments: [
      {
        fallback: `Draw Request ${request.request_number} approved by ${approvedBy}`,
        color: '#22c55e', // Green
        title: `Draw Request ${request.request_number} - APPROVED`,
        title_link: `${adminUrl}/admin/treasury?request=${request.id}`,
        fields: [
          {
            title: 'Amount',
            value: formatCurrency(request.total_amount_cents),
            short: true,
          },
          {
            title: 'Approved By',
            value: approvedBy,
            short: true,
          },
        ],
        footer: 'CGK Treasury',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }

  return sendSlackNotification(slack.webhookUrl, message)
}

/**
 * Notify about draw request rejection
 */
export async function notifyDrawRequestRejected(
  tenantSlug: string,
  request: DrawRequestWithItems,
  rejectedBy: string,
  reason: string,
  adminUrl: string
): Promise<{ success: boolean; error?: string }> {
  const slack = await isSlackEnabled(tenantSlug)
  if (!slack.enabled || !slack.webhookUrl) {
    return { success: true }
  }

  const message: SlackMessage = {
    text: `Draw Request Rejected: ${request.request_number}`,
    attachments: [
      {
        fallback: `Draw Request ${request.request_number} rejected by ${rejectedBy}: ${reason}`,
        color: '#ef4444', // Red
        title: `Draw Request ${request.request_number} - REJECTED`,
        title_link: `${adminUrl}/admin/treasury?request=${request.id}`,
        fields: [
          {
            title: 'Amount',
            value: formatCurrency(request.total_amount_cents),
            short: true,
          },
          {
            title: 'Rejected By',
            value: rejectedBy,
            short: true,
          },
          {
            title: 'Reason',
            value: reason,
            short: false,
          },
        ],
        footer: 'CGK Treasury',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }

  return sendSlackNotification(slack.webhookUrl, message)
}

/**
 * Notify about a new top-up
 */
export async function notifyTopupCreated(
  tenantSlug: string,
  topup: StripeTopup,
  adminUrl: string
): Promise<{ success: boolean; error?: string }> {
  const slack = await isSlackEnabled(tenantSlug)
  if (!slack.enabled || !slack.webhookUrl) {
    return { success: true }
  }

  const message: SlackMessage = {
    text: `New Top-up Initiated`,
    attachments: [
      {
        fallback: `Top-up of ${formatCurrency(topup.amount_cents)} initiated`,
        color: '#8b5cf6', // Purple
        title: `Top-up: ${formatCurrency(topup.amount_cents)}`,
        title_link: `${adminUrl}/admin/stripe-topups`,
        fields: [
          {
            title: 'Amount',
            value: formatCurrency(topup.amount_cents),
            short: true,
          },
          {
            title: 'Status',
            value: topup.status.toUpperCase(),
            short: true,
          },
          {
            title: 'Source',
            value: topup.source_bank_name
              ? `${topup.source_bank_name} (****${topup.source_last4})`
              : 'Default source',
            short: false,
          },
        ],
        footer: 'CGK Treasury',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }

  return sendSlackNotification(slack.webhookUrl, message)
}

/**
 * Notify about top-up completion
 */
export async function notifyTopupCompleted(
  tenantSlug: string,
  topup: StripeTopup,
  adminUrl: string
): Promise<{ success: boolean; error?: string }> {
  const slack = await isSlackEnabled(tenantSlug)
  if (!slack.enabled || !slack.webhookUrl) {
    return { success: true }
  }

  const isSuccess = topup.status === 'succeeded'

  const message: SlackMessage = {
    text: `Top-up ${isSuccess ? 'Completed' : 'Failed'}`,
    attachments: [
      {
        fallback: `Top-up of ${formatCurrency(topup.amount_cents)} ${isSuccess ? 'completed' : 'failed'}`,
        color: isSuccess ? '#22c55e' : '#ef4444',
        title: `Top-up: ${formatCurrency(topup.amount_cents)} - ${topup.status.toUpperCase()}`,
        title_link: `${adminUrl}/admin/stripe-topups`,
        fields: [
          {
            title: 'Amount',
            value: formatCurrency(topup.amount_cents),
            short: true,
          },
          {
            title: 'Status',
            value: topup.status.toUpperCase(),
            short: true,
          },
          ...(topup.failure_message
            ? [
                {
                  title: 'Error',
                  value: topup.failure_message,
                  short: false,
                },
              ]
            : []),
        ],
        footer: 'CGK Treasury',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }

  return sendSlackNotification(slack.webhookUrl, message)
}

/**
 * Notify about low balance
 */
export async function notifyLowBalance(
  tenantSlug: string,
  alerts: LowBalanceAlert[],
  adminUrl: string
): Promise<{ success: boolean; error?: string }> {
  const slack = await isSlackEnabled(tenantSlug)
  if (!slack.enabled || !slack.webhookUrl) {
    return { success: true }
  }

  const message: SlackMessage = {
    text: `Low Balance Alert`,
    attachments: [
      {
        fallback: `Low balance detected on ${alerts.length} provider(s)`,
        color: '#f59e0b', // Amber
        title: `Low Balance Alert`,
        title_link: `${adminUrl}/admin/treasury`,
        fields: alerts.map((alert) => ({
          title: alert.provider.charAt(0).toUpperCase() + alert.provider.slice(1),
          value: `Current: ${formatCurrency(alert.current_cents)} / Threshold: ${formatCurrency(alert.threshold_cents)}`,
          short: true,
        })),
        footer: 'CGK Treasury',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }

  return sendSlackNotification(slack.webhookUrl, message)
}

/**
 * Send a custom notification
 */
export async function notifyCustom(
  tenantSlug: string,
  title: string,
  text: string,
  color: 'success' | 'warning' | 'error' | 'info' = 'info',
  fields?: { title: string; value: string; short?: boolean }[]
): Promise<{ success: boolean; error?: string }> {
  const slack = await isSlackEnabled(tenantSlug)
  if (!slack.enabled || !slack.webhookUrl) {
    return { success: true }
  }

  const colorMap = {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  }

  const message: SlackMessage = {
    text: title,
    attachments: [
      {
        fallback: text,
        color: colorMap[color],
        title,
        text,
        fields,
        footer: 'CGK Treasury',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }

  return sendSlackNotification(slack.webhookUrl, message)
}
