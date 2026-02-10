/**
 * @cgk/jobs - Background job abstraction
 *
 * @ai-pattern background-jobs
 * @ai-note Queue-based job processing with retries
 */

// Job definition
export { defineJob, type JobDefinition, type JobHandler } from './define'

// Job queue
export { createJobQueue, type JobQueue, type JobQueueConfig } from './queue'

// Job execution
export { processJobs, type JobProcessor, type ProcessorConfig } from './processor'

// Job types
export type {
  Job,
  JobStatus,
  JobResult,
  JobError,
  JobOptions,
  RetryConfig,
} from './types'

// Utilities
export { createJobId, parseJobId } from './utils'
