/**
 * Job definition utilities
 */

import type { Job, JobResult, JobOptions, RetryConfig } from './types'

export type JobHandler<T = unknown, R = unknown> = (
  job: Job<T>
) => Promise<JobResult<R>>

export interface JobDefinition<T = unknown, R = unknown> {
  name: string
  handler: JobHandler<T, R>
  options?: JobOptions
  retry?: Partial<RetryConfig>
  validate?: (payload: unknown) => payload is T
}

/**
 * Define a background job
 */
export function defineJob<T = unknown, R = unknown>(
  definition: JobDefinition<T, R>
): JobDefinition<T, R> {
  return {
    ...definition,
    options: {
      maxAttempts: definition.retry?.maxAttempts ?? 3,
      ...definition.options,
    },
  }
}

/**
 * Example job definitions
 */
export const exampleJobs = {
  sendEmail: defineJob({
    name: 'send-email',
    handler: async (job) => {
      // TODO: Implement email sending
      console.log('Sending email:', job.payload)
      return { success: true }
    },
    retry: { maxAttempts: 3 },
  }),

  syncInventory: defineJob({
    name: 'sync-inventory',
    handler: async (job) => {
      // TODO: Implement inventory sync
      console.log('Syncing inventory:', job.payload)
      return { success: true }
    },
    retry: { maxAttempts: 5, backoff: 'exponential' },
  }),
}
