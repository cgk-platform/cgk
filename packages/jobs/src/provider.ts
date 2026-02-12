/**
 * Job Provider Abstraction Layer
 *
 * Vendor-agnostic interface for background job processing.
 * Supports Trigger.dev (recommended) or Inngest as providers.
 *
 * @ai-pattern job-provider
 * @ai-note All events require tenantId in payload for isolation
 */

import type { TenantEvent, JobEvents, ScheduleDefinition } from './events'

/**
 * Job execution context provided to handlers
 */
export interface JobContext<T = unknown> {
  /** Unique job execution ID */
  id: string
  /** Job/event name */
  name: string
  /** Event payload with tenantId */
  payload: T
  /** Current attempt number (1-based) */
  attempt: number
  /** Maximum allowed attempts */
  maxAttempts: number
  /** Timestamp when job was queued */
  queuedAt: Date
  /** Timestamp when job started executing */
  startedAt: Date
}

/**
 * Job handler function type
 */
export type JobHandler<T, R = void> = (ctx: JobContext<T>) => Promise<R>

/**
 * Job definition for registration
 */
export interface JobDefinitionConfig<T extends TenantEvent<unknown>> {
  /** Unique job identifier */
  id: string
  /** Human-readable name */
  name?: string
  /** Maximum retry attempts */
  maxAttempts?: number
  /** Retry configuration */
  retry?: {
    /** Maximum retry attempts */
    maxAttempts?: number
    /** Initial delay in ms */
    initialDelay?: number
    /** Maximum delay in ms */
    maxDelay?: number
    /** Backoff strategy */
    backoff?: 'fixed' | 'exponential'
    /** Multiplier for exponential backoff */
    factor?: number
  }
  /** Timeout in ms */
  timeout?: number
  /** Concurrency limit */
  concurrency?: number
  /** Handler function */
  handler: JobHandler<T>
}

/**
 * Scheduled job definition
 */
export interface ScheduledJobConfig<T extends TenantEvent<unknown>> {
  /** Unique job identifier */
  id: string
  /** Cron expression */
  cron: string
  /** Timezone for cron (default: UTC) */
  timezone?: string
  /** Handler function */
  handler: JobHandler<T>
  /** Retry configuration */
  retry?: JobDefinitionConfig<T>['retry']
}

/**
 * Job send options
 */
export interface SendOptions {
  /** Delay before execution (ms) */
  delay?: number
  /** Scheduled execution time */
  scheduledFor?: Date
  /** Idempotency key to prevent duplicates */
  idempotencyKey?: string
  /** Maximum retry attempts (overrides job default) */
  maxAttempts?: number
  /** Queue/priority hint */
  queue?: string
}

/**
 * Result of sending a job
 */
export interface SendResult {
  /** Unique run/execution ID */
  id: string
  /** Whether the job was accepted */
  accepted: boolean
}

/**
 * Batch send result
 */
export interface BatchSendResult {
  /** Number of successfully queued jobs */
  queued: number
  /** Number of failed jobs */
  failed: number
  /** Individual results */
  results: Array<{
    index: number
    success: boolean
    id?: string
    error?: string
  }>
}

/**
 * Job execution result for orchestration
 */
export interface WaitResult<R = unknown> {
  /** Whether execution completed successfully */
  success: boolean
  /** Return value from handler */
  data?: R
  /** Error if failed */
  error?: {
    message: string
    code?: string
  }
}

/**
 * Job provider interface - vendor agnostic
 *
 * Implementations:
 * - TriggerDevProvider (recommended)
 * - InngestProvider
 * - LocalProvider (development)
 */
export interface JobProvider {
  /** Provider name for logging/debugging */
  readonly name: string

  /** Provider version */
  readonly version: string

  /**
   * Send a single job event
   * @param event - Event name from JobEvents
   * @param payload - Event payload (must include tenantId)
   * @param options - Send options
   */
  send<E extends keyof JobEvents>(
    event: E,
    payload: JobEvents[E],
    options?: SendOptions
  ): Promise<SendResult>

  /**
   * Send multiple job events atomically
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
   * Trigger a job and wait for completion (orchestration)
   * Use sparingly - prefer async where possible
   * @param event - Event name
   * @param payload - Event payload
   * @param timeout - Maximum wait time in ms
   */
  triggerAndWait<E extends keyof JobEvents, R = void>(
    event: E,
    payload: JobEvents[E],
    timeout?: number
  ): Promise<WaitResult<R>>

