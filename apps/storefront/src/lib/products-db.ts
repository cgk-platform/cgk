/**
 * Local Product Database Operations
 *
 * Products are synced from Shopify to local PostgreSQL for fast reads.
 * This module provides type-safe queries against the tenant's products table.
 */

import type { Money, PageInfo, PaginatedResult, Product, ProductImage, ProductVariant } from '@cgk/commerce'
import { sql, withTenant } from '@cgk/db'


/**
 * Local product row from database
 */
interface LocalProductRow {
  id: string
  shopify_product_id: string | null
  title: string
  handle: string | null
  description: string | null
  vendor: string | null
  product_type: string | null
  status: 'draft' | 'active' | 'archived'
  tags: string[] | null
  price_cents: number | null
  compare_at_price_cents: number | null
  currency: string
  inventory_quantity: number | null
  featured_image_url: string | null
  images: LocalImageData[]
  variants: LocalVariantData[]
  options: LocalOptionData[]
  seo_title: string | null
  seo_description: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

interface LocalVariantData {
  id: string
  shopify_id?: number
  title: string
  sku?: string
  price_cents: number
  compare_at_price_cents?: number | null
  currency_code?: string
  inventory_quantity?: number
  options?: Array<{ name: string; value: string }>
  image_url?: string
}

interface LocalImageData {
  id: string
  url: string
  alt?: string
  width?: number
  height?: number
  position?: number
}

interface LocalOptionData {
  name: string
  values: string[]
}

/**
 * Query options for product listing
 */
interface ProductQueryOptions {
  first?: number
  after?: string
  query?: string
  sortKey?: string
  reverse?: boolean
  productType?: string
  vendor?: string
  status?: 'draft' | 'active' | 'archived'
}

/**
 * Map local product row to Commerce Product type
 */
function mapLocalProductToCommerce(row: LocalProductRow): Product {
  const currencyCode = row.currency || 'USD'

  // Build price range from variants
  let minPrice = row.price_cents ?? 0
  let maxPrice = row.price_cents ?? 0

  if (row.variants && row.variants.length > 0) {
    const prices = row.variants.map((v) => v.price_cents).filter((p) => p > 0)
    if (prices.length > 0) {
      minPrice = Math.min(...prices)
      maxPrice = Math.max(...prices)
    }
  }

  const formatMoney = (cents: number): Money => ({
    amount: (cents / 100).toFixed(2),
    currencyCode,
  })

  // Map variants
  const variants: ProductVariant[] = (row.variants || []).map((v) => ({
    id: v.id,
    title: v.title,
    sku: v.sku,
    price: formatMoney(v.price_cents),
    compareAtPrice: v.compare_at_price_cents
      ? formatMoney(v.compare_at_price_cents)
      : undefined,
    availableForSale: (v.inventory_quantity ?? 0) > 0,
    selectedOptions: v.options || [],
    image: v.image_url
      ? { id: v.id, url: v.image_url }
      : undefined,
  }))

  // Map images
  const images: ProductImage[] = (row.images || [])
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((img) => ({
      id: img.id,
      url: img.url,
      altText: img.alt,
      width: img.width,
      height: img.height,
    }))

  // Add featured image if not in images array
  if (row.featured_image_url && !images.some((i) => i.url === row.featured_image_url)) {
    images.unshift({
      id: `featured-${row.id}`,
      url: row.featured_image_url,
    })
  }

  return {
    id: row.shopify_product_id || row.id,
    title: row.title,
    handle: row.handle || row.id,
    description: row.description || '',
    descriptionHtml: row.description ?? undefined, // Could be HTML in some cases
    vendor: row.vendor ?? undefined,
    productType: row.product_type ?? undefined,
    tags: row.tags || [],
    variants,
    images,
    priceRange: {
      minVariantPrice: formatMoney(minPrice),
      maxVariantPrice: formatMoney(maxPrice),
    },
    availableForSale: row.status === 'active' && (row.inventory_quantity ?? 0) > 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Get products from local database
 */
export async function getProductsFromLocalDB(
  tenantSlug: string,
  options: ProductQueryOptions = {}
): Promise<PaginatedResult<Product>> {
  const {
    first = 20,
    after,
    productType,
    vendor,
    status = 'active',
  } = options

  const products = await withTenant(tenantSlug, async () => {
    // Build query based on filters
    // Note: We use separate queries for different sort orders to avoid SQL injection
    // while still supporting dynamic sorting

    if (productType && vendor && after) {
      const result = await sql<LocalProductRow>`
        SELECT *
        FROM products
        WHERE status = ${status}
          AND product_type = ${productType}
          AND vendor = ${vendor}
          AND id > ${after}
        ORDER BY created_at DESC
        LIMIT ${first + 1}
      `
      return result.rows
    }

    if (productType && vendor) {
      const result = await sql<LocalProductRow>`
        SELECT *
        FROM products
        WHERE status = ${status}
          AND product_type = ${productType}
          AND vendor = ${vendor}
        ORDER BY created_at DESC
        LIMIT ${first + 1}
      `
      return result.rows
    }

    if (productType && after) {
      const result = await sql<LocalProductRow>`
        SELECT *
        FROM products
        WHERE status = ${status}
          AND product_type = ${productType}
          AND id > ${after}
        ORDER BY created_at DESC
        LIMIT ${first + 1}
      `
      return result.rows
    }

    if (vendor && after) {
      const result = await sql<LocalProductRow>`
        SELECT *
        FROM products
        WHERE status = ${status}
          AND vendor = ${vendor}
          AND id > ${after}
        ORDER BY created_at DESC
        LIMIT ${first + 1}
      `
      return result.rows
    }

    if (productType) {
      const result = await sql<LocalProductRow>`
        SELECT *
        FROM products
        WHERE status = ${status}
          AND product_type = ${productType}
        ORDER BY created_at DESC
        LIMIT ${first + 1}
      `
      return result.rows
    }

    if (vendor) {
      const result = await sql<LocalProductRow>`
        SELECT *
        FROM products
        WHERE status = ${status}
          AND vendor = ${vendor}
        ORDER BY created_at DESC
        LIMIT ${first + 1}
      `
      return result.rows
    }

    if (after) {
      const result = await sql<LocalProductRow>`
        SELECT *
        FROM products
        WHERE status = ${status}
          AND id > ${after}
        ORDER BY created_at DESC
        LIMIT ${first + 1}
      `
      return result.rows
    }

    // Default query
    const result = await sql<LocalProductRow>`
      SELECT *
      FROM products
      WHERE status = ${status}
      ORDER BY created_at DESC
      LIMIT ${first + 1}
    `
    return result.rows
  })

  const hasNextPage = products.length > first
  const items = products.slice(0, first).map(mapLocalProductToCommerce)

  const pageInfo: PageInfo = {
    hasNextPage,
    hasPreviousPage: !!after,
    startCursor: items[0]?.id ?? null,
    endCursor: items[items.length - 1]?.id ?? null,
  }

  return { items, pageInfo }
}

/**
 * Get a single product by handle from local database
 */
export async function getProductByHandleFromLocalDB(
  tenantSlug: string,
  handle: string
): Promise<Product | null> {
  const products = await withTenant(tenantSlug, async () => {
    const result = await sql<LocalProductRow>`
      SELECT *
      FROM products
      WHERE handle = ${handle}
        AND status = 'active'
      LIMIT 1
    `
    return result.rows
  })

  if (products.length === 0) {
    return null
  }

  return mapLocalProductToCommerce(products[0]!)
}

/**
 * Get a product by Shopify ID from local database
 */
export async function getProductByShopifyIdFromLocalDB(
  tenantSlug: string,
  shopifyId: string
): Promise<Product | null> {
  const products = await withTenant(tenantSlug, async () => {
    const result = await sql<LocalProductRow>`
      SELECT *
      FROM products
      WHERE shopify_product_id = ${shopifyId}
        AND status = 'active'
      LIMIT 1
    `
    return result.rows
  })

  if (products.length === 0) {
    return null
  }

  return mapLocalProductToCommerce(products[0]!)
}

/**
 * Search products using PostgreSQL full-text search
 */
export async function searchProductsInLocalDB(
  tenantSlug: string,
  query: string,
  options: { first?: number; after?: string } = {}
): Promise<PaginatedResult<Product>> {
  const { first = 20, after } = options

  const products = await withTenant(tenantSlug, async () => {
    if (after) {
      const result = await sql<LocalProductRow & { rank: number }>`
        SELECT *,
          ts_rank(
            to_tsvector('english', title || ' ' || COALESCE(description, '')),
            plainto_tsquery('english', ${query})
          ) as rank
        FROM products
        WHERE status = 'active'
          AND (
            to_tsvector('english', title || ' ' || COALESCE(description, ''))
            @@ plainto_tsquery('english', ${query})
            OR title ILIKE ${'%' + query + '%'}
            OR description ILIKE ${'%' + query + '%'}
          )
          AND id > ${after}
        ORDER BY rank DESC, created_at DESC
        LIMIT ${first + 1}
      `
      return result.rows
    }

    const result = await sql<LocalProductRow & { rank: number }>`
      SELECT *,
        ts_rank(
          to_tsvector('english', title || ' ' || COALESCE(description, '')),
          plainto_tsquery('english', ${query})
        ) as rank
      FROM products
      WHERE status = 'active'
        AND (
          to_tsvector('english', title || ' ' || COALESCE(description, ''))
          @@ plainto_tsquery('english', ${query})
          OR title ILIKE ${'%' + query + '%'}
          OR description ILIKE ${'%' + query + '%'}
        )
      ORDER BY rank DESC, created_at DESC
      LIMIT ${first + 1}
    `
    return result.rows
  })

  const hasNextPage = products.length > first
  const items = products.slice(0, first).map(mapLocalProductToCommerce)

  const pageInfo: PageInfo = {
    hasNextPage,
    hasPreviousPage: !!after,
    startCursor: items[0]?.id ?? null,
    endCursor: items[items.length - 1]?.id ?? null,
  }

  return { items, pageInfo }
}

/**
 * Get product count for a tenant
 */
export async function getProductCount(
  tenantSlug: string,
  status: 'draft' | 'active' | 'archived' = 'active'
): Promise<number> {
  const result = await withTenant(tenantSlug, async () => {
    const count = await sql<{ count: string }>`
      SELECT COUNT(*) as count
      FROM products
      WHERE status = ${status}
    `
    return count.rows[0]?.count ?? '0'
  })

  return parseInt(result, 10)
}

/**
 * Get unique product types for a tenant
 */
export async function getProductTypes(tenantSlug: string): Promise<string[]> {
  const result = await withTenant(tenantSlug, async () => {
    const types = await sql<{ product_type: string }>`
      SELECT DISTINCT product_type
      FROM products
      WHERE status = 'active'
        AND product_type IS NOT NULL
        AND product_type != ''
      ORDER BY product_type
    `
    return types.rows.map((r) => r.product_type)
  })

  return result
}

/**
 * Get unique vendors for a tenant
 */
export async function getVendors(tenantSlug: string): Promise<string[]> {
  const result = await withTenant(tenantSlug, async () => {
    const vendors = await sql<{ vendor: string }>`
      SELECT DISTINCT vendor
      FROM products
      WHERE status = 'active'
        AND vendor IS NOT NULL
        AND vendor != ''
      ORDER BY vendor
    `
    return vendors.rows.map((r) => r.vendor)
  })

  return result
}

/**
 * Get related products by product type, excluding current product
 */
export async function getRelatedProducts(
  tenantSlug: string,
  productType: string,
  currentProductId: string,
  limit: number = 4
): Promise<Product[]> {
  const products = await withTenant(tenantSlug, async () => {
    const result = await sql<LocalProductRow>`
      SELECT *
      FROM products
      WHERE status = 'active'
        AND product_type = ${productType}
        AND id != ${currentProductId}
        AND shopify_product_id != ${currentProductId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return result.rows
  })

  return products.map(mapLocalProductToCommerce)
}

/**
 * Get products by vendor, excluding current product
 */
export async function getProductsByVendor(
  tenantSlug: string,
  vendor: string,
  currentProductId: string,
  limit: number = 4
): Promise<Product[]> {
  const products = await withTenant(tenantSlug, async () => {
    const result = await sql<LocalProductRow>`
      SELECT *
      FROM products
      WHERE status = 'active'
        AND vendor = ${vendor}
        AND id != ${currentProductId}
        AND shopify_product_id != ${currentProductId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return result.rows
  })

  return products.map(mapLocalProductToCommerce)
}

/**
 * Get products by handles (for recently viewed)
 */
export async function getProductsByHandles(
  tenantSlug: string,
  handles: string[]
): Promise<Product[]> {
  if (handles.length === 0) return []

  // Fetch products one by one since we can't use array parameters directly
  // with @vercel/postgres template literals
  const products: LocalProductRow[] = []

  for (const handle of handles) {
    const result = await withTenant(tenantSlug, async () => {
      const rows = await sql<LocalProductRow>`
        SELECT *
        FROM products
        WHERE status = 'active'
          AND handle = ${handle}
        LIMIT 1
      `
      return rows.rows[0]
    })

    if (result) {
      products.push(result)
    }
  }

  return products.map(mapLocalProductToCommerce)
}
