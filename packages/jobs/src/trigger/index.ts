/**
 * Trigger.dev Tasks Index
 *
 * Main entry point for all Trigger.dev task definitions.
 * Re-exports all tasks from subdirectories for easy registration.
 *
 * Categories:
 * - Commerce: Order sync, review emails, A/B testing, product sync
 * - Creators: Payout processing, communications, applications, analytics
 * - Analytics: Attribution, metrics, ad platforms, ML training
 * - Scheduled: Health checks, digests, alerts, subscriptions, media processing
 * - Platform: System-level tasks (health matrix, etc.)
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

// ============================================================
// COMMERCE TASKS
// ============================================================
export * from './commerce'

// ============================================================
// CREATOR TASKS
// ============================================================
export * from './creators'

// ============================================================
// ANALYTICS TASKS
// ============================================================
export * from './analytics'

// ============================================================
// SCHEDULED TASKS
// ============================================================
export * from './scheduled'

// ============================================================
// PLATFORM TASKS
// ============================================================
export * from './platform'

// ============================================================
// UTILITIES
// ============================================================
export * from './utils'

// ============================================================
// ERROR HANDLING
// ============================================================
export * from './errors'

// ============================================================
// COMBINED EXPORTS
// ============================================================

import { allCommerceTasks } from './commerce'
import { allCreatorTasks } from './creators'
import { allAnalyticsTasks } from './analytics'
import { allScheduledTasks } from './scheduled'
import { allPlatformTasks } from './platform'

/**
 * All Trigger.dev tasks combined
 * Use this for bulk task registration
 */
export const allTasks = [
  ...allCommerceTasks,
  ...allCreatorTasks,
  ...allAnalyticsTasks,
  ...allScheduledTasks,
  ...allPlatformTasks,
]

/**
 * Task counts by category
 */
export const TASK_COUNTS = {
  commerce: allCommerceTasks.length,
  creators: allCreatorTasks.length,
  analytics: allAnalyticsTasks.length,
  scheduled: allScheduledTasks.length,
  platform: allPlatformTasks.length,
  total: allCommerceTasks.length + allCreatorTasks.length + allAnalyticsTasks.length + allScheduledTasks.length + allPlatformTasks.length,
} as const
