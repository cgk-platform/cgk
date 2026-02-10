/**
 * Job queue implementation
 */

import type { Job, JobStatus, JobOptions } from './types'
import { createJobId } from './utils'

export interface JobQueueConfig {
  name: string
  connectionString?: string
  pollInterval?: number
  maxConcurrency?: number
}

export interface JobQueue {
  readonly name: string

  enqueue<T>(jobName: string, payload: T, options?: JobOptions): Promise<Job<T>>
  dequeue(limit?: number): Promise<Job[]>
  acknowledge(jobId: string, result: 'completed' | 'failed', error?: Error): Promise<void>
  getJob(jobId: string): Promise<Job | null>
  listJobs(status?: JobStatus): Promise<Job[]>
  cancelJob(jobId: string): Promise<void>
  retryJob(jobId: string): Promise<Job>
}

/**
 * Create a job queue
 * @placeholder Uses in-memory storage - replace with database in production
 */
export function createJobQueue(config: JobQueueConfig): JobQueue {
  const jobs = new Map<string, Job>()

  return {
    name: config.name,

    async enqueue<T>(jobName: string, payload: T, options?: JobOptions): Promise<Job<T>> {
      const now = new Date()
      const job: Job<T> = {
        id: createJobId(),
        name: jobName,
        payload,
        status: options?.scheduledAt ? 'scheduled' : 'pending',
        attempts: 0,
        maxAttempts: options?.maxAttempts ?? 3,
        priority: options?.priority ?? 0,
        scheduledAt: options?.scheduledAt ?? now,
        tenantId: options?.tenantId,
        metadata: options?.metadata,
        createdAt: now,
        updatedAt: now,
      }

      jobs.set(job.id, job as Job)
      return job
    },

    async dequeue(limit = 10): Promise<Job[]> {
      const now = new Date()
      const available: Job[] = []

      for (const job of jobs.values()) {
        if (
          (job.status === 'pending' || job.status === 'scheduled') &&
          job.scheduledAt <= now &&
          available.length < limit
        ) {
          job.status = 'running'
          job.startedAt = now
          job.attempts += 1
          job.updatedAt = now
          available.push(job)
        }
      }

      // Sort by priority (higher first) then by scheduledAt (earlier first)
      return available.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority
        return a.scheduledAt.getTime() - b.scheduledAt.getTime()
      })
    },

    async acknowledge(jobId: string, result: 'completed' | 'failed', error?: Error): Promise<void> {
      const job = jobs.get(jobId)
      if (!job) throw new Error(`Job not found: ${jobId}`)

      const now = new Date()
      job.updatedAt = now

      if (result === 'completed') {
        job.status = 'completed'
        job.completedAt = now
      } else {
        job.status = 'failed'
        job.failedAt = now
        job.error = error ? {
          message: error.message,
          stack: error.stack,
          retryable: job.attempts < job.maxAttempts,
        } : undefined
      }
    },

    async getJob(jobId: string): Promise<Job | null> {
      return jobs.get(jobId) ?? null
    },

    async listJobs(status?: JobStatus): Promise<Job[]> {
      const all = Array.from(jobs.values())
      if (!status) return all
      return all.filter((job) => job.status === status)
    },

    async cancelJob(jobId: string): Promise<void> {
      const job = jobs.get(jobId)
      if (!job) throw new Error(`Job not found: ${jobId}`)
      job.status = 'cancelled'
      job.updatedAt = new Date()
    },

    async retryJob(jobId: string): Promise<Job> {
      const job = jobs.get(jobId)
      if (!job) throw new Error(`Job not found: ${jobId}`)
      job.status = 'pending'
      job.updatedAt = new Date()
      return job
    },
  }
}
