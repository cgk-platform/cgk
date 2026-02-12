/**
 * Local Job Provider
 *
 * In-memory job processing for development and testing.
 * Jobs are processed immediately in the same process.
 *
 * NOT suitable for production - use Trigger.dev or Inngest.
 *
 * @ai-pattern job-provider-local
 */

import type {
  JobProvider,
  JobHandler,
  JobContext,
  SendOptions,
  SendResult,
  BatchSendResult,
  WaitResult,
} from '../provider'
import type { JobEvents } from '../events'
import { createJobId } from '../utils'

interface LocalProviderConfig {
  /** Maximum queue size */
  maxQueueSize?: number
  /** Poll interval in ms */
  pollInterval?: number
  /** Concurrent job limit */
  concurrency?: number
}

interface QueuedJob {
  id: string
  event: string
  payload: unknown
  options?: SendOptions
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  attempts: number
  maxAttempts: number
  scheduledFor?: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
  result?: unknown
}

/**
 * Create a local in-memory job provider
 */
export function createLocalProvider(config: LocalProviderConfig = {}): JobProvider {
  const {
    maxQueueSize = 10000,
    pollInterval = 100,
    concurrency = 5,
  } = config

  const handlers = new Map<string, JobHandler<unknown, unknown>>()
  const jobs = new Map<string, QueuedJob>()
  const pendingWaits = new Map<
    string,
    {
      resolve: (result: WaitResult<unknown>) => void
      reject: (error: Error) => void
      timeout?: ReturnType<typeof setTimeout>
    }
  >()

  let isProcessing = false
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let activeJobs = 0

  /**
   * Start the job processor
   */
  function startProcessor(): void {
    if (isProcessing) return
    isProcessing = true
    poll()
  }

  /**
   * Poll for pending jobs
   */
  async function poll(): Promise<void> {
    if (!isProcessing) return

    const now = new Date()
    const pendingJobs: QueuedJob[] = []

    for (const job of jobs.values()) {
      if (
        job.status === 'pending' &&
        (!job.scheduledFor || job.scheduledFor <= now) &&
        pendingJobs.length < concurrency - activeJobs
      ) {
        pendingJobs.push(job)
      }
    }

    // Process jobs concurrently
    await Promise.all(pendingJobs.map(processJob))

    // Schedule next poll
    pollTimer = setTimeout(poll, pollInterval)
  }

  /**
   * Process a single job
   */
  async function processJob(job: QueuedJob): Promise<void> {
    const handler = handlers.get(job.event)

    if (!handler) {
      console.warn(`[LocalProvider] No handler for event: ${job.event}`)
      job.status = 'failed'
      job.error = `No handler registered for event: ${job.event}`
      job.completedAt = new Date()
      resolvePendingWait(job.id, {
        success: false,
        error: { message: job.error },
      })
      return
    }

    job.status = 'running'
    job.startedAt = new Date()
    job.attempts++
    activeJobs++

    const ctx: JobContext<unknown> = {
      id: job.id,
      name: job.event,
      payload: job.payload,
      attempt: job.attempts,
      maxAttempts: job.maxAttempts,
      queuedAt: job.scheduledFor ?? new Date(),
      startedAt: job.startedAt,
    }

    try {
      const result = await handler(ctx)
      job.status = 'completed'
      job.completedAt = new Date()
      job.result = result

      resolvePendingWait(job.id, {
        success: true,
        data: result,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (job.attempts < job.maxAttempts) {
        // Retry
        job.status = 'pending'
        job.error = errorMessage
        console.log(
          `[LocalProvider] Job ${job.id} failed (attempt ${job.attempts}/${job.maxAttempts}): ${errorMessage}`
        )
      } else {
        // Final failure
        job.status = 'failed'
        job.completedAt = new Date()
        job.error = errorMessage

        resolvePendingWait(job.id, {
          success: false,
          error: { message: errorMessage },
        })
      }
    } finally {
      activeJobs--
    }
  }

  /**
   * Resolve a pending triggerAndWait call
   */
  function resolvePendingWait(jobId: string, result: WaitResult<unknown>): void {
    const pending = pendingWaits.get(jobId)
    if (pending) {
      if (pending.timeout) {
        clearTimeout(pending.timeout)
      }
      pending.resolve(result)
      pendingWaits.delete(jobId)
    }
  }

  /**
   * Stop the processor (for cleanup)
   */
  function stopProcessor(): void {
    isProcessing = false
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  // Auto-start processor
  startProcessor()

  return {
    name: 'local',
    version: '1.0.0',

    async send<E extends keyof JobEvents>(
      event: E,
      payload: JobEvents[E],
      options?: SendOptions
    ): Promise<SendResult> {
      if (jobs.size >= maxQueueSize) {
        throw new Error(
          `[LocalProvider] Queue full (max ${maxQueueSize} jobs)`
        )
      }

      const id = options?.idempotencyKey ?? createJobId()

      // Check for duplicate idempotency key
      if (options?.idempotencyKey && jobs.has(id)) {
        return { id, accepted: true }
      }

      const job: QueuedJob = {
        id,
        event: event as string,
        payload,
        options,
        status: 'pending',
        attempts: 0,
        maxAttempts: options?.maxAttempts ?? 3,
        scheduledFor: options?.scheduledFor ?? (
          options?.delay
            ? new Date(Date.now() + options.delay)
            : undefined
        ),
      }

      jobs.set(id, job)

      return { id, accepted: true }
    },

    async sendBatch(
      events: Array<{
        event: keyof JobEvents
        payload: JobEvents[keyof JobEvents]
        options?: SendOptions
      }>
    ): Promise<BatchSendResult> {
      const results: BatchSendResult['results'] = []
      let queued = 0
      let failed = 0

      for (let i = 0; i < events.length; i++) {
        const { event, payload, options } = events[i]!
        try {
          const result = await this.send(event, payload, options)
          results.push({ index: i, success: true, id: result.id })
          queued++
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          results.push({ index: i, success: false, error: errorMessage })
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
      const result = await this.send(event, payload)

      return new Promise((resolve, reject) => {
        const timeoutMs = timeout ?? 30000

        const timeoutId = setTimeout(() => {
          pendingWaits.delete(result.id)
          resolve({
            success: false,
            error: { message: `Job timed out after ${timeoutMs}ms` },
          })
        }, timeoutMs)

        pendingWaits.set(result.id, {
          resolve: resolve as (result: WaitResult<unknown>) => void,
          reject,
          timeout: timeoutId,
        })
      })
    },

    async cancel(runId: string): Promise<boolean> {
      const job = jobs.get(runId)
      if (!job) return false

      if (job.status === 'pending') {
        job.status = 'cancelled'
        job.completedAt = new Date()
        return true
      }

      return false
    },

    async getRunStatus(runId: string) {
      const job = jobs.get(runId)
      if (!job) {
        return { status: 'completed' as const }
      }

      return {
        status: job.status as 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
      }
    },

    registerHandler<E extends keyof JobEvents>(
      event: E,
      handler: JobHandler<JobEvents[E]>
    ): void {
      handlers.set(event as string, handler as JobHandler<unknown, unknown>)
    },

    isConfigured(): boolean {
      return true
    },

    async healthCheck() {
      return {
        healthy: true,
        latency: 0,
      }
    },

    // Extended method for testing/cleanup
    stop: stopProcessor,
  } as JobProvider & { stop: () => void }
}
