/**
 * Trigger.dev Provider
 *
 * Production-ready job provider using Trigger.dev v4.
 * Recommended for CGK platform based on RAWDOG institutional knowledge.
 *
 * Features:
 * - Cloud-hosted or self-hostable
 * - Built-in retries with backoff
 * - triggerAndWait for orchestration
 * - Excellent developer experience
 *
 * @ai-pattern job-provider-trigger-dev
 * @see https://trigger.dev/docs
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

interface TriggerDevConfig {
  /** API URL (defaults to cloud) */
  apiUrl?: string
  /** Project ref/ID */
  projectRef?: string
  /** Secret key for authentication */
  secretKey?: string
}

/**
 * Create a Trigger.dev job provider
 */
export function createTriggerDevProvider(config: TriggerDevConfig): JobProvider {
  const {
    apiUrl = 'https://api.trigger.dev',
    projectRef,
    secretKey,
  } = config

  const handlers = new Map<string, JobHandler<unknown, unknown>>()

  /**
   * Check if provider is configured
   */
  function isConfigured(): boolean {
    return Boolean(secretKey)
  }

  /**
   * Make API request to Trigger.dev
   */
  async function apiRequest<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    if (!secretKey) {
      throw new Error(
        '[TriggerDevProvider] Not configured. Set TRIGGER_SECRET_KEY environment variable.'
      )
    }

    const url = `${apiUrl}${path}`

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
        ...(projectRef && { 'x-trigger-project-ref': projectRef }),
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(
        `[TriggerDevProvider] API error ${response.status}: ${error}`
      )
    }

    return response.json() as Promise<T>
  }

  /**
   * Trigger a task via the API
   * In production, tasks are defined using @trigger.dev/sdk
   */
  async function triggerTask(
    taskId: string,
    payload: unknown,
    options?: SendOptions
  ): Promise<{ id: string }> {
    // Map event name to Trigger.dev task ID format
    const normalizedTaskId = taskId.replace(/\./g, '-')

    const requestBody: Record<string, unknown> = {
      payload,
    }

    if (options?.delay) {
      requestBody.delay = `${options.delay}ms`
    }

    if (options?.scheduledFor) {
      requestBody.timestamp = options.scheduledFor.toISOString()
    }

    if (options?.idempotencyKey) {
      requestBody.idempotencyKey = options.idempotencyKey
    }

    if (options?.queue) {
      requestBody.queue = { name: options.queue }
    }

    // Use the Trigger.dev v4 SDK pattern
    // In production, this would use: task.trigger(payload, options)
    // For API-only usage, we use the REST endpoint
    const result = await apiRequest<{ id: string }>(
      'POST',
      `/api/v1/tasks/${normalizedTaskId}/trigger`,
      requestBody
    )

    return result
  }

  return {
    name: 'trigger.dev',
    version: '4.0.0',

    async send<E extends keyof JobEvents>(
      event: E,
      payload: JobEvents[E],
      options?: SendOptions
    ): Promise<SendResult> {
      // For development without Trigger.dev configured
      if (!isConfigured()) {
        console.warn(
          `[TriggerDevProvider] Not configured - job ${event as string} will be logged only`
        )
        const id = options?.idempotencyKey ?? createJobId()
        console.log(`[TriggerDevProvider] Would send:`, {
          event,
          payload,
          options,
        })
        return { id, accepted: true }
      }

      try {
        const result = await triggerTask(event as string, payload, options)
        return { id: result.id, accepted: true }
      } catch (error) {
        console.error(
          `[TriggerDevProvider] Failed to send ${event as string}:`,
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
      // Trigger.dev supports batch triggering via batchTrigger
      // For now, we send individually (can be optimized)
      const results: BatchSendResult['results'] = []
      let queued = 0
      let failed = 0

      // Process in parallel for better performance
      const promises = events.map(async ({ event, payload, options }, index) => {
        try {
          const result = await this.send(event, payload, options)
          return { index, success: true, id: result.id }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          return { index, success: false, error: errorMessage }
        }
      })

      const settled = await Promise.all(promises)

      for (const result of settled) {
        results.push(result)
        if (result.success) {
          queued++
        } else {
          failed++
        }
      }

      return { queued, failed, results }
    },

    async triggerAndWait<E extends keyof JobEvents, R = void>(
      event: E,
      payload: JobEvents[E],
      timeout?: number
    ): Promise<WaitResult<R>> {
      if (!isConfigured()) {
        console.warn(
          `[TriggerDevProvider] Not configured - triggerAndWait for ${event as string} will fail`
        )
        return {
          success: false,
          error: { message: 'Trigger.dev not configured' },
        }
      }

      const normalizedTaskId = (event as string).replace(/\./g, '-')

      try {
        // Use triggerAndPoll endpoint (Trigger.dev v4 pattern)
        const result = await apiRequest<{
          id: string
          status: string
          output?: R
          error?: { message: string }
        }>(
          'POST',
          `/api/v1/tasks/${normalizedTaskId}/trigger-and-poll`,
          {
            payload,
            timeout: timeout ?? 30000,
          }
        )

        if (result.status === 'COMPLETED') {
          return { success: true, data: result.output }
        }

        return {
          success: false,
          error: result.error ?? { message: `Task ${result.status}` },
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        return {
          success: false,
          error: { message: errorMessage },
        }
      }
    },

    async cancel(runId: string): Promise<boolean> {
      if (!isConfigured()) {
        console.warn('[TriggerDevProvider] Not configured - cannot cancel')
        return false
      }

      try {
        await apiRequest('POST', `/api/v1/runs/${runId}/cancel`, {})
        return true
      } catch {
        return false
      }
    },

    async getRunStatus(runId: string) {
      if (!isConfigured()) {
        return { status: 'completed' as const }
      }

      try {
        const result = await apiRequest<{
          status: string
          startedAt?: string
          completedAt?: string
          error?: { message: string }
        }>('GET', `/api/v1/runs/${runId}`)

        const statusMap: Record<string, 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'> = {
          PENDING: 'pending',
          QUEUED: 'pending',
          EXECUTING: 'running',
          COMPLETED: 'completed',
          FAILED: 'failed',
          CANCELED: 'cancelled',
        }

        return {
          status: statusMap[result.status] ?? 'completed',
          startedAt: result.startedAt ? new Date(result.startedAt) : undefined,
          completedAt: result.completedAt
            ? new Date(result.completedAt)
            : undefined,
          error: result.error?.message,
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
      // In production, handlers are defined using @trigger.dev/sdk task()
      handlers.set(event as string, handler as JobHandler<unknown, unknown>)
    },

    isConfigured,

    async healthCheck() {
      if (!isConfigured()) {
        return {
          healthy: false,
          error: 'Not configured - set TRIGGER_SECRET_KEY',
        }
      }

      const start = Date.now()

      try {
        await apiRequest('GET', '/api/v1/ping')
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
 * Helper to define a Trigger.dev task with proper types
 *
 * @example
 * // In your task file (e.g., src/trigger/order-created.ts)
 * import { task } from '@trigger.dev/sdk/v3'
 * import { defineTriggerTask } from '@cgk/jobs'
 *
 * export const orderCreatedTask = defineTriggerTask('order.created', {
 *   handler: async (ctx) => {
 *     const { tenantId, orderId } = ctx.payload
 *     // Process order...
 *   }
 * })
 */
export function defineTriggerTask<E extends keyof JobEvents>(
  event: E,
  options: {
    handler: (ctx: {
      id: string
      payload: JobEvents[E]
      attempt: number
    }) => Promise<void>
    retry?: {
      maxAttempts?: number
      factor?: number
      minTimeoutInMs?: number
      maxTimeoutInMs?: number
    }
    queue?: {
      name: string
      concurrencyLimit?: number
    }
  }
): {
  id: string
  event: E
  options: typeof options
} {
  const taskId = (event as string).replace(/\./g, '-')

  return {
    id: taskId,
    event,
    options,
  }
}
