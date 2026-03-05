/**
 * Product and Customer Sync Job Handlers
 *
 * Background jobs for Shopify data synchronization:
 * - Product sync from Shopify
 * - Customer sync from Shopify
 * - Inventory updates
 * - Collection sync
 *
 * INTEGRATION REQUIREMENTS:
 * - Tenant must have Shopify credentials configured via OAuth or admin setup
 * - Use `getTenantShopifyClient(tenantId)` from @cgk-platform/integrations
 * - Shopify webhooks registered for products/*, customers/*, inventory_levels/*
 *
 * IMPLEMENTATION STATUS:
 * These handlers define the job structure and validation.
 * Full implementation requires:
 * 1. Shopify GraphQL API integration via @cgk-platform/shopify
 * 2. Database operations via withTenant() for tenant isolation
 * 3. Pagination support for large catalogs (cursor-based)
 *
 * SCHEDULED SYNCS:
 * - Product full sync: Daily at 3 AM
 * - Customer full sync: Daily at 4 AM
 * - Inventory sync: Every hour
 * - Collection sync: Daily at 5 AM
 *
 * @ai-pattern tenant-isolation
 * @ai-critical All handlers require tenantId
 */

import { defineJob } from '../../define'
import type {
  ProductSyncPayload,
  CustomerCreatedPayload,
  CustomerUpdatedPayload,
  InventorySyncPayload,
  TenantEvent,
} from '../../events'
import type { JobResult } from '../../types'
// @ts-expect-error - tsup bundling creates single-line .d.ts that TS can't parse properly
import { getShopifyCredentialsBySlug, createAdminClient } from '@cgk-platform/shopify'
import { sql, withTenant } from '@cgk-platform/db'
import { logger } from '@cgk-platform/logging'

// ---------------------------------------------------------------------------
// Job Payloads
// ---------------------------------------------------------------------------

export interface ProductSyncFromShopifyPayload {
  tenantId: string
  productId?: string
  shopifyProductId?: string
  fullSync?: boolean
  cursor?: string
  limit?: number
}

export interface ProductBatchSyncPayload {
  tenantId: string
  productIds?: string[]
  shopifyProductIds?: string[]
  collectionId?: string
  updatedSince?: string
}

export interface CustomerSyncFromShopifyPayload {
  tenantId: string
  customerId?: string
  shopifyCustomerId?: string
  fullSync?: boolean
  cursor?: string
  limit?: number
}

export interface CustomerBatchSyncPayload {
  tenantId: string
  customerIds?: string[]
  shopifyCustomerIds?: string[]
  createdSince?: string
  updatedSince?: string
}

export interface InventoryUpdatePayload {
  tenantId: string
  productId?: string
  variantId?: string
  shopifyVariantId?: string
  locationId?: string
  shopifyLocationId?: string
  quantityAdjustment?: number
  newQuantity?: number
}

export interface InventoryBatchSyncPayload {
  tenantId: string
  locationId?: string
  fullSync?: boolean
  cursor?: string
}

export interface CollectionSyncPayload {
  tenantId: string
  collectionId?: string
  shopifyCollectionId?: string
  fullSync?: boolean
}

export interface CollectionProductsSyncPayload {
  tenantId: string
  collectionId: string
  shopifyCollectionId?: string
}

// ---------------------------------------------------------------------------
// Retry Configuration
// ---------------------------------------------------------------------------

const SYNC_RETRY = {
  maxAttempts: 5,
  backoff: 'exponential' as const,
  initialDelay: 2000,
  maxDelay: 60000,
}

const BATCH_SYNC_RETRY = {
  maxAttempts: 3,
  backoff: 'exponential' as const,
  initialDelay: 5000,
  maxDelay: 120000,
}

// ---------------------------------------------------------------------------
// Product Sync Jobs
// ---------------------------------------------------------------------------

/**
 * Sync a single product from Shopify
 *
 * Fetches product data including variants, images, and metafields.
 */
