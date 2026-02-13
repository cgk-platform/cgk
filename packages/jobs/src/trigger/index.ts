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
// UTILITIES
// ============================================================
export * from './utils'

// ============================================================
// COMBINED EXPORTS
// ============================================================

import { allCommerceTasks } from './commerce'
import { allCreatorTasks } from './creators'
import { allAnalyticsTasks } from './analytics'
import { allScheduledTasks } from './scheduled'

/**
 * All Trigger.dev tasks combined
 * Use this for bulk task registration
 */
export const allTasks = [
  ...allCommerceTasks,
  ...allCreatorTasks,
  ...allAnalyticsTasks,
  ...allScheduledTasks,
]

/**
 * Task counts by category
 */
export const TASK_COUNTS = {
  commerce: allCommerceTasks.length,
  creators: allCreatorTasks.length,
  analytics: allAnalyticsTasks.length,
  scheduled: allScheduledTasks.length,
  total: allCommerceTasks.length + allCreatorTasks.length + allAnalyticsTasks.length + allScheduledTasks.length,
} as const
