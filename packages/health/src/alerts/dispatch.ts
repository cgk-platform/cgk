/**
 * Alert dispatch system
 *
 * Sends alerts to configured channels (Slack, email, PagerDuty, webhooks).
 */

import { sql } from '@cgk-platform/db'

import type { Alert, AlertSeverity, CreateAlertPayload } from '../types.js'
import { getEnabledChannels, type SlackConfig } from './channels.js'

/**
 * Create an alert in the database
 */
export async function createAlert(payload: CreateAlertPayload): Promise<Alert> {
  const result = await sql<{
    id: string
    severity: AlertSeverity
    source: string
    service: string
    tenant_id: string | null
    metric: string | null
    current_value: number | null
    threshold_value: number | null
    title: string
    message: string
    metadata: Record<string, unknown>
    status: string
    created_at: string
    delivery_status: Record<string, string>
  }>`
    INSERT INTO public.platform_alerts (
      severity, source, service, tenant_id, metric,
      current_value, threshold_value, title, message, metadata
    )
    VALUES (
      ${payload.severity},
      ${payload.source},
      ${payload.service},
      ${payload.tenantId || null},
      ${payload.metric || null},
      ${payload.currentValue || null},
      ${payload.thresholdValue || null},
      ${payload.title},
      ${payload.message},
      ${JSON.stringify(payload.metadata || {})}
    )
    RETURNING *
  `

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to create alert')
  }

  return {
    id: row.id,
    severity: row.severity as AlertSeverity,
    source: row.source as Alert['source'],
    service: row.service,
    tenantId: row.tenant_id || undefined,
    metric: row.metric || undefined,
    currentValue: row.current_value || undefined,
    thresholdValue: row.threshold_value || undefined,
    title: row.title,
    message: row.message,
    metadata: row.metadata,
    status: row.status as Alert['status'],
    createdAt: row.created_at,
    deliveryStatus: row.delivery_status as Record<string, 'sent' | 'failed' | 'pending'>,
  }
}

/**
 * Get Slack color based on severity
 */
function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'p1':
      return '#dc2626' // Red
    case 'p2':
      return '#f59e0b' // Orange
    case 'p3':
      return '#3b82f6' // Blue
  }
}

/**
 * Send alert to Slack
 */
async function sendSlackAlert(alert: Alert, config: SlackConfig): Promise<void> {
  const color = getSeverityColor(alert.severity)

  const fields = [
    { title: 'Service', value: alert.service, short: true },
    { title: 'Tenant', value: alert.tenantSlug || 'Platform', short: true },
  ]

  if (alert.currentValue !== undefined && alert.thresholdValue !== undefined) {
    fields.push({
      title: 'Value',
      value: `${alert.currentValue} (threshold: ${alert.thresholdValue})`,
      short: true,
    })
  }

  if (alert.metric) {
    fields.push({
      title: 'Metric',
      value: alert.metric,
      short: true,
    })
  }

  await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: config.channel,
      attachments: [
        {
          color,
          title: `[${alert.severity.toUpperCase()}] ${alert.title}`,
          text: alert.message,
          fields,
          footer: 'CGK Platform Orchestrator',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    }),
  })
}

/**
 * Send alert via email
 *
 * In production, this would use a real email service (SendGrid, Postmark, etc.)
 * For now, logs the email content.
 */
async function sendEmailAlert(
  alert: Alert,
  recipients: string,
  from: string
): Promise<void> {
  // In production, integrate with email service
  console.log(`[EMAIL ALERT] To: ${recipients}, From: ${from}`)
  console.log(`Subject: [${alert.severity.toUpperCase()}] ${alert.title}`)
  console.log(`Body: ${alert.message}`)
  console.log(`Service: ${alert.service}, Tenant: ${alert.tenantSlug || 'Platform'}`)
}

/**
 * Send alert to PagerDuty
 */
async function sendPagerDutyAlert(
  alert: Alert,
  routingKey: string
): Promise<void> {
  const payload = {
    routing_key: routingKey,
    event_action: 'trigger',
    dedup_key: `${alert.service}-${alert.tenantId || 'platform'}-${alert.metric || 'health'}`,
    payload: {
      summary: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      severity: alert.severity === 'p1' ? 'critical' : 'warning',
      source: 'CGK Platform',
      component: alert.service,
      group: alert.tenantSlug || 'platform',
      custom_details: {
        message: alert.message,
        metric: alert.metric,
        currentValue: alert.currentValue,
        thresholdValue: alert.thresholdValue,
        ...alert.metadata,
      },
    },
  }

  await fetch('https://events.pagerduty.com/v2/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/**
 * Send alert to custom webhook
 */
async function sendWebhookAlert(
  alert: Alert,
  url: string,
  headers?: Record<string, string>
): Promise<void> {
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      type: 'platform_alert',
      alert: {
        id: alert.id,
        severity: alert.severity,
        service: alert.service,
        tenantId: alert.tenantId,
        tenantSlug: alert.tenantSlug,
        title: alert.title,
        message: alert.message,
        metric: alert.metric,
        currentValue: alert.currentValue,
        thresholdValue: alert.thresholdValue,
        metadata: alert.metadata,
        createdAt: alert.createdAt,
      },
    }),
  })
}

/**
 * Dispatch alert to all configured channels
 */
export async function dispatchAlert(alert: Alert): Promise<void> {
  const channels = getEnabledChannels(alert.severity)
  const results: Record<string, 'sent' | 'failed'> = {}

  await Promise.allSettled(
    channels.map(async (channel) => {
      try {
        switch (channel.type) {
          case 'dashboard':
            // Dashboard alerts are stored in DB, no additional dispatch needed
            results.dashboard = 'sent'
            break

          case 'email':
            await sendEmailAlert(
              alert,
              channel.config.recipients as string,
              (channel.config.from as string) || 'alerts@cgk.platform'
            )
            results.email = 'sent'
            break

          case 'slack':
            await sendSlackAlert(alert, channel.config as unknown as SlackConfig)
            results.slack = 'sent'
            break

          case 'pagerduty':
            await sendPagerDutyAlert(alert, channel.config.routingKey as string)
            results.pagerduty = 'sent'
            break

          case 'webhook':
            await sendWebhookAlert(
              alert,
              channel.config.url as string,
              channel.config.headers as Record<string, string> | undefined
            )
            results.webhook = 'sent'
            break
        }
      } catch (error) {
        console.error(`Failed to send ${channel.type} alert:`, error)
        results[channel.type] = 'failed'
      }
    })
  )

  // Update delivery status in database
  await sql`
    UPDATE public.platform_alerts
    SET delivery_status = ${JSON.stringify(results)}
    WHERE id = ${alert.id}
  `
}

/**
 * Create and dispatch an alert in one call
 */
export async function createAndDispatchAlert(payload: CreateAlertPayload): Promise<Alert> {
  const alert = await createAlert(payload)
  await dispatchAlert(alert)
  return alert
}
