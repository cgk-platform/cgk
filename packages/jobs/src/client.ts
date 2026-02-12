/**
 * Job Client
 *
 * Unified client for sending background jobs.
 * Automatically selects provider based on configuration.
 *
 * @ai-pattern job-client
 * @ai-critical All job sends require tenantId in payload
 */

import type {
  JobProvider,
  ProviderConfig,
  SendOptions,
  SendResult,
  BatchSendResult,
  WaitResult,
} from './provider'
import { validateTenantId } from './provider'
import type { JobEvents } from './events'
import { createLocalProvider } from './providers/local'
import { createTriggerDevProvider } from './providers/trigger-dev'
import { createInngestProvider } from './providers/inngest'

/**
 * Job client configuration
 */
export interface JobClientConfig extends ProviderConfig {
  /** Enable debug logging */
  debug?: boolean
  /** Default send options */
  defaults?: Partial<SendOptions>
}

/**
 * Job client instance
 */
export interface JobClient {
  /** Underlying provider */
  readonly provider: JobProvider

  /**
   * Send a job event
   * @param event - Event name
   * @param payload - Event payload (MUST include tenantId)
   * @param options - Send options
   */
  send<E extends keyof JobEvents>(
    event: E,
    payload: JobEvents[E],
    options?: SendOptions
  ): Promise<SendResult>

  /**
   * Send multiple job events
   * @param events - Array of event/payload pairs
   */
  sendBatch(
    events: Array<{
      event: keyof JobEvents
      payload: JobEvents[keyof JobEvents]
      options?: SendOptions
    }>
  ): Promise<BatchSendResult>

  /**
   * Trigger a job and wait for completion
   * Use sparingly - prefer async
   */
  triggerAndWait<E extends keyof JobEvents, R = void>(
    event: E,
    payload: JobEvents[E],
    timeout?: number
  ): Promise<WaitResult<R>>

  /**
   * Cancel a running job
   */
  cancel(runId: string): Promise<boolean>

  /**
   * Get job run status
   */
  getRunStatus(runId: string): ReturnType<JobProvider['getRunStatus']>

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean

  /**
   * Health check
   */
  healthCheck(): ReturnType<JobProvider['healthCheck']>
}

/**
 * Create a job client with the specified configuration
 */
export function createJobClient(config: JobClientConfig): JobClient {
  const provider = createProvider(config)
  const debug = config.debug ?? process.env.NODE_ENV === 'development'
  const defaults = config.defaults ?? {}

  function log(message: string, data?: unknown): void {
    if (debug) {
      console.log(`[JobClient] ${message}`, data ?? '')
    }
  }

  return {
    provider,

    async send<E extends keyof JobEvents>(
      event: E,
      payload: JobEvents[E],
      options?: SendOptions
    ): Promise<SendResult> {
      // Validate tenant isolation
      validateTenantId(event as string, payload)

      const mergedOptions = { ...defaults, ...options }

      log(`Sending event: ${event as string}`, {
        tenantId: payload.tenantId,
        options: mergedOptions,
      })

      try {
        const result = await provider.send(event, payload, mergedOptions)
        log(`Event sent: ${event as string}`, { id: result.id })
        return result
      } catch (error) {
        log(`Failed to send event: ${event as string}`, error)
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
      // Validate all payloads have tenantId
      for (const { event, payload } of events) {
        validateTenantId(event as string, payload)
      }

      const enrichedEvents = events.map((e) => ({
        ...e,
        options: { ...defaults, ...e.options },
      }))

      log(`Sending batch of ${events.length} events`)

      try {
        const result = await provider.sendBatch(enrichedEvents)
        log(`Batch sent: ${result.queued} queued, ${result.failed} failed`)
        return result
      } catch (error) {
        log('Failed to send batch', error)
        throw error
      }
    },

    async triggerAndWait<E extends keyof JobEvents, R = void>(
      event: E,
      payload: JobEvents[E],
      timeout?: number
    ): Promise<WaitResult<R>> {
      validateTenantId(event as string, payload)

      log(`Triggering and waiting: ${event as string}`, { timeout })

      try {
        const result = await provider.triggerAndWait<E, R>(event, payload, timeout)
        log(`Trigger complete: ${event as string}`, { success: result.success })
        return result
      } catch (error) {
        log(`Trigger failed: ${event as string}`, error)
        throw error
      }
    },

    async cancel(runId: string): Promise<boolean> {
      log(`Cancelling run: ${runId}`)
      return provider.cancel(runId)
    },

    getRunStatus(runId: string) {
      return provider.getRunStatus(runId)
    },

    isConfigured() {
      return provider.isConfigured()
    },

    healthCheck() {
      return provider.healthCheck()
    },
  }
}

/**
 * Create the appropriate provider based on configuration
 */
function createProvider(config: JobClientConfig): JobProvider {
  switch (config.provider) {
    case 'trigger.dev':
      return createTriggerDevProvider(config.triggerDev ?? {})

    case 'inngest':
      return createInngestProvider(config.inngest ?? {})

    case 'local':
    default:
      return createLocalProvider(config.local ?? {})
  }
}

/**
 * Default client instance (lazily initialized)
 */
let defaultClient: JobClient | null = null

/**
 * Get or create the default job client
 * Configuration is read from environment variables
 */
export function getJobClient(): JobClient {
  if (defaultClient) {
    return defaultClient
  }

  const config = getConfigFromEnv()
  defaultClient = createJobClient(config)
  return defaultClient
}

/**
 * Read job provider configuration from environment
 */
function getConfigFromEnv(): JobClientConfig {
  // Check for Trigger.dev first (recommended)
  if (process.env.TRIGGER_SECRET_KEY || process.env.TRIGGER_DEV_SECRET_KEY) {
    return {
      provider: 'trigger.dev',
      triggerDev: {
        secretKey:
          process.env.TRIGGER_SECRET_KEY || process.env.TRIGGER_DEV_SECRET_KEY,
        projectRef: process.env.TRIGGER_PROJECT_REF,
        apiUrl: process.env.TRIGGER_API_URL,
      },
      debug: process.env.NODE_ENV === 'development',
    }
  }

  // Check for Inngest
  if (process.env.INNGEST_EVENT_KEY || process.env.INNGEST_SIGNING_KEY) {
    return {
      provider: 'inngest',
      inngest: {
        eventKey: process.env.INNGEST_EVENT_KEY,
        signingKey: process.env.INNGEST_SIGNING_KEY,
        baseUrl: process.env.INNGEST_BASE_URL,
      },
      debug: process.env.NODE_ENV === 'development',
    }
  }

  // Fall back to local provider
  return {
    provider: 'local',
    local: {
      maxQueueSize: 10000,
      pollInterval: 100,
      concurrency: 5,
    },
    isDevelopment: true,
    debug: true,
  }
}

/**
 * Convenience function to send a job
 * Uses the default client
 */
export async function sendJob<E extends keyof JobEvents>(
  event: E,
  payload: JobEvents[E],
  options?: SendOptions
): Promise<SendResult> {
  return getJobClient().send(event, payload, options)
}

/**
 * Convenience function to send multiple jobs
 * Uses the default client
 */
export async function sendJobs(
  events: Array<{
    event: keyof JobEvents
    payload: JobEvents[keyof JobEvents]
    options?: SendOptions
  }>
): Promise<BatchSendResult> {
  return getJobClient().sendBatch(events)
}

/**
 * Reset the default client (for testing)
 */
export function resetJobClient(): void {
  defaultClient = null
}

/**
 * Set a custom default client (for testing)
 */
export function setJobClient(client: JobClient): void {
  defaultClient = client
}
