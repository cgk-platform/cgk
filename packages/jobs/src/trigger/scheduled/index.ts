/**
 * Scheduled Trigger.dev Tasks Index
 *
 * Re-exports all scheduled-related Trigger.dev tasks:
 * - Health Checks
 * - Digests
 * - Alerts
 * - Subscriptions
 * - Media Processing
 * - Additional (BRI, DAM, E-sign, Escalation, etc.)
 *
 * @ai-pattern trigger-tasks
 */

// Re-export all tasks from each module
export * from './health-checks'
export * from './digests'
export * from './alerts'
export * from './subscriptions'
export * from './media-processing'
export * from './additional'

// ============================================================
// COMBINED EXPORTS
// ============================================================

import { healthCheckTasks } from './health-checks'
import { digestTasks } from './digests'
import { alertTasks } from './alerts'
import { subscriptionTasks } from './subscriptions'
import { mediaProcessingTasks } from './media-processing'
import { additionalTasks } from './additional'

/**
 * All scheduled tasks combined
 */
export const allScheduledTasks = [
  ...healthCheckTasks,
  ...digestTasks,
  ...alertTasks,
  ...subscriptionTasks,
  ...mediaProcessingTasks,
  ...additionalTasks,
]
