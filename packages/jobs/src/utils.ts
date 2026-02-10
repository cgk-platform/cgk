/**
 * Job utilities
 */

import { randomBytes } from 'crypto'

/**
 * Create a unique job ID
 */
export function createJobId(): string {
  const timestamp = Date.now().toString(36)
  const random = randomBytes(8).toString('hex')
  return `job_${timestamp}_${random}`
}

/**
 * Parse a job ID to extract timestamp
 */
export function parseJobId(jobId: string): { timestamp: number; random: string } | null {
  const match = jobId.match(/^job_([a-z0-9]+)_([a-f0-9]+)$/)
  if (!match || !match[1] || !match[2]) return null

  return {
    timestamp: parseInt(match[1], 36),
    random: match[2],
  }
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoff: 'fixed' | 'exponential'
): number {
  if (backoff === 'fixed') {
    return initialDelay
  }

  const delay = initialDelay * Math.pow(2, attempt - 1)
  return Math.min(delay, maxDelay)
}
