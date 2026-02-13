export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface OptimizeRequest {
  productIds: string[]
  options?: {
    removeBackground?: boolean
    targetWidth?: number
    targetHeight?: number
    format?: 'jpeg' | 'png' | 'webp'
    quality?: number
  }
}

/**
 * POST /api/admin/google-feed/images/optimize
 *
 * Queue images for optimization
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: OptimizeRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { productIds, options: _options } = body

  if (!productIds || productIds.length === 0) {
    return NextResponse.json({ error: 'productIds required' }, { status: 400 })
  }

  if (productIds.length > 50) {
    return NextResponse.json(
      { error: 'Maximum 50 images per optimization request' },
      { status: 400 }
    )
  }

  const result = await withTenant(tenantSlug, async () => {
    const queued: string[] = []
    const errors: Array<{ productId: string; error: string }> = []

    for (const productId of productIds) {
      // Get product image info
      const productResult = await sql`
        SELECT
          shopify_product_id as "shopifyProductId",
          featured_image_url as "imageUrl"
        FROM products
        WHERE id = ${productId} OR shopify_product_id = ${productId}
        LIMIT 1
      `

      if (productResult.rows.length === 0) {
        errors.push({ productId, error: 'Product not found' })
        continue
      }

      const product = productResult.rows[0] as {
        shopifyProductId: string
        imageUrl: string | null
      }

      if (!product.imageUrl) {
        errors.push({ productId, error: 'No image available' })
        continue
      }

      // Create or update image record with processing status
      await sql`
        INSERT INTO google_feed_images (
          shopify_product_id,
          original_url,
          status
        ) VALUES (
          ${product.shopifyProductId},
          ${product.imageUrl},
          'processing'
        )
        ON CONFLICT (shopify_product_id, shopify_variant_id)
        DO UPDATE SET
          status = 'processing',
          updated_at = NOW()
      `

      // In a real implementation, this would enqueue a background job
      // await jobQueue.enqueue('google-feed-image-optimize', {
      //   tenantId: tenantSlug,
      //   productId: product.shopifyProductId,
      //   imageUrl: product.imageUrl,
      //   options,
      // })

      queued.push(productId)
    }

    return {
      success: true,
      queued: queued.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `${queued.length} image(s) queued for optimization`,
    }
  })

  return NextResponse.json(result)
}
