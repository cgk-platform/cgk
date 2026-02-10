/**
 * Server-side analytics tracking
 */

import type { EventParams } from './types'

export interface ServerEvent {
  name: string
  clientId: string
  userId?: string
  params?: EventParams
  timestamp?: number
}

export interface ServerAnalyticsConfig {
  measurementId: string
  apiSecret: string
}

let serverConfig: ServerAnalyticsConfig | null = null

/**
 * Configure server-side analytics
 */
export function configureServerAnalytics(config: ServerAnalyticsConfig): void {
  serverConfig = config
}

/**
 * Track a server-side event
 */
export async function trackServerEvent(event: ServerEvent): Promise<void> {
  if (!serverConfig) {
    console.warn('Server analytics not configured. Call configureServerAnalytics first.')
    return
  }

  const payload = {
    client_id: event.clientId,
    user_id: event.userId,
    timestamp_micros: (event.timestamp ?? Date.now()) * 1000,
    events: [
      {
        name: event.name,
        params: event.params,
      },
    ],
  }

  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${serverConfig.measurementId}&api_secret=${serverConfig.apiSecret}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      console.error('Server analytics error:', response.status, await response.text())
    }
  } catch (error) {
    console.error('Server analytics error:', error)
  }
}

/**
 * Track server-side purchase event
 */
export async function trackServerPurchase(
  clientId: string,
  orderId: string,
  value: number,
  currency: string,
  userId?: string
): Promise<void> {
  await trackServerEvent({
    name: 'purchase',
    clientId,
    userId,
    params: {
      transaction_id: orderId,
      value,
      currency,
    },
  })
}
