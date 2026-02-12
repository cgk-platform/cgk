/**
 * Inngest Provider
 *
 * Alternative job provider using Inngest.
 * Good option if Trigger.dev doesn't meet requirements.
 *
 * Features:
 * - Event-driven architecture
 * - Step functions for complex workflows
 * - Built-in retries
 * - Local dev server
 *
 * @ai-pattern job-provider-inngest
 * @see https://www.inngest.com/docs
 */

import type {
  JobProvider,
  JobHandler,
  SendOptions,
  SendResult,
  BatchSendResult,
  WaitResult,
} from '../provider'
import type { JobEvents } from '../events'
import { createJobId } from '../utils'

interface InngestConfig {
  /** Event key for sending */
  eventKey?: string
  /** Signing key for handlers */
  signingKey?: string
  /** Base URL */
  baseUrl?: string
}

/**
 * Create an Inngest job provider
 */
export function createInngestProvider(config: InngestConfig): JobProvider {
  const {
    eventKey,
    signingKey,
    baseUrl = 'https://inn.gs',
  } = config

  const handlers = new Map<string, JobHandler<unknown, unknown>>()

  /**
   * Check if provider is configured
   */
  function isConfigured(): boolean {
    return Boolean(eventKey)
  }

  /**
   * Send event to Inngest
   */
  async function sendEvent(
    name: string,
    data: unknown,
    options?: SendOptions
  ): Promise<{ ids: string[] }> {
    if (!eventKey) {
      throw new Error(
        '[InngestProvider] Not configured. Set INNGEST_EVENT_KEY environment variable.'
      )
    }

    const event: Record<string, unknown> = {
      name,
      data,
    }

    if (options?.idempotencyKey) {
      event.id = options.idempotencyKey
    }

    if (options?.scheduledFor) {
      event.ts = Math.floor(options.scheduledFor.getTime() / 1000)
    } else if (options?.delay) {
      event.ts = Math.floor((Date.now() + options.delay) / 1000)
    }

    const response = await fetch(`${baseUrl}/e/${eventKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events: [event] }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`[InngestProvider] API error ${response.status}: ${error}`)
    }

    const result = await response.json() as { ids: string[] }
    return result
  }

  return {
    name: 'inngest',
    version: '3.0.0',

    async send<E extends keyof JobEvents>(
      event: E,
      payload: JobEvents[E],
      options?: SendOptions
    ): Promise<SendResult> {
      // For development without Inngest configured
      if (!isConfigured()) {
        console.warn(
          `[InngestProvider] Not configured - job ${event as string} will be logged only`
        )
        const id = options?.idempotencyKey ?? createJobId()
        console.log(`[InngestProvider] Would send:`, {
          event,
          payload,
          options,
        })
        return { id, accepted: true }
      }

      try {
        const result = await sendEvent(event as string, payload, options)
        return { id: result.ids[0] ?? createJobId(), accepted: true }
      } catch (error) {
        console.error(
          `[InngestProvider] Failed to send ${event as string}:`,
          error
        )
        throw error
      }
    },

    async sendBatch(
      events: Array<{
        event: keyof JobEvents
        payload: JobEvents[keyof JobEvents]
        options?: SendOptions
      }>
    ): Promise<BatchSendResult> {
      if (!isConfigured()) {
        // Log-only mode
        return {
          queued: events.length,
          failed: 0,
          results: events.map((_, index) => ({
            index,
            success: true,
            id: createJobId(),
          })),
        }
      }

      // Inngest supports batch sending natively
      const eventPayloads = events.map(({ event, payload, options }) => {
        const evt: Record<string, unknown> = {
          name: event as string,
          data: payload,
        }

        if (options?.idempotencyKey) {
          evt.id = options.idempotencyKey
        }

        if (options?.scheduledFor) {
          evt.ts = Math.floor(options.scheduledFor.getTime() / 1000)
        } else if (options?.delay) {
          evt.ts = Math.floor((Date.now() + options.delay) / 1000)
        }

        return evt
      })

      try {
        const response = await fetch(`${baseUrl}/e/${eventKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events: eventPayloads }),
        })

        if (!response.ok) {
          throw new Error(`API error ${response.status}`)
        }

        const result = await response.json() as { ids: string[] }

        return {
          queued: events.length,
          failed: 0,
          results: events.map((_, index) => ({
            index,
            success: true,
            id: result.ids[index] ?? createJobId(),
          })),
        }
      } catch (error) {
        // Fallback to individual sends
        const results: BatchSendResult['results'] = []
        let queued = 0
        let failed = 0

        for (let i = 0; i < events.length; i++) {
          const { event, payload, options } = events[i]!
          try {
            const result = await this.send(event, payload, options)
            results.push({ index: i, success: true, id: result.id })
            queued++
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e)
            results.push({ index: i, success: false, error: errorMessage })
            failed++
          }
        }

        return { queued, failed, results }
      }
    },

    async triggerAndWait<E extends keyof JobEvents, R = void>(
      _event: E,
      _payload: JobEvents[E],
      _timeout?: number
    ): Promise<WaitResult<R>> {
      // Inngest uses step functions for orchestration
      // triggerAndWait is achieved via step.invoke() inside a function
      // The REST API doesn't support synchronous waiting
      console.warn(
        '[InngestProvider] triggerAndWait not supported via API. ' +
          'Use step.invoke() inside an Inngest function for orchestration.'
      )

      return {
        success: false,
        error: {
          message:
            'triggerAndWait not supported via Inngest API. Use step.invoke() inside functions.',
        },
      }
    },

    async cancel(runId: string): Promise<boolean> {
      if (!isConfigured() || !signingKey) {
        console.warn('[InngestProvider] Cannot cancel - not fully configured')
        return false
      }

      try {
        // Inngest uses the signing key for authenticated operations
        const response = await fetch(`${baseUrl}/v1/runs/${runId}/cancel`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${signingKey}`,
          },
        })

        return response.ok
      } catch {
        return false
      }
    },

    async getRunStatus(runId: string) {
      if (!isConfigured() || !signingKey) {
        return { status: 'completed' as const }
      }

      try {
        const response = await fetch(`${baseUrl}/v1/runs/${runId}`, {
          headers: {
            Authorization: `Bearer ${signingKey}`,
          },
        })

        if (!response.ok) {
          return { status: 'completed' as const }
        }

        const result = await response.json() as {
          status: string
          started_at?: string
          ended_at?: string
          output?: { error?: string }
        }

        const statusMap: Record<string, 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'> = {
          Scheduled: 'pending',
          Running: 'running',
          Completed: 'completed',
          Failed: 'failed',
          Cancelled: 'cancelled',
        }

        return {
          status: statusMap[result.status] ?? 'completed',
          startedAt: result.started_at ? new Date(result.started_at) : undefined,
          completedAt: result.ended_at ? new Date(result.ended_at) : undefined,
          error: result.output?.error,
        }
      } catch {
        return { status: 'completed' as const }
      }
    },

    registerHandler<E extends keyof JobEvents>(
      event: E,
      handler: JobHandler<JobEvents[E]>
    ): void {
      // In development/local mode, handlers are registered here
      // In production, handlers are defined using createFunction()
      handlers.set(event as string, handler as JobHandler<unknown, unknown>)
    },

    isConfigured,

    async healthCheck() {
      if (!isConfigured()) {
        return {
          healthy: false,
          error: 'Not configured - set INNGEST_EVENT_KEY',
        }
      }

      const start = Date.now()

      try {
        // Send a no-op event to test connectivity
        const response = await fetch(`${baseUrl}/e/${eventKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            events: [
              {
                name: 'health.check',
                data: { timestamp: new Date().toISOString() },
              },
            ],
          }),
        })

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`)
        }

        return {
          healthy: true,
          latency: Date.now() - start,
        }
      } catch (error) {
        return {
          healthy: false,
          error: error instanceof Error ? error.message : 'Health check failed',
        }
      }
    },
  }
}

/**
 * Helper to define an Inngest function with proper types
 *
 * @example
 * // In your function file (e.g., src/inngest/order-created.ts)
 * import { inngest } from './client'
 * import { defineInngestFunction } from '@cgk/jobs'
 *
 * export const orderCreatedFn = defineInngestFunction('order.created', {
 *   handler: async ({ event, step }) => {
 *     const { tenantId, orderId } = event.data
 *     // Process order...
 *   }
 * })
 */
export function defineInngestFunction<E extends keyof JobEvents>(
  event: E,
  options: {
    handler: (ctx: {
      event: { name: E; data: JobEvents[E] }
      step: {
        run: <T>(id: string, fn: () => Promise<T>) => Promise<T>
        sleep: (id: string, duration: string | number) => Promise<void>
        sleepUntil: (id: string, time: Date | string) => Promise<void>
        invoke: <T>(id: string, fn: { function: unknown; data: unknown }) => Promise<T>
      }
    }) => Promise<void>
    retries?: number
    concurrency?: number
    rateLimit?: {
      limit: number
      period: string
    }
  }
): {
  id: string
  event: E
  options: typeof options
} {
  const functionId = (event as string).replace(/\./g, '-')

  return {
    id: functionId,
    event,
    options,
  }
}