export const productSyncJob = defineJob<TenantEvent<ProductSyncFromShopifyPayload>>({
  name: 'commerce.productSync',
  handler: async (job): Promise<JobResult> => {
    const {
      tenantId,
      productId,
      shopifyProductId,
      fullSync = false,
      cursor,
      limit = 50,
    } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    logger.info(`[commerce.productSync] Syncing product`, {
      tenantId,
      productId,
      shopifyProductId,
      fullSync,
      cursor,
      limit,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. If productId/shopifyProductId provided, fetch single product
    // 2. If fullSync, fetch all products with pagination
    // 3. For each product:
    //    a. Fetch product data from Shopify GraphQL API
    //    b. Fetch variants with inventory
    //    c. Fetch images
    //    d. Fetch metafields if configured
    //    e. Upsert to tenant database
    // 4. Handle deleted products (mark inactive)
    // 5. Return pagination cursor if more products

    return {
      success: true,
      data: {
        tenantId,
        syncType: fullSync ? 'full' : 'single',
        productsSynced: 0,
        variantsSynced: 0,
        nextCursor: undefined,
        syncedAt: new Date().toISOString(),
      },
    }
  },
  retry: SYNC_RETRY,
})

/**
 * Batch sync multiple products
 *
 * Used for syncing products from a collection or by IDs.
 */
export const productBatchSyncJob = defineJob<TenantEvent<ProductBatchSyncPayload>>({
  name: 'commerce.productBatchSync',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, productIds, shopifyProductIds, collectionId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    logger.info(`[commerce.productBatchSync] Starting sync`, {
      tenantId,
      productIds: productIds?.length,
      shopifyProductIds: shopifyProductIds?.length,
      collectionId,
      jobId: job.id,
    })

    try {
      // 1. Get Shopify credentials for tenant
      // Convert tenantId (UUID) to slug
      const tenantResult = await sql`SELECT slug FROM public.organizations WHERE id = ${tenantId}`
      if (tenantResult.rows.length === 0) {
        throw new Error(`Tenant ${tenantId} not found`)
      }
      const tenantSlug = (tenantResult.rows[0] as { slug: string }).slug

      const credentials = await getShopifyCredentialsBySlug(tenantSlug)

      // 2. Create Admin API client
      const admin = createAdminClient({
        storeDomain: credentials.shop,
        adminAccessToken: credentials.accessToken,
        apiVersion: credentials.apiVersion,
      })

      // 3. Fetch products from Shopify
      const query = `
        query GetProducts($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            edges {
              node {
                id
                legacyResourceId
                title
                handle
                description
                descriptionHtml
                vendor
                productType
                tags
                status
                totalInventory
                createdAt
                updatedAt
                publishedAt
                seo {
                  title
                  description
                }
                featuredImage {
                  id
                  url
                  altText
                  width
                  height
                }
                images(first: 20) {
                  edges {
                    node {
                      id
                      url
                      altText
                      width
                      height
                    }
                  }
                }
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      sku
                      price
                      compareAtPrice
                      inventoryQuantity
                      availableForSale
                      selectedOptions {
                        name
                        value
                      }
                    }
                  }
                }
                options {
                  id
                  name
                  values
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `

      interface ProductNode {
        id: string
        legacyResourceId: string
        title: string
        handle: string
        description: string
        descriptionHtml: string
        vendor: string
        productType: string
        tags: string[]
        status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
        totalInventory: number
        createdAt: string
        updatedAt: string
        publishedAt: string | null
        seo: { title: string | null; description: string | null }
        featuredImage: {
          id: string
          url: string
          altText: string | null
          width: number
          height: number
        } | null
        images: {
          edges: Array<{
            node: { id: string; url: string; altText: string | null; width: number; height: number }
          }>
        }
        variants: {
          edges: Array<{
            node: {
              id: string
              title: string
              sku: string
              price: string
              compareAtPrice: string | null
              inventoryQuantity: number
              availableForSale: boolean
              selectedOptions: Array<{ name: string; value: string }>
            }
          }>
        }
        options: Array<{ id: string; name: string; values: string[] }>
      }

      interface ProductsResponse {
        products: {
          edges: Array<{ node: ProductNode }>
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
        }
      }

      const result = (await admin.query(query, { first: 250, after: null })) as ProductsResponse

      const products = result.products.edges.map((edge: { node: ProductNode }) => edge.node)
      logger.info(`[commerce.productBatchSync] Fetched ${products.length} products from Shopify`)

      // 4. Transform and insert into database
      let productsSynced = 0
      let variantsSynced = 0

      await withTenant(tenantSlug, async () => {
        for (const product of products) {
          // Convert price from string to cents
          const minPrice =
            product.variants.edges.length > 0
              ? Math.min(
                  ...product.variants.edges.map(
                    (v: { node: { price: string } }) => parseFloat(v.node.price) * 100
                  )
                )
              : 0

          // Map status
          const status =
            product.status === 'ACTIVE'
              ? 'active'
              : product.status === 'DRAFT'
                ? 'draft'
                : 'archived'

          // Prepare JSONB data
          const images = product.images.edges.map(
            (e: {
              node: {
                id: string
                url: string
                altText: string | null
                width: number
                height: number
              }
            }) => ({
              id: e.node.id,
              url: e.node.url,
              altText: e.node.altText,
              width: e.node.width,
              height: e.node.height,
            })
          )

          const variants = product.variants.edges.map(
            (e: {
              node: {
                id: string
                title: string
                sku: string
                price: string
                compareAtPrice: string | null
                inventoryQuantity: number
                availableForSale: boolean
                selectedOptions: Array<{ name: string; value: string }>
              }
            }) => ({
              id: e.node.id,
              title: e.node.title,
              sku: e.node.sku,
              price_cents: Math.round(parseFloat(e.node.price) * 100),
              compare_at_price_cents: e.node.compareAtPrice
                ? Math.round(parseFloat(e.node.compareAtPrice) * 100)
                : null,
              inventory_quantity: e.node.inventoryQuantity,
              available_for_sale: e.node.availableForSale,
              selected_options: e.node.selectedOptions,
            })
          )

          const options = product.options.map(
            (o: { id: string; name: string; values: string[] }) => ({
              id: o.id,
              name: o.name,
              values: o.values,
            })
          )

          // Format tags array for PostgreSQL
          const tagsArray = `{${product.tags.map((t: string) => `"${t.replace(/"/g, '\\"')}"`).join(',')}}`

          // Upsert product (within withTenant() block)
          await sql`
            INSERT INTO products (
              id,
              shopify_product_id,
              shopify_gid,
              title,
              handle,
              description,
              description_html,
              vendor,
              product_type,
              status,
              tags,
              price_cents,
              currency,
              inventory_quantity,
              featured_image_url,
              images,
              variants,
              options,
              seo_title,
              seo_description,
              published_at,
              synced_at,
              created_at,
              updated_at
            ) VALUES (
              ${product.handle || product.legacyResourceId},
              ${product.legacyResourceId},
              ${product.id},
              ${product.title},
              ${product.handle},
              ${product.description},
              ${product.descriptionHtml},
              ${product.vendor},
              ${product.productType},
              ${status}::product_status,
              ${tagsArray}::TEXT[],
              ${minPrice},
              'USD',
              ${product.totalInventory},
              ${product.featuredImage?.url || null},
              ${JSON.stringify(images)}::JSONB,
              ${JSON.stringify(variants)}::JSONB,
              ${JSON.stringify(options)}::JSONB,
              ${product.seo.title},
              ${product.seo.description},
              ${product.publishedAt ? new Date(product.publishedAt).toISOString() : null},
              NOW(),
              ${product.createdAt},
              ${product.updatedAt}
            )
            ON CONFLICT (shopify_product_id) DO UPDATE SET
              shopify_gid = EXCLUDED.shopify_gid,
              title = EXCLUDED.title,
              handle = EXCLUDED.handle,
              description = EXCLUDED.description,
              description_html = EXCLUDED.description_html,
              vendor = EXCLUDED.vendor,
              product_type = EXCLUDED.product_type,
              status = EXCLUDED.status,
              tags = ${tagsArray}::TEXT[],
              price_cents = EXCLUDED.price_cents,
              inventory_quantity = EXCLUDED.inventory_quantity,
              featured_image_url = EXCLUDED.featured_image_url,
              images = EXCLUDED.images,
              variants = EXCLUDED.variants,
              options = EXCLUDED.options,
              seo_title = EXCLUDED.seo_title,
              seo_description = EXCLUDED.seo_description,
              published_at = EXCLUDED.published_at,
              synced_at = NOW(),
              updated_at = EXCLUDED.updated_at
          `

          productsSynced++
          variantsSynced += variants.length
        }
      })

      logger.info(
        `[commerce.productBatchSync] Synced ${productsSynced} products, ${variantsSynced} variants`
      )

      return {
        success: true,
        data: {
          tenantId,
          productsSynced,
          variantsSynced,
          hasMore: result.products.pageInfo.hasNextPage,
          nextCursor: result.products.pageInfo.endCursor,
          syncedAt: new Date().toISOString(),
        },
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error(`[commerce.productBatchSync] Error:`, err instanceof Error ? err : undefined)
      return {
        success: false,
        error: {
          message: err.message,
          code: 'SYNC_ERROR',
          retryable: true,
        },
      }
    }
  },
  retry: BATCH_SYNC_RETRY,
})

