/**
 * Commerce Trigger.dev Tasks Index
 *
 * Re-exports all commerce-related tasks:
 * - Order sync
 * - Review email
 * - A/B testing
 * - Product & customer sync
 *
 * @ai-pattern trigger-tasks
 */

export * from './order-sync'
export * from './review-email'
export * from './ab-testing'
export * from './product-sync'

import { orderSyncTasks } from './order-sync'
import { reviewEmailTasks } from './review-email'
import { abTestingTasks } from './ab-testing'
import { productCustomerSyncTasks } from './product-sync'

/**
 * All commerce tasks combined
 */
export const allCommerceTasks = [
  ...orderSyncTasks,
  ...reviewEmailTasks,
  ...abTestingTasks,
  ...productCustomerSyncTasks,
]

/**
 * Commerce task count
 */
export const COMMERCE_TASK_COUNT = allCommerceTasks.length
