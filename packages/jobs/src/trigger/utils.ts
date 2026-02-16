/**
 * Trigger.dev Task Utilities
 *
 * Helper functions for creating Job objects compatible with the
 * job handler interface from @cgk-platform/jobs.
 *
 * @ai-pattern trigger-tasks
 */

import { sql } from '@cgk-platform/db'
import type { Job, JobStatus } from '../types'

/**
 * Fetch all active tenant IDs from the organizations table
 *
 * CRITICAL: Used by scheduled tasks to process all tenants.
 * Never hardcode tenant IDs - always query the database.
 *
 * @returns Array of active tenant IDs (organization slugs)
 */
export async function getActiveTenants(): Promise<string[]> {
  const result = await sql<{ slug: string }>`
    SELECT slug FROM public.organizations
    WHERE status = 'active'
    ORDER BY slug
    LIMIT 1000
  `
  return result.rows.map(r => r.slug)
}

/**
 * Create a Job object from a Trigger.dev payload
 *
 * The handlers expect a full Job<T> object, but Trigger.dev tasks
 * only receive the payload. This utility creates the complete Job
 * object with sensible defaults for the Trigger.dev context.
 */
export function createJobFromPayload<T>(
  name: string,
  payload: T,
  options: {
    maxAttempts?: number
    priority?: number
  } = {}
): Job<T> {
  const now = new Date()
  return {
    id: `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    payload,
    status: 'running' as JobStatus,
    attempts: 0,
    maxAttempts: options.maxAttempts ?? 3,
    priority: options.priority ?? 0,
    scheduledAt: now,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  }
}
