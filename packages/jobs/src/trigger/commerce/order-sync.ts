/**
 * Commerce Order Sync Tasks
 *
 * Trigger.dev task definitions for order synchronization:
 * - Sync single order from Shopify webhook
 * - Batch sync for backfill operations
 * - Order reconciliation for missed orders
 * - Order-triggered attribution processing
 * - Order-triggered creator commission credit
 * - Order-triggered review email scheduling
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type { TenantEvent } from '../../events'
import type {
  SyncOrderPayload,
  SyncOrderBatchPayload,
  OrderReconciliationPayload,
  OrderAttributionPayload,
  OrderCommissionPayload,
  OrderReviewEmailPayload,
} from '../../handlers/commerce/order-sync'
import type { OrderCreatedPayload, OrderFulfilledPayload } from '../../events'
import { createJobFromPayload } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const ORDER_SYNC_RETRY = {
  maxAttempts: 5,
  factor: 2,
  minTimeoutInMs: 2000,
  maxTimeoutInMs: 60000,
}

const BATCH_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 5000,
  maxTimeoutInMs: 120000,
}

// ============================================================
// SYNC ORDER TASK
// ============================================================

/**
 * Sync a single order from Shopify
 *
 * Task ID: commerce-sync-order
 */
export const syncOrderTask = task({
  id: 'commerce-sync-order',
  retry: ORDER_SYNC_RETRY,
  run: async (payload: TenantEvent<SyncOrderPayload>) => {
    const { tenantId, orderId, shopifyOrderId, source } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    if (!orderId && !shopifyOrderId) {
      throw new Error('Either orderId or shopifyOrderId is required')
    }

    logger.info('Syncing order', { tenantId, orderId, shopifyOrderId, source })

    const { syncOrderJob } = await import('../../handlers/commerce/order-sync.js')

    const result = await syncOrderJob.handler(
      createJobFromPayload('sync-order', payload, { maxAttempts: 5 })
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Sync failed')
    }

    return result.data
  },
})

// ============================================================
// SYNC ORDER BATCH TASK
// ============================================================

/**
 * Batch sync multiple orders for backfill operations
 *
 * Task ID: commerce-sync-order-batch
 */
export const syncOrderBatchTask = task({
  id: 'commerce-sync-order-batch',
  retry: BATCH_RETRY,
  run: async (payload: TenantEvent<SyncOrderBatchPayload>) => {
    const { tenantId, orderIds, shopifyOrderIds, startDate, endDate, limit, cursor } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Batch syncing orders', {
      tenantId,
      orderCount: orderIds?.length || shopifyOrderIds?.length || 'all',
      startDate,
      endDate,
      limit,
      cursor,
    })

    const { syncOrderBatchJob } = await import('../../handlers/commerce/order-sync.js')

    const result = await syncOrderBatchJob.handler(
      createJobFromPayload('sync-order-batch', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Batch sync failed')
    }

    return result.data
  },
})

// ============================================================
// ORDER RECONCILIATION TASK
// ============================================================

/**
 * Hourly order reconciliation job
 *
 * Task ID: commerce-order-reconciliation
 */
