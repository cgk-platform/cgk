/**
 * Retry processor for failed email queue entries
 *
 * @ai-pattern retry-processor
 * @ai-note Handles exponential backoff retries across all queue types
 */

import type { QueueEntry, QueueType } from '../queue/types.js'
import { getRetryableEntries, scheduleRetry } from '../queue/retry.js'
import { resetStaleProcessingEntries } from '../queue/claim.js'

/**
 * Retry processor configuration
 */
export interface RetryProcessorConfig {
  /** Tenant to process for */
  tenantId: string
  /** Queue types to process (default all) */
  queueTypes?: QueueType[]
  /** Maximum entries to retry per queue type (default 20) */
  batchSize?: number
  /** Base delay for backoff calculation in minutes (default 1) */
  baseDelayMinutes?: number
  /** Consider entries stale after this many minutes (default 10) */
  staleMinutes?: number
  /** Log level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
}

/**
 * Retry processor result
 */
export interface RetryProcessorResult {
  runId: string
  processed: Record<QueueType, number>
  scheduled: Record<QueueType, number>
  staleReset: Record<QueueType, number>
  durationMs: number
}

/**
 * All queue types
 */
const ALL_QUEUE_TYPES: QueueType[] = [
  'review',
  'creator',
  'subscription',
  'esign',
  'treasury',
  'team_invitation',
]

/**
 * Logger helper
 */
function log(
  level: 'debug' | 'info' | 'warn' | 'error',
  configLevel: string | undefined,
  message: string,
  data?: Record<string, unknown>
): void {
  const levels = ['debug', 'info', 'warn', 'error']
  const configLevelIndex = levels.indexOf(configLevel || 'info')
  const messageLevelIndex = levels.indexOf(level)

  if (messageLevelIndex >= configLevelIndex) {
    const logFn = console[level] || console.log
    logFn(`[RetryProcessor] ${message}`, data || '')
  }
}

/**
 * Retry processor for failed entries
 *
 * @ai-pattern retry-processor
 * @ai-note Processes all queue types by default
 */
export class RetryProcessor {
  private config: Required<RetryProcessorConfig>

  constructor(config: RetryProcessorConfig) {
    this.config = {
      ...config,
      queueTypes: config.queueTypes ?? ALL_QUEUE_TYPES,
      batchSize: config.batchSize ?? 20,
      baseDelayMinutes: config.baseDelayMinutes ?? 1,
      staleMinutes: config.staleMinutes ?? 10,
      logLevel: config.logLevel ?? 'info',
    }
  }

  /**
   * Run the retry processor
   */
  async run(): Promise<RetryProcessorResult> {
    const runId = crypto.randomUUID()
    const startTime = Date.now()

    const result: RetryProcessorResult = {
      runId,
      processed: {} as Record<QueueType, number>,
      scheduled: {} as Record<QueueType, number>,
      staleReset: {} as Record<QueueType, number>,
      durationMs: 0,
    }

    // Initialize counters
    for (const queueType of this.config.queueTypes) {
      result.processed[queueType] = 0
      result.scheduled[queueType] = 0
      result.staleReset[queueType] = 0
    }

    try {
      // Process each queue type
      for (const queueType of this.config.queueTypes) {
        try {
          // First, reset stale processing entries
          const staleCount = await resetStaleProcessingEntries(
            this.config.tenantId,
            queueType,
            this.config.staleMinutes
          )
          result.staleReset[queueType] = staleCount

          if (staleCount > 0) {
            log('warn', this.config.logLevel, `Reset stale entries`, {
              queueType,
              count: staleCount,
            })
          }

          // Get entries ready for retry
          const retryEntries = await getRetryableEntries<QueueEntry>(
            this.config.tenantId,
            queueType,
            this.config.batchSize,
            this.config.baseDelayMinutes
          )

          result.processed[queueType] = retryEntries.length

          // Schedule each entry for retry
          for (const entry of retryEntries) {
            const scheduled = await scheduleRetry(
              this.config.tenantId,
              queueType,
              entry.id
            )
            if (scheduled) {
              result.scheduled[queueType]++
            }
          }

          log('debug', this.config.logLevel, `Processed queue`, {
            queueType,
            processed: result.processed[queueType],
            scheduled: result.scheduled[queueType],
          })
        } catch (error) {
          log('error', this.config.logLevel, `Error processing queue`, {
            queueType,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    } catch (error) {
      log('error', this.config.logLevel, `Retry processor run failed`, {
        runId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    result.durationMs = Date.now() - startTime

    const totalProcessed = Object.values(result.processed).reduce((a, b) => a + b, 0)
    const totalScheduled = Object.values(result.scheduled).reduce((a, b) => a + b, 0)

    log('info', this.config.logLevel, `Retry processor complete`, {
      runId,
      totalProcessed,
      totalScheduled,
      durationMs: result.durationMs,
    })

    return result
  }
}

/**
 * Create a retry processor
 *
 * @param config - Processor configuration
 * @returns Run function
 */
export function createRetryProcessor(
  config: RetryProcessorConfig
): () => Promise<RetryProcessorResult> {
  const processor = new RetryProcessor(config)
  return () => processor.run()
}

/**
 * Retry processor job handler for background jobs
 *
 * @ai-pattern job-handler
 * @ai-note Use with @cgk-platform/jobs for scheduled retry processing
 */
export function createRetryProcessorJob() {
  return async (payload: {
    tenantId: string
    queueTypes?: QueueType[]
    batchSize?: number
    baseDelayMinutes?: number
  }): Promise<RetryProcessorResult> => {
    const processor = new RetryProcessor({
      tenantId: payload.tenantId,
      queueTypes: payload.queueTypes,
      batchSize: payload.batchSize,
      baseDelayMinutes: payload.baseDelayMinutes,
    })

    return processor.run()
  }
}
