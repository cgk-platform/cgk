/**
 * Commerce Product & Customer Sync Tasks
 *
 * Trigger.dev task definitions for Shopify data synchronization:
 * - Product sync from Shopify
 * - Customer sync from Shopify
 * - Inventory updates
 * - Collection sync
 *
 * @ai-pattern trigger-tasks
 * @ai-critical All tasks require tenantId in payload
 */

import { task, schedules, logger } from '@trigger.dev/sdk/v3'
import type { TenantEvent, CustomerCreatedPayload, CustomerUpdatedPayload, ProductSyncPayload, InventorySyncPayload } from '../../events'
import type {
  ProductSyncFromShopifyPayload,
  ProductBatchSyncPayload,
  CustomerSyncFromShopifyPayload,
  CustomerBatchSyncPayload,
  InventoryUpdatePayload,
  InventoryBatchSyncPayload,
  CollectionSyncPayload,
  CollectionProductsSyncPayload,
} from '../../handlers/commerce/product-customer-sync'
import { createJobFromPayload } from '../utils'

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const SYNC_RETRY = {
  maxAttempts: 5,
  factor: 2,
  minTimeoutInMs: 2000,
  maxTimeoutInMs: 60000,
}

const BATCH_SYNC_RETRY = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 5000,
  maxTimeoutInMs: 120000,
}

// ============================================================
// PRODUCT SYNC TASKS
// ============================================================

export const productSyncTask = task({
  id: 'commerce-product-sync',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<ProductSyncFromShopifyPayload>) => {
    const { tenantId, productId, shopifyProductId, fullSync = false, cursor, limit = 50 } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Syncing product', { tenantId, productId, shopifyProductId, fullSync, cursor, limit })

    const { productSyncJob } = await import('../../handlers/commerce/product-customer-sync.js')

    const result = await productSyncJob.handler(
      createJobFromPayload('product', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Product sync failed')
    }

    return result.data
  },
})

