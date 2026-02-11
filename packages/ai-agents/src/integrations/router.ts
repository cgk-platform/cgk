/**
 * Unified event router for AI Agent integrations
 * Routes incoming events to appropriate agents and handlers
 */

import {
  queueIntegrationEvent,
  getPendingIntegrationEvents,
  updateIntegrationEventStatus,
  getSlackConfig,
  getSMSConfig,
  getAgentEmailConfig,
} from './db/queries.js'
import { handleSlackEvent } from './slack/event-handler.js'
import { handleSlackInteraction } from './slack/interactions.js'
import { handleAgentInboundEmail } from './email/sender.js'
import { handleCalendarWebhook } from './google/calendar.js'
import type {
  IntegrationChannel,
  IntegrationEvent,
  SlackEvent,
  SlackInteractionPayload,
  InboundEmail,
  TwilioWebhookPayload,
} from './types.js'

export interface EventRouterConfig {
  tenantId: string
  maxConcurrency?: number
  onError?: (event: IntegrationEvent, error: Error) => void
  onSuccess?: (event: IntegrationEvent) => void
}

export interface RouteResult {
  success: boolean
  agentId?: string
  error?: string
}

/**
 * Route incoming events to the appropriate handler
 */
export async function routeEvent(
  tenantId: string,
  channel: IntegrationChannel,
  eventType: string,
  payload: Record<string, unknown>
): Promise<RouteResult> {
  try {
    switch (channel) {
      case 'slack':
        return routeSlackEvent(tenantId, eventType, payload)

      case 'google_calendar':
        return routeCalendarEvent(tenantId, eventType, payload)

      case 'email':
        return routeEmailEvent(tenantId, eventType, payload)

      case 'sms':
        return routeSMSEvent(tenantId, eventType, payload)

      default:
        return { success: false, error: `Unknown channel: ${channel}` }
    }
  } catch (error) {
    console.error(`[router] Error routing ${channel}/${eventType}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Route Slack events
 */
async function routeSlackEvent(
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<RouteResult> {
  switch (eventType) {
    case 'event_callback':
      // Regular Slack events (messages, mentions, etc.)
      const event = payload.event as SlackEvent
      await handleSlackEvent(tenantId, event)
      return { success: true }

    case 'interaction':
      // Slack interactions (button clicks, modal submissions)
      const interactionPayload = payload as unknown as SlackInteractionPayload
      await handleSlackInteraction(tenantId, interactionPayload)
      return { success: true }

    case 'url_verification':
      // Handled by webhook endpoint directly
      return { success: true }

    default:
      // Queue unknown event types for later processing
      await queueIntegrationEvent('slack', eventType, payload)
      return { success: true }
  }
}

/**
 * Route Google Calendar events
 */
async function routeCalendarEvent(
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<RouteResult> {
  const channelId = payload.channelId as string
  const resourceId = payload.resourceId as string

  if (!channelId || !resourceId) {
    return { success: false, error: 'Missing channel or resource ID' }
  }

  await handleCalendarWebhook(channelId, resourceId)
  return { success: true }
}

/**
 * Route email events
 */
async function routeEmailEvent(
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<RouteResult> {
  switch (eventType) {
    case 'inbound':
      const email = payload as unknown as InboundEmail
      const result = await handleAgentInboundEmail(tenantId, email)
      return {
        success: result.processed,
        agentId: result.agentId,
        error: result.error,
      }

    default:
      await queueIntegrationEvent('email', eventType, payload)
      return { success: true }
  }
}

/**
 * Route SMS events
 */
async function routeSMSEvent(
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<RouteResult> {
  // SMS events are handled inline by webhook handlers
  await queueIntegrationEvent('sms', eventType, payload)
  return { success: true }
}

/**
 * Process queued events
 */
export async function processEventQueue(config: EventRouterConfig): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const events = await getPendingIntegrationEvents(config.maxConcurrency || 10)

  let processed = 0
  let succeeded = 0
  let failed = 0

  for (const event of events) {
    try {
      // Mark as processing
      await updateIntegrationEventStatus(event.id, 'processing')

      // Route the event
      const result = await routeEvent(
        config.tenantId,
        event.channel,
        event.eventType,
        event.rawPayload
      )

      if (result.success) {
        await updateIntegrationEventStatus(event.id, 'completed', {
          agentId: result.agentId,
        })
        succeeded++
        config.onSuccess?.(event)
      } else {
        await updateIntegrationEventStatus(event.id, 'failed', undefined, result.error)
        failed++
        config.onError?.(event, new Error(result.error || 'Unknown error'))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await updateIntegrationEventStatus(event.id, 'failed', undefined, errorMessage)
      failed++
      config.onError?.(event, error instanceof Error ? error : new Error(errorMessage))
    }

    processed++
  }

  return { processed, succeeded, failed }
}

/**
 * Get integration status for all channels
 */
export async function getIntegrationStatus(): Promise<{
  slack: { configured: boolean; enabled: boolean; teamName?: string }
  googleCalendar: { configured: boolean }
  email: { configured: boolean }
  sms: { configured: boolean; enabled: boolean; provider?: string }
}> {
  const [slackConfig, smsConfig] = await Promise.all([getSlackConfig(), getSMSConfig()])

  return {
    slack: {
      configured: Boolean(slackConfig?.slackBotTokenEncrypted),
      enabled: slackConfig?.enabled ?? false,
      teamName: slackConfig?.slackTeamName || undefined,
    },
    googleCalendar: {
      // Google Calendar is configured per-agent, not per-tenant
      configured: true,
    },
    email: {
      // Email configuration is per-agent
      configured: true,
    },
    sms: {
      configured: Boolean(smsConfig?.twilioAccountSidEncrypted),
      enabled: smsConfig?.enabled ?? false,
      provider: smsConfig?.provider,
    },
  }
}

/**
 * Determine which agent should handle an event
 */
export async function determineAgentForEvent(
  tenantId: string,
  channel: IntegrationChannel,
  eventData: Record<string, unknown>
): Promise<string | null> {
  switch (channel) {
    case 'slack': {
      const config = await getSlackConfig()
      if (!config) return null

      // Check channel mapping
      const slackChannel = eventData.channel as string
      if (slackChannel) {
        const channelConfig = config.channelConfig?.[slackChannel]
        if (channelConfig && 'agentId' in channelConfig) {
          return channelConfig.agentId || null
        }
      }

      return config.defaultAgentId
    }

    case 'sms': {
      const config = await getSMSConfig()
      if (!config) return null

      const toNumber = eventData.To as string
      if (toNumber) {
        const phoneConfig = config.phoneNumbers.find((p) => p.number === toNumber)
        if (phoneConfig?.agentId) {
          return phoneConfig.agentId
        }
      }

      return config.defaultAgentId
    }

    case 'email': {
      // Email routing is handled by the email module based on inbound address
      return null
    }

    case 'google_calendar': {
      // Calendar is always per-agent
      return eventData.agentId as string || null
    }

    default:
      return null
  }
}

/**
 * Create event router for background job processing
 */
export function createEventRouter(config: EventRouterConfig) {
  return {
    /**
     * Route a single event
     */
    route: (channel: IntegrationChannel, eventType: string, payload: Record<string, unknown>) =>
      routeEvent(config.tenantId, channel, eventType, payload),

    /**
     * Process pending events from queue
     */
    processQueue: () => processEventQueue(config),

    /**
     * Get integration status
     */
    getStatus: () => getIntegrationStatus(),
  }
}
