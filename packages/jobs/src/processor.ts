/**
 * Job processor
 */

import type { Job, JobResult } from './types'
import type { JobQueue } from './queue'
import type { JobDefinition, JobHandler } from './define'

export interface ProcessorConfig {
  queue: JobQueue
  handlers: Map<string, JobHandler>
  pollInterval?: number
  maxConcurrency?: number
  onError?: (job: Job, error: Error) => void
  onComplete?: (job: Job, result: JobResult) => void
}

export interface JobProcessor {
  start(): void
  stop(): void
  registerHandler<T, R>(name: string, handler: JobHandler<T, R>): void
  registerJob<T, R>(definition: JobDefinition<T, R>): void
}

/**
 * Create a job processor
 */
export function processJobs(config: ProcessorConfig): JobProcessor {
  const handlers = new Map(config.handlers)
  let running = false
  let pollTimer: ReturnType<typeof setTimeout> | null = null

  async function poll(): Promise<void> {
    if (!running) return

    try {
      const jobs = await config.queue.dequeue(config.maxConcurrency ?? 5)

      await Promise.all(
        jobs.map(async (job) => {
          const handler = handlers.get(job.name)

          if (!handler) {
            console.error(`No handler registered for job: ${job.name}`)
            await config.queue.acknowledge(job.id, 'failed', new Error(`No handler for job: ${job.name}`))
            return
          }

          try {
            const result = await handler(job)

            if (result.success) {
              await config.queue.acknowledge(job.id, 'completed')
              config.onComplete?.(job, result)
            } else {
              const error = new Error(result.error?.message ?? 'Job failed')
              await config.queue.acknowledge(job.id, 'failed', error)
              config.onError?.(job, error)
            }
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error))
            await config.queue.acknowledge(job.id, 'failed', err)
            config.onError?.(job, err)
          }
        })
      )
    } catch (error) {
      console.error('Error polling for jobs:', error)
    }

    // Schedule next poll
    if (running) {
      pollTimer = setTimeout(poll, config.pollInterval ?? 1000)
    }
  }

  return {
    start() {
      if (running) return
      running = true
      poll()
    },

    stop() {
      running = false
      if (pollTimer) {
        clearTimeout(pollTimer)
        pollTimer = null
      }
    },

    registerHandler<T, R>(name: string, handler: JobHandler<T, R>) {
      handlers.set(name, handler as JobHandler)
    },

    registerJob<T, R>(definition: JobDefinition<T, R>) {
      handlers.set(definition.name, definition.handler as JobHandler)
    },
  }
}