export const productBatchSyncTask = task({
  id: 'commerce-product-batch-sync',
  retry: BATCH_SYNC_RETRY,
  run: async (payload: TenantEvent<ProductBatchSyncPayload>) => {
    const { tenantId, productIds, shopifyProductIds, collectionId, updatedSince } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Batch syncing products', { tenantId, count: productIds?.length || shopifyProductIds?.length || 'all', collectionId, updatedSince })

    const { productBatchSyncJob } = await import('../../handlers/commerce/product-customer-sync.js')

    const result = await productBatchSyncJob.handler(
      createJobFromPayload('product', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Product batch sync failed')
    }

    return result.data
  },
})

export const handleProductSyncTask = task({
  id: 'commerce-handle-product-sync',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<ProductSyncPayload>) => {
    const { tenantId, productId, fullSync } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Handling product sync', { tenantId, productId, fullSync })

    const { handleProductSyncJob } = await import('../../handlers/commerce/product-customer-sync.js')

    const result = await handleProductSyncJob.handler(
      createJobFromPayload('handle', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Handle product sync failed')
    }

    return result.data
  },
})

// ============================================================
// CUSTOMER SYNC TASKS
// ============================================================

export const customerSyncTask = task({
  id: 'commerce-customer-sync',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<CustomerSyncFromShopifyPayload>) => {
    const { tenantId, customerId, shopifyCustomerId, fullSync = false, cursor, limit = 100 } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Syncing customer', { tenantId, customerId, shopifyCustomerId, fullSync, cursor, limit })

    const { customerSyncJob } = await import('../../handlers/commerce/product-customer-sync.js')

    const result = await customerSyncJob.handler(
      createJobFromPayload('customer', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Customer sync failed')
    }

    return result.data
  },
})

export const customerBatchSyncTask = task({
  id: 'commerce-customer-batch-sync',
  retry: BATCH_SYNC_RETRY,
  run: async (payload: TenantEvent<CustomerBatchSyncPayload>) => {
    const { tenantId, customerIds, shopifyCustomerIds, createdSince, updatedSince } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Batch syncing customers', { tenantId, count: customerIds?.length || shopifyCustomerIds?.length || 'all', createdSince, updatedSince })

    const { customerBatchSyncJob } = await import('../../handlers/commerce/product-customer-sync.js')

    const result = await customerBatchSyncJob.handler(
      createJobFromPayload('customer', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Customer batch sync failed')
    }

    return result.data
  },
})

export const handleCustomerCreatedTask = task({
  id: 'commerce-handle-customer-created',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<CustomerCreatedPayload>) => {
    const { tenantId, customerId, email, shopifyCustomerId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Handling customer created', { tenantId, customerId, email, shopifyCustomerId })

    const { handleCustomerCreatedJob } = await import('../../handlers/commerce/product-customer-sync.js')

    const result = await handleCustomerCreatedJob.handler(
      createJobFromPayload('handle', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Handle customer created failed')
    }

    return result.data
  },
})

export const handleCustomerUpdatedTask = task({
  id: 'commerce-handle-customer-updated',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<CustomerUpdatedPayload>) => {
    const { tenantId, customerId, changes } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Handling customer updated', { tenantId, customerId, changes })

    const { handleCustomerUpdatedJob } = await import('../../handlers/commerce/product-customer-sync.js')

    const result = await handleCustomerUpdatedJob.handler(
      createJobFromPayload('handle', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Handle customer updated failed')
    }

    return result.data
  },
})

// ============================================================
// INVENTORY SYNC TASKS
// ============================================================

export const inventoryUpdateTask = task({
  id: 'commerce-inventory-update',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<InventoryUpdatePayload>) => {
    const { tenantId, productId, variantId, shopifyVariantId, locationId, quantityAdjustment, newQuantity } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Updating inventory', { tenantId, productId, variantId, shopifyVariantId, locationId, quantityAdjustment, newQuantity })

    const { inventoryUpdateJob } = await import('../../handlers/commerce/product-customer-sync.js')

    const result = await inventoryUpdateJob.handler(
      createJobFromPayload('inventory', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Inventory update failed')
    }

    return result.data
  },
})

export const inventoryBatchSyncTask = task({
  id: 'commerce-inventory-batch-sync',
  retry: BATCH_SYNC_RETRY,
  run: async (payload: TenantEvent<InventoryBatchSyncPayload>) => {
    const { tenantId, locationId, fullSync = false, cursor } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Batch syncing inventory', { tenantId, locationId: locationId || 'all', fullSync, cursor })

    const { inventoryBatchSyncJob } = await import('../../handlers/commerce/product-customer-sync.js')

    const result = await inventoryBatchSyncJob.handler(
      createJobFromPayload('inventory', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Inventory batch sync failed')
    }

    return result.data
  },
})

export const handleInventorySyncTask = task({
  id: 'commerce-handle-inventory-sync',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<InventorySyncPayload>) => {
    const { tenantId, productId, variantId, locationId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Handling inventory sync', { tenantId, productId, variantId, locationId })

    const { handleInventorySyncJob } = await import('../../handlers/commerce/product-customer-sync.js')

    const result = await handleInventorySyncJob.handler(
      createJobFromPayload('handle', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Handle inventory sync failed')
    }

    return result.data
  },
})

// ============================================================
// COLLECTION SYNC TASKS
// ============================================================

export const collectionSyncTask = task({
  id: 'commerce-collection-sync',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<CollectionSyncPayload>) => {
    const { tenantId, collectionId, shopifyCollectionId, fullSync = false } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    logger.info('Syncing collection', { tenantId, collectionId, shopifyCollectionId, fullSync })

    const { collectionSyncJob } = await import('../../handlers/commerce/product-customer-sync.js')

    const result = await collectionSyncJob.handler(
      createJobFromPayload('collection', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Collection sync failed')
    }

    return result.data
  },
})

export const collectionProductsSyncTask = task({
  id: 'commerce-collection-products-sync',
  retry: SYNC_RETRY,
  run: async (payload: TenantEvent<CollectionProductsSyncPayload>) => {
    const { tenantId, collectionId, shopifyCollectionId } = payload

    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    if (!collectionId && !shopifyCollectionId) {
      throw new Error('Either collectionId or shopifyCollectionId is required')
    }

    logger.info('Syncing collection products', { tenantId, collectionId, shopifyCollectionId })

    const { collectionProductsSyncJob } = await import('../../handlers/commerce/product-customer-sync.js')

    const result = await collectionProductsSyncJob.handler(
      createJobFromPayload('collection', payload)
    )

    if (!result.success) {
      throw new Error(result.error?.message || 'Collection products sync failed')
    }

    return result.data
  },
})

// ============================================================
// SCHEDULED TASKS
// ============================================================

export const productFullSyncScheduledTask = schedules.task({
  id: 'commerce-product-full-sync-scheduled',
  cron: '0 3 * * *',
  run: async () => {
    logger.info('Running scheduled product full sync')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await productSyncTask.trigger({ tenantId, fullSync: true })
    }
    return { triggered: tenants.length }
  },
})

export const customerFullSyncScheduledTask = schedules.task({
  id: 'commerce-customer-full-sync-scheduled',
  cron: '0 4 * * *',
  run: async () => {
    logger.info('Running scheduled customer full sync')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await customerSyncTask.trigger({ tenantId, fullSync: true })
    }
    return { triggered: tenants.length }
  },
})

export const inventorySyncScheduledTask = schedules.task({
  id: 'commerce-inventory-sync-scheduled',
  cron: '0 * * * *',
  run: async () => {
    logger.info('Running scheduled inventory sync')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await inventoryBatchSyncTask.trigger({ tenantId, fullSync: false })
    }
    return { triggered: tenants.length }
  },
})

export const collectionSyncScheduledTask = schedules.task({
  id: 'commerce-collection-sync-scheduled',
  cron: '0 5 * * *',
  run: async () => {
    logger.info('Running scheduled collection sync')
    const tenants = ['system']
    for (const tenantId of tenants) {
      await collectionSyncTask.trigger({ tenantId, fullSync: true })
    }
    return { triggered: tenants.length }
  },
})

// ============================================================
// EXPORT ALL TASKS
// ============================================================

export const productCustomerSyncTasks = [
  productSyncTask,
  productBatchSyncTask,
  handleProductSyncTask,
  customerSyncTask,
  customerBatchSyncTask,
  handleCustomerCreatedTask,
  handleCustomerUpdatedTask,
  inventoryUpdateTask,
  inventoryBatchSyncTask,
  handleInventorySyncTask,
  collectionSyncTask,
  collectionProductsSyncTask,
  productFullSyncScheduledTask,
  customerFullSyncScheduledTask,
  inventorySyncScheduledTask,
  collectionSyncScheduledTask,
]