/**
 * Handle product.sync event
 */
export const handleProductSyncJob = defineJob<TenantEvent<ProductSyncPayload>>({
  name: 'commerce.handleProductSync',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, productId, fullSync } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    logger.info(`[commerce.handleProductSync] Product sync requested`, {
      tenantId,
      productId,
      fullSync,
      jobId: job.id,
    })

    // Dispatch to appropriate sync job
    // This is the entry point from product.sync events

    return {
      success: true,
      data: {
        tenantId,
        productId,
        fullSync,
        dispatchedAt: new Date().toISOString(),
      },
    }
  },
  retry: SYNC_RETRY,
})

// ---------------------------------------------------------------------------
// Customer Sync Jobs
// ---------------------------------------------------------------------------

/**
 * Sync a single customer from Shopify
 *
 * Fetches customer data including addresses, tags, and metafields.
 */
export const customerSyncJob = defineJob<TenantEvent<CustomerSyncFromShopifyPayload>>({
  name: 'commerce.customerSync',
  handler: async (job): Promise<JobResult> => {
    const {
      tenantId,
      customerId,
      shopifyCustomerId,
      fullSync = false,
      cursor,
      limit = 100,
    } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    logger.info(`[commerce.customerSync] Syncing customer`, {
      tenantId,
      customerId,
      shopifyCustomerId,
      fullSync,
      cursor,
      limit,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. If customerId/shopifyCustomerId provided, fetch single customer
    // 2. If fullSync, fetch all customers with pagination
    // 3. For each customer:
    //    a. Fetch customer data from Shopify GraphQL API
    //    b. Fetch addresses
    //    c. Fetch order count and total spent
    //    d. Fetch metafields if configured
    //    e. Upsert to tenant database
    // 4. Update customer segments/tags
    // 5. Return pagination cursor if more customers

    return {
      success: true,
      data: {
        tenantId,
        syncType: fullSync ? 'full' : 'single',
        customersSynced: 0,
        nextCursor: undefined,
        syncedAt: new Date().toISOString(),
      },
    }
  },
  retry: SYNC_RETRY,
})

/**
 * Batch sync multiple customers
 *
 * Used for syncing customers by IDs or by criteria.
 */
export const customerBatchSyncJob = defineJob<TenantEvent<CustomerBatchSyncPayload>>({
  name: 'commerce.customerBatchSync',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, customerIds, shopifyCustomerIds, createdSince, updatedSince } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    logger.info(`[commerce.customerBatchSync] Batch syncing customers`, {
      tenantId,
      customerCount: customerIds?.length || shopifyCustomerIds?.length || 'all',
      createdSince,
      updatedSince,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Build query based on parameters
    // 2. Fetch customers in batches
    // 3. Queue individual customer sync jobs
    // 4. Track progress

    return {
      success: true,
      data: {
        tenantId,
        customersQueued: 0,
        createdSince,
        updatedSince,
        queuedAt: new Date().toISOString(),
      },
    }
  },
  retry: BATCH_SYNC_RETRY,
})

/**
 * Handle customer.created event
 */
export const handleCustomerCreatedJob = defineJob<TenantEvent<CustomerCreatedPayload>>({
  name: 'commerce.handleCustomerCreated',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, customerId, email, shopifyCustomerId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    logger.info(`[commerce.handleCustomerCreated] New customer`, {
      tenantId,
      customerId,
      email,
      shopifyCustomerId,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Sync full customer data from Shopify
    // 2. Create customer record in tenant database
    // 3. Apply any auto-tagging rules
    // 4. Trigger welcome workflows if configured
    // 5. Update customer count metrics

    return {
      success: true,
      data: {
        tenantId,
        customerId,
        email,
        createdAt: new Date().toISOString(),
      },
    }
  },
  retry: SYNC_RETRY,
})

/**
 * Handle customer.updated event
 */
export const handleCustomerUpdatedJob = defineJob<TenantEvent<CustomerUpdatedPayload>>({
  name: 'commerce.handleCustomerUpdated',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, customerId, changes } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    logger.info(`[commerce.handleCustomerUpdated] Customer updated`, {
      tenantId,
      customerId,
      changes,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Sync updated customer data from Shopify
    // 2. Update customer record in tenant database
    // 3. Re-evaluate segment membership
    // 4. Trigger any update-based workflows

    return {
      success: true,
      data: {
        tenantId,
        customerId,
        changes,
        updatedAt: new Date().toISOString(),
      },
    }
  },
  retry: SYNC_RETRY,
})

// ---------------------------------------------------------------------------
// Inventory Sync Jobs
// ---------------------------------------------------------------------------

/**
 * Update inventory for a single variant/location
 */
export const inventoryUpdateJob = defineJob<TenantEvent<InventoryUpdatePayload>>({
  name: 'commerce.inventoryUpdate',
  handler: async (job): Promise<JobResult> => {
    const {
      tenantId,
      productId,
      variantId,
      shopifyVariantId,
      locationId,
      shopifyLocationId,
      quantityAdjustment,
      newQuantity,
    } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    logger.info(`[commerce.inventoryUpdate] Updating inventory`, {
      tenantId,
      productId,
      variantId,
      shopifyVariantId,
      locationId,
      quantityAdjustment,
      newQuantity,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Get current inventory level from Shopify
    // 2. Apply adjustment or set new quantity
    // 3. Update local inventory record
    // 4. Check low stock thresholds
    // 5. Trigger alerts if below threshold

    return {
      success: true,
      data: {
        tenantId,
        variantId: variantId || shopifyVariantId,
        locationId: locationId || shopifyLocationId,
        previousQuantity: 0,
        newQuantity: newQuantity || 0,
        updatedAt: new Date().toISOString(),
      },
    }
  },
  retry: SYNC_RETRY,
})

/**
 * Batch sync inventory from Shopify
 */
export const inventoryBatchSyncJob = defineJob<TenantEvent<InventoryBatchSyncPayload>>({
  name: 'commerce.inventoryBatchSync',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, locationId, fullSync = false, cursor } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    logger.info(`[commerce.inventoryBatchSync] Batch syncing inventory`, {
      tenantId,
      locationId: locationId || 'all',
      fullSync,
      cursor,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Get inventory levels from Shopify
    // 2. For each item, update local records
    // 3. Handle pagination
    // 4. Calculate discrepancies
    // 5. Return sync report

    return {
      success: true,
      data: {
        tenantId,
        locationId,
        itemsSynced: 0,
        discrepancies: 0,
        nextCursor: undefined,
        syncedAt: new Date().toISOString(),
      },
    }
  },
  retry: BATCH_SYNC_RETRY,
})

/**
 * Handle inventory.sync event
 */
export const handleInventorySyncJob = defineJob<TenantEvent<InventorySyncPayload>>({
  name: 'commerce.handleInventorySync',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, productId, variantId, locationId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    logger.info(`[commerce.handleInventorySync] Inventory sync requested`, {
      tenantId,
      productId,
      variantId,
      locationId,
      jobId: job.id,
    })

    // Dispatch to appropriate sync job

    return {
      success: true,
      data: {
        tenantId,
        productId,
        variantId,
        locationId,
        dispatchedAt: new Date().toISOString(),
      },
    }
  },
  retry: SYNC_RETRY,
})

// ---------------------------------------------------------------------------
// Collection Sync Jobs
// ---------------------------------------------------------------------------

/**
 * Sync collections from Shopify
 */
export const collectionSyncJob = defineJob<TenantEvent<CollectionSyncPayload>>({
  name: 'commerce.collectionSync',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, collectionId, shopifyCollectionId, fullSync = false } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    logger.info(`[commerce.collectionSync] Syncing collection`, {
      tenantId,
      collectionId,
      shopifyCollectionId,
      fullSync,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. If single collection, fetch from Shopify
    // 2. If fullSync, fetch all collections
    // 3. For each collection:
    //    a. Sync collection metadata
    //    b. Sync collection rules (if smart collection)
    //    c. Sync product membership
    // 4. Handle deleted collections

    return {
      success: true,
      data: {
        tenantId,
        collectionsSynced: 0,
        productsLinked: 0,
        syncedAt: new Date().toISOString(),
      },
    }
  },
  retry: SYNC_RETRY,
})

/**
 * Sync products in a specific collection
 */
export const collectionProductsSyncJob = defineJob<TenantEvent<CollectionProductsSyncPayload>>({
  name: 'commerce.collectionProductsSync',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, collectionId, shopifyCollectionId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    if (!collectionId && !shopifyCollectionId) {
      return {
        success: false,
        error: {
          message: 'Either collectionId or shopifyCollectionId is required',
          code: 'MISSING_COLLECTION_ID',
          retryable: false,
        },
      }
    }

    logger.info(`[commerce.collectionProductsSync] Syncing collection products`, {
      tenantId,
      collectionId,
      shopifyCollectionId,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Get collection product list from Shopify
    // 2. Update product-collection relationships
    // 3. Handle removed products
    // 4. Trigger product syncs if products are new

    return {
      success: true,
      data: {
        tenantId,
        collectionId: collectionId || shopifyCollectionId,
        productsAdded: 0,
        productsRemoved: 0,
        syncedAt: new Date().toISOString(),
      },
    }
  },
  retry: SYNC_RETRY,
})

// ---------------------------------------------------------------------------
// Schedules
// ---------------------------------------------------------------------------

export const PRODUCT_CUSTOMER_SCHEDULES = {
  // Full product sync daily at 3 AM
  productFullSync: { cron: '0 3 * * *' },
  // Full customer sync daily at 4 AM
  customerFullSync: { cron: '0 4 * * *' },
  // Inventory sync every hour
  inventorySync: { cron: '0 * * * *' },
  // Collection sync daily at 5 AM
  collectionSync: { cron: '0 5 * * *' },
} as const

// ---------------------------------------------------------------------------
// Export All Jobs
// ---------------------------------------------------------------------------

export const productCustomerSyncJobs = [
  // Product jobs
  productSyncJob,
  productBatchSyncJob,
  handleProductSyncJob,
  // Customer jobs
  customerSyncJob,
  customerBatchSyncJob,
  handleCustomerCreatedJob,
  handleCustomerUpdatedJob,
  // Inventory jobs
  inventoryUpdateJob,
  inventoryBatchSyncJob,
  handleInventorySyncJob,
  // Collection jobs
  collectionSyncJob,
  collectionProductsSyncJob,
]
