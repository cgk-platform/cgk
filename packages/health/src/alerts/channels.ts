/**
 * Alert channel configuration and defaults
 */

import type { AlertChannel, AlertSeverity } from '../types.js'

/**
 * Slack webhook configuration
 */
export interface SlackConfig {
  webhookUrl: string
  channel?: string
}

/**
 * Email configuration
 */
export interface EmailConfig {
  recipients: string
  from?: string
}

/**
 * PagerDuty configuration
 */
export interface PagerDutyConfig {
  routingKey: string
  serviceId?: string
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  url: string
  headers?: Record<string, string>
}

/**
 * Get default alert channels from environment
 */
export function getDefaultChannels(): AlertChannel[] {
  const channels: AlertChannel[] = []

  // Dashboard always enabled
  channels.push({
    type: 'dashboard',
    enabled: true,
    config: {},
    severities: ['p1', 'p2', 'p3'],
  })

  // Email if configured
  const emailRecipients = process.env.ALERT_EMAIL_RECIPIENTS
  if (emailRecipients) {
    channels.push({
      type: 'email',
      enabled: true,
      config: {
        recipients: emailRecipients,
        from: process.env.ALERT_EMAIL_FROM || 'alerts@cgk.platform',
      },
      severities: ['p1', 'p2'],
    })
  }

  // Slack if configured
  const slackWebhook = process.env.SLACK_WEBHOOK_URL
  if (slackWebhook) {
    channels.push({
      type: 'slack',
      enabled: true,
      config: {
        webhookUrl: slackWebhook,
        channel: process.env.SLACK_ALERT_CHANNEL || '#platform-alerts',
      },
      severities: ['p1', 'p2', 'p3'],
    })
  }

  // PagerDuty if configured (P1 only by default)
  const pagerDutyKey = process.env.PAGERDUTY_ROUTING_KEY
  if (pagerDutyKey) {
    const pagerDutyConfig: Record<string, string> = {
      routingKey: pagerDutyKey,
    }
    const pagerDutyServiceId = process.env.PAGERDUTY_SERVICE_ID
    if (pagerDutyServiceId) {
      pagerDutyConfig.serviceId = pagerDutyServiceId
    }
    channels.push({
      type: 'pagerduty',
      enabled: true,
      config: pagerDutyConfig,
      severities: ['p1'],
    })
  }

  // Custom webhook if configured
  const webhookUrl = process.env.ALERT_WEBHOOK_URL
  if (webhookUrl) {
    channels.push({
      type: 'webhook',
      enabled: true,
      config: {
        url: webhookUrl,
      },
      severities: ['p1', 'p2'],
    })
  }

  return channels
}

/**
 * Get enabled channels for a specific severity
 */
export function getEnabledChannels(severity: AlertSeverity): AlertChannel[] {
  const channels = getDefaultChannels()
  return channels.filter(
    (channel) => channel.enabled && channel.severities.includes(severity)
  )
}

/**
 * Check if any alert channels are configured
 */
export function hasAlertChannels(): boolean {
  return getDefaultChannels().length > 1 // More than just dashboard
}

/**
 * Validate channel configuration
 */
export function validateChannel(channel: AlertChannel): { valid: boolean; error?: string } {
  switch (channel.type) {
    case 'dashboard':
      return { valid: true }

    case 'email':
      if (!channel.config.recipients) {
        return { valid: false, error: 'Email recipients required' }
      }
      return { valid: true }

    case 'slack':
      if (!channel.config.webhookUrl) {
        return { valid: false, error: 'Slack webhook URL required' }
      }
      return { valid: true }

    case 'pagerduty':
      if (!channel.config.routingKey) {
        return { valid: false, error: 'PagerDuty routing key required' }
      }
      return { valid: true }

    case 'webhook':
      if (!channel.config.url) {
        return { valid: false, error: 'Webhook URL required' }
      }
      try {
        const webhookUrl = channel.config.url
        if (!webhookUrl) {
          return { valid: false, error: 'Webhook URL required' }
        }
        new URL(webhookUrl)
        return { valid: true }
      } catch {
        return { valid: false, error: 'Invalid webhook URL' }
      }

    default:
      return { valid: false, error: 'Unknown channel type' }
  }
}
