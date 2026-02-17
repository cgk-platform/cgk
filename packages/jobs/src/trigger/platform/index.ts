/**
 * Platform Trigger.dev Tasks Index
 *
 * Re-exports all platform-level Trigger.dev tasks:
 * - Health Check Matrix population
 *
 * Platform tasks are system-level (not tenant-scoped) and
 * typically run on schedules to maintain platform health.
 *
 * @ai-pattern trigger-tasks
 */

// Re-export all tasks from each module
export * from './health-check'

// ============================================================
// COMBINED EXPORTS
// ============================================================

import { platformHealthTasks } from './health-check'

/**
 * All platform tasks combined
 */
export const allPlatformTasks = [
  ...platformHealthTasks,
]
