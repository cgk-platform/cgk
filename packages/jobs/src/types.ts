/**
 * Job types
 */

export interface Job<T = unknown> {
  id: string
  name: string
  payload: T
  status: JobStatus
  attempts: number
  maxAttempts: number
  priority: number
  scheduledAt: Date
  startedAt?: Date
  completedAt?: Date
  failedAt?: Date
  error?: JobError
  result?: unknown
  tenantId?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export type JobStatus =
  | 'pending'
  | 'scheduled'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying'

export interface JobResult<T = unknown> {
  success: boolean
  data?: T
  error?: JobError
}

export interface JobError {
  message: string
  code?: string
  stack?: string
  retryable: boolean
}

export interface JobOptions {
  priority?: number
  delay?: number
  scheduledAt?: Date
  maxAttempts?: number
  retryDelay?: number
  timeout?: number
  tenantId?: string
  metadata?: Record<string, unknown>
}

export interface RetryConfig {
  maxAttempts: number
  backoff: 'fixed' | 'exponential'
  initialDelay: number
  maxDelay?: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  backoff: 'exponential',
  initialDelay: 1000,
  maxDelay: 60000,
}
