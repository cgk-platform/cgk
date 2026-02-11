/**
 * Base email queue processor
 *
 * @ai-pattern queue-processor
 * @ai-note Abstract base for all queue processors
 */

import type {
  QueueEntry,
  QueueType,
  SendResult,
} from '../queue/types.js'
import {
  claimScheduledEntries,
  markAsFailed,
  markAsSent,
  markAsSkipped,
  resetStaleProcessingEntries,
} from '../queue/claim.js'
import { getRetryableEntries, scheduleRetry } from '../queue/retry.js'

/**
 * Processor configuration
 */
export interface ProcessorConfig {
  /** Tenant to process for */
  tenantId: string
  /** Queue type */
  queueType: QueueType
  /** Maximum entries to process per run (default 50) */
  batchSize?: number
  /** Delay between sends in ms (default 550ms for Resend rate limit) */
  sendDelayMs?: number
  /** Consider entries stale after this many minutes (default 10) */
  staleMinutes?: number
  /** Log level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
}

/**
 * Processor run result
 */
export interface ProcessorResult {
  runId: string
  processed: number
  sent: number
  failed: number
  skipped: number
  retried: number
  errors: Array<{ entryId: string; error: string }>
  durationMs: number
}

/**
 * Entry processor function type
 */
export type EntryProcessor<T extends QueueEntry> = (
  entry: T,
  config: ProcessorConfig
) => Promise<{
  action: 'send' | 'skip'
  result?: SendResult
  skipReason?: string
}>

/**
 * Sleep helper for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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
    logFn(`[EmailQueue] ${message}`, data || '')
  }
}

/**
 * Abstract base processor for email queues
 *
 * @ai-pattern base-processor
 * @ai-note Extend this for each queue type
 */
export abstract class BaseEmailProcessor<T extends QueueEntry> {
  protected config: Required<ProcessorConfig>

  constructor(config: ProcessorConfig) {
    this.config = {
      ...config,
      batchSize: config.batchSize ?? 50,
      sendDelayMs: config.sendDelayMs ?? 550,
      staleMinutes: config.staleMinutes ?? 10,
      logLevel: config.logLevel ?? 'info',
    }
  }

  /**
   * Process a single entry - must be implemented by subclass
   */
  protected abstract processEntry(entry: T): Promise<{
    action: 'send' | 'skip'
    result?: SendResult
    skipReason?: string
  }>

  /**
   * Run the processor
   *
   * @ai-pattern processor-run
   * @ai-note Claims entries, processes them, handles results
   */
  async run(): Promise<ProcessorResult> {
    const runId = crypto.randomUUID()
    const startTime = Date.now()

    const result: ProcessorResult = {
      runId,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      retried: 0,
      errors: [],
      durationMs: 0,
    }

    try {
      // First, reset any stale processing entries
      const resetCount = await resetStaleProcessingEntries(
        this.config.tenantId,
        this.config.queueType,
        this.config.staleMinutes
      )
      if (resetCount > 0) {
        log('warn', this.config.logLevel, `Reset ${resetCount} stale entries`, {
          tenantId: this.config.tenantId,
          queueType: this.config.queueType,
        })
      }

      // Claim entries for processing
      const entries = await claimScheduledEntries<T>(
        this.config.tenantId,
        this.config.queueType,
        runId,
        this.config.batchSize
      )

      log('info', this.config.logLevel, `Claimed ${entries.length} entries`, {
        runId,
        tenantId: this.config.tenantId,
        queueType: this.config.queueType,
      })

      // Process each entry
      for (const entry of entries) {
        result.processed++

        try {
          const processResult = await this.processEntry(entry)

          if (processResult.action === 'skip') {
            await markAsSkipped(
              this.config.tenantId,
              this.config.queueType,
              entry.id,
              processResult.skipReason || 'Processor skip'
            )
            result.skipped++
            log('debug', this.config.logLevel, `Skipped entry`, {
              entryId: entry.id,
              reason: processResult.skipReason,
            })
          } else if (processResult.result) {
            if (processResult.result.success && processResult.result.messageId) {
              await markAsSent(
                this.config.tenantId,
                this.config.queueType,
                entry.id,
                processResult.result.messageId
              )
              result.sent++
              log('debug', this.config.logLevel, `Sent entry`, {
                entryId: entry.id,
                messageId: processResult.result.messageId,
              })
            } else {
              await markAsFailed(
                this.config.tenantId,
                this.config.queueType,
                entry.id,
                processResult.result.error || 'Unknown error'
              )
              result.failed++
              result.errors.push({
                entryId: entry.id,
                error: processResult.result.error || 'Unknown error',
              })
              log('warn', this.config.logLevel, `Failed to send entry`, {
                entryId: entry.id,
                error: processResult.result.error,
              })
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          await markAsFailed(
            this.config.tenantId,
            this.config.queueType,
            entry.id,
            errorMessage
          )
          result.failed++
          result.errors.push({ entryId: entry.id, error: errorMessage })
          log('error', this.config.logLevel, `Error processing entry`, {
            entryId: entry.id,
            error: errorMessage,
          })
        }

        // Rate limit: wait between sends
        if (result.processed < entries.length) {
          await sleep(this.config.sendDelayMs)
        }
      }

      // Process retry entries
      result.retried = await this.processRetries()

    } catch (error) {
      log('error', this.config.logLevel, `Processor run failed`, {
        runId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    result.durationMs = Date.now() - startTime

    log('info', this.config.logLevel, `Processor run complete`, {
      processorRunId: runId,
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      retried: result.retried,
      durationMs: result.durationMs,
    })

    return result
  }

  /**
   * Process entries ready for retry
   */
  protected async processRetries(): Promise<number> {
    const retryEntries = await getRetryableEntries<T>(
      this.config.tenantId,
      this.config.queueType,
      20 // Smaller batch for retries
    )

    let retried = 0
    for (const entry of retryEntries) {
      const scheduled = await scheduleRetry(
        this.config.tenantId,
        this.config.queueType,
        entry.id
      )
      if (scheduled) retried++
    }

    return retried
  }
}

/**
 * Create a simple processor from a function
 *
 * @ai-pattern functional-processor
 * @ai-note Use when you don't need a full class
 */
export function createProcessor<T extends QueueEntry>(
  config: ProcessorConfig,
  processor: EntryProcessor<T>
): () => Promise<ProcessorResult> {
  class FunctionalProcessor extends BaseEmailProcessor<T> {
    protected async processEntry(entry: T) {
      return processor(entry, this.config)
    }
  }

  const instance = new FunctionalProcessor(config)
  return () => instance.run()
}