export const orderReconciliationTask = task({
  id: 'commerce-order-reconciliation',
  retry: BATCH_RETRY,
  run: async (payload: TenantEvent<OrderReconciliationPayload>) => {
    const { tenantId, lookbackHours = 2, maxOrders = 500 } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Running order reconciliation', { tenantId, lookbackHours, maxOrders })

    const { orderReconciliationJob } = await import('../../handlers/commerce/order-sync.js')

    const result = await orderReconciliationJob.handler(
      createJobFromPayload('order-reconciliation', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Reconciliation failed')
    }

    return result.data
  },
})

// ============================================================
// ORDER ATTRIBUTION TASK
// ============================================================

/**
 * Process attribution for an order
 *
 * Task ID: commerce-order-attribution
 */
export const orderAttributionTask = task({
  id: 'commerce-order-attribution',
  retry: ORDER_SYNC_RETRY,
  run: async (payload: TenantEvent<OrderAttributionPayload>) => {
    const { tenantId, orderId, customerId, sessionId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    if (!orderId) {
      throw new Error('orderId is required')
    }

    logger.info('Processing order attribution', { tenantId, orderId, customerId, sessionId })

    const { orderAttributionJob } = await import('../../handlers/commerce/order-sync.js')

    const result = await orderAttributionJob.handler(
      createJobFromPayload('order-attribution', payload, { maxAttempts: 5 })
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Attribution failed')
    }

    return result.data
  },
})

// ============================================================
// ORDER COMMISSION TASK
// ============================================================

/**
 * Credit creator commission for an order
 *
 * Task ID: commerce-order-commission
 */
export const orderCommissionTask = task({
  id: 'commerce-order-commission',
  retry: ORDER_SYNC_RETRY,
  run: async (payload: TenantEvent<OrderCommissionPayload>) => {
    const { tenantId, orderId, discountCode, orderTotal, currency } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    if (!orderId) {
      throw new Error('orderId is required')
    }

    logger.info('Processing order commission', { tenantId, orderId, discountCode, orderTotal, currency })

    const { orderCommissionJob } = await import('../../handlers/commerce/order-sync.js')

    const result = await orderCommissionJob.handler(
      createJobFromPayload('order-commission', payload, { maxAttempts: 5 })
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Commission processing failed')
    }

    return result.data
  },
})

// ============================================================
// ORDER REVIEW EMAIL TASK
// ============================================================

/**
 * Schedule review email for an order
 *
 * Task ID: commerce-order-review-email
 */
export const orderReviewEmailTask = task({
  id: 'commerce-order-review-email',
  retry: ORDER_SYNC_RETRY,
  run: async (payload: TenantEvent<OrderReviewEmailPayload>) => {
    const { tenantId, orderId, customerId, customerEmail, fulfillmentId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    if (!orderId) {
      throw new Error('orderId is required')
    }

    logger.info('Scheduling review email', { tenantId, orderId, customerId, customerEmail, fulfillmentId })

    const { orderReviewEmailJob } = await import('../../handlers/commerce/order-sync.js')

    const result = await orderReviewEmailJob.handler(
      createJobFromPayload('order-review-email', payload, { maxAttempts: 5 })
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Review email scheduling failed')
    }

    return result.data
  },
})

// ============================================================
// HANDLE ORDER CREATED TASK
// ============================================================

/**
 * Handle order.created event
 *
 * Task ID: commerce-handle-order-created
 */
export const handleOrderCreatedTask = task({
  id: 'commerce-handle-order-created',
  retry: ORDER_SYNC_RETRY,
  run: async (payload: TenantEvent<OrderCreatedPayload>) => {
    const { tenantId, orderId, shopifyOrderId, customerId, totalAmount, currency } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing new order', { tenantId, orderId, shopifyOrderId, customerId, totalAmount, currency })

    const { handleOrderCreatedJob } = await import('../../handlers/commerce/order-sync.js')

    const result = await handleOrderCreatedJob.handler(
      createJobFromPayload('handle-order-created', payload, { maxAttempts: 5 })
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Order created handling failed')
    }

    return result.data
  },
})

// ============================================================
// HANDLE ORDER FULFILLED TASK
// ============================================================

/**
 * Handle order.fulfilled event
 *
 * Task ID: commerce-handle-order-fulfilled
 */
export const handleOrderFulfilledTask = task({
  id: 'commerce-handle-order-fulfilled',
  retry: ORDER_SYNC_RETRY,
  run: async (payload: TenantEvent<OrderFulfilledPayload>) => {
    const { tenantId, orderId, fulfillmentId, trackingNumber, carrier } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Processing order fulfillment', { tenantId, orderId, fulfillmentId, trackingNumber, carrier })

    const { handleOrderFulfilledJob } = await import('../../handlers/commerce/order-sync.js')

    const result = await handleOrderFulfilledJob.handler(
      createJobFromPayload('handle-order-fulfilled', payload, { maxAttempts: 5 })
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Order fulfilled handling failed')
    }

    return result.data
  },
})

// ============================================================
// SCHEDULED: ORDER RECONCILIATION
// ============================================================

/**
 * Scheduled order reconciliation - runs every hour at :30
 *
 * Task ID: commerce-order-reconciliation-scheduled
 */
export const orderReconciliationScheduledTask = schedules.task({
  id: 'commerce-order-reconciliation-scheduled',
  cron: '30 * * * *',
  run: async () => {
    logger.info('Running scheduled order reconciliation')

    // Get all active tenants and process each
    // In production, this would query the organizations table
    const tenants = ['system'] // Placeholder

    const results = []
    for (const tenantId of tenants) {
      try {
        const result = await orderReconciliationTask.triggerAndWait({
          tenantId,
          lookbackHours: 2,
          maxOrders: 500,
        })
        results.push({ tenantId, success: result.ok, data: result.ok ? result.output : null })
      } catch (error) {
        logger.error('Reconciliation failed for tenant', { tenantId, error })
        results.push({ tenantId, success: false, error: String(error) })
      }
    }

    return { processedTenants: results.length, results }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const orderSyncTasks = [
  syncOrderTask,
  syncOrderBatchTask,
  orderReconciliationTask,
  orderAttributionTask,
  orderCommissionTask,
  orderReviewEmailTask,
  handleOrderCreatedTask,
  handleOrderFulfilledTask,
  orderReconciliationScheduledTask,
]