  /**
   * Cancel a running or scheduled job
   * @param runId - Job run ID to cancel
   */
  cancel(runId: string): Promise<boolean>

  /**
   * Get the status of a job run
   * @param runId - Job run ID
   */
  getRunStatus(runId: string): Promise<{
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
    startedAt?: Date
    completedAt?: Date
    error?: string
  }>

  /**
   * Register a job handler (used in development/local mode)
   * In production, handlers are registered via task definitions
   */
  registerHandler<E extends keyof JobEvents>(
    event: E,
    handler: JobHandler<JobEvents[E]>
  ): void

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean

  /**
   * Get provider health status
   */
  healthCheck(): Promise<{
    healthy: boolean
    latency?: number
    error?: string
  }>
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Provider type */
  provider: 'trigger.dev' | 'inngest' | 'local'

  /** Trigger.dev specific config */
  triggerDev?: {
    /** API URL (defaults to cloud) */
    apiUrl?: string
    /** Project ref/ID */
    projectRef?: string
    /** Secret key for authentication */
    secretKey?: string
  }

  /** Inngest specific config */
  inngest?: {
    /** Event key for sending */
    eventKey?: string
    /** Signing key for handlers */
    signingKey?: string
    /** Base URL */
    baseUrl?: string
  }

  /** Local provider config */
  local?: {
    /** In-memory queue size limit */
    maxQueueSize?: number
    /** Poll interval in ms */
    pollInterval?: number
    /** Concurrency limit */
    concurrency?: number
  }

  /** Development mode flag */
  isDevelopment?: boolean
}

/**
 * Validate that an event payload has the required tenantId
 */
export function validateTenantId<T extends TenantEvent<unknown>>(
  event: string,
  payload: T
): asserts payload is T {
  if (!payload.tenantId) {
    throw new Error(
      `[JobProvider] Event "${event}" requires tenantId in payload. ` +
        `Tenant isolation is mandatory - see TENANT-ISOLATION.md`
    )
  }

  if (typeof payload.tenantId !== 'string' || payload.tenantId.trim() === '') {
    throw new Error(
      `[JobProvider] Event "${event}" has invalid tenantId: "${payload.tenantId}". ` +
        `tenantId must be a non-empty string.`
    )
  }
}

/**
 * Schedule configuration from events
 */
export const SCHEDULES: Record<string, ScheduleDefinition> = {
  // Hourly jobs
  'ab.hourlyMetrics': { cron: '15 * * * *', timezone: 'UTC' },
  'ab.optimization': { cron: '*/15 * * * *', timezone: 'UTC' },
  'ab.orderReconciliation': { cron: '15 * * * *', timezone: 'UTC' },
  'ab.testScheduler': { cron: '*/5 * * * *', timezone: 'UTC' },

  // Daily jobs
  'ab.nightlyReconciliation': { cron: '0 2 * * *', timezone: 'America/New_York' },
  'ab.dailySummary': { cron: '0 8 * * *', timezone: 'America/New_York' },
  'attribution.dailyMetrics': { cron: '10 2 * * *', timezone: 'UTC' },
  'attribution.mlTraining': { cron: '0 4 * * *', timezone: 'UTC' },
  'subscription.dailyBilling': { cron: '0 6 * * *', timezone: 'UTC' },
  'subscription.analytics': { cron: '0 8 * * *', timezone: 'UTC' },
  'ops.dailyCleanup': { cron: '0 3 * * *', timezone: 'UTC' },
  'digest.adminDaily': { cron: '0 8 * * 1-5', timezone: 'America/New_York' },
  'treasury.lowBalanceAlert': { cron: '0 9,17 * * *', timezone: 'America/New_York' },

  // Weekly jobs
  'digest.creatorWeekly': { cron: '0 10 * * 1', timezone: 'America/New_York' },
  'brandContext.staleDetection': { cron: '0 9 * * 1', timezone: 'UTC' },

  // Monthly jobs
  'payout.monthlySummary': { cron: '0 9 1 * *', timezone: 'America/New_York' },
  'payout.monthlyPLSnapshot': { cron: '0 2 2 * *', timezone: 'America/New_York' },
} as const
