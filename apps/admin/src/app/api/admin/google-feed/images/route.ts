export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/google-feed/images
 *
 * List product images with their Google Feed status
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  const status = searchParams.get('status') || 'all'
  const missingOnly = searchParams.get('missingOnly') === 'true'
  const offset = (page - 1) * limit

  const result = await withTenant(tenantSlug, async () => {
    // Helper to run the appropriate query based on filters
    async function getImagesQuery() {
      // Base case: status = 'all', missingOnly = false
      if (!missingOnly && status === 'all') {
        return sql`
          SELECT
            p.id as "productId",
            p.title as "productTitle",
            p.handle,
            p.featured_image_url as "imageUrl",
            p.images,
            gfi.id as "feedImageId",
            gfi.original_url as "originalUrl",
            gfi.optimized_url as "optimizedUrl",
            gfi.original_width as "originalWidth",
            gfi.original_height as "originalHeight",
            gfi.optimized_width as "optimizedWidth",
            gfi.optimized_height as "optimizedHeight",
            gfi.status,
            gfi.google_status as "googleStatus",
            gfi.google_issues as "googleIssues",
            gfi.compression_applied as "compressionApplied",
            gfi.background_removed as "backgroundRemoved"
          FROM products p
          LEFT JOIN google_feed_images gfi ON gfi.shopify_product_id = p.shopify_product_id
          WHERE p.status = 'active'
          ORDER BY p.updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }

      // missingOnly = true, status = 'all'
      if (missingOnly && status === 'all') {
        return sql`
          SELECT
            p.id as "productId",
            p.title as "productTitle",
            p.handle,
            p.featured_image_url as "imageUrl",
            p.images,
            gfi.id as "feedImageId",
            gfi.original_url as "originalUrl",
            gfi.optimized_url as "optimizedUrl",
            gfi.original_width as "originalWidth",
            gfi.original_height as "originalHeight",
            gfi.optimized_width as "optimizedWidth",
            gfi.optimized_height as "optimizedHeight",
            gfi.status,
            gfi.google_status as "googleStatus",
            gfi.google_issues as "googleIssues",
            gfi.compression_applied as "compressionApplied",
            gfi.background_removed as "backgroundRemoved"
          FROM products p
          LEFT JOIN google_feed_images gfi ON gfi.shopify_product_id = p.shopify_product_id
          WHERE p.status = 'active' AND p.featured_image_url IS NULL
          ORDER BY p.updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }

      // status = 'approved', missingOnly = false
      if (!missingOnly && status === 'approved') {
        return sql`
          SELECT
            p.id as "productId",
            p.title as "productTitle",
            p.handle,
            p.featured_image_url as "imageUrl",
            p.images,
            gfi.id as "feedImageId",
            gfi.original_url as "originalUrl",
            gfi.optimized_url as "optimizedUrl",
            gfi.original_width as "originalWidth",
            gfi.original_height as "originalHeight",
            gfi.optimized_width as "optimizedWidth",
            gfi.optimized_height as "optimizedHeight",
            gfi.status,
            gfi.google_status as "googleStatus",
            gfi.google_issues as "googleIssues",
            gfi.compression_applied as "compressionApplied",
            gfi.background_removed as "backgroundRemoved"
          FROM products p
          LEFT JOIN google_feed_images gfi ON gfi.shopify_product_id = p.shopify_product_id
          WHERE p.status = 'active' AND gfi.status = 'approved'
          ORDER BY p.updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }

      // status = 'approved', missingOnly = true
      if (missingOnly && status === 'approved') {
        return sql`
          SELECT
            p.id as "productId",
            p.title as "productTitle",
            p.handle,
            p.featured_image_url as "imageUrl",
            p.images,
            gfi.id as "feedImageId",
            gfi.original_url as "originalUrl",
            gfi.optimized_url as "optimizedUrl",
            gfi.original_width as "originalWidth",
            gfi.original_height as "originalHeight",
            gfi.optimized_width as "optimizedWidth",
            gfi.optimized_height as "optimizedHeight",
            gfi.status,
            gfi.google_status as "googleStatus",
            gfi.google_issues as "googleIssues",
            gfi.compression_applied as "compressionApplied",
            gfi.background_removed as "backgroundRemoved"
          FROM products p
          LEFT JOIN google_feed_images gfi ON gfi.shopify_product_id = p.shopify_product_id
          WHERE p.status = 'active' AND p.featured_image_url IS NULL AND gfi.status = 'approved'
          ORDER BY p.updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }

      // status = 'issues', missingOnly = false
      if (!missingOnly && status === 'issues') {
        return sql`
          SELECT
            p.id as "productId",
            p.title as "productTitle",
            p.handle,
            p.featured_image_url as "imageUrl",
            p.images,
            gfi.id as "feedImageId",
            gfi.original_url as "originalUrl",
            gfi.optimized_url as "optimizedUrl",
            gfi.original_width as "originalWidth",
            gfi.original_height as "originalHeight",
            gfi.optimized_width as "optimizedWidth",
            gfi.optimized_height as "optimizedHeight",
            gfi.status,
            gfi.google_status as "googleStatus",
            gfi.google_issues as "googleIssues",
            gfi.compression_applied as "compressionApplied",
            gfi.background_removed as "backgroundRemoved"
          FROM products p
          LEFT JOIN google_feed_images gfi ON gfi.shopify_product_id = p.shopify_product_id
          WHERE p.status = 'active' AND (gfi.status IN ('disapproved', 'failed') OR gfi.status IS NULL)
          ORDER BY p.updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }

      // status = 'issues', missingOnly = true
      return sql`
        SELECT
          p.id as "productId",
          p.title as "productTitle",
          p.handle,
          p.featured_image_url as "imageUrl",
          p.images,
          gfi.id as "feedImageId",
          gfi.original_url as "originalUrl",
          gfi.optimized_url as "optimizedUrl",
          gfi.original_width as "originalWidth",
          gfi.original_height as "originalHeight",
          gfi.optimized_width as "optimizedWidth",
          gfi.optimized_height as "optimizedHeight",
          gfi.status,
          gfi.google_status as "googleStatus",
          gfi.google_issues as "googleIssues",
          gfi.compression_applied as "compressionApplied",
          gfi.background_removed as "backgroundRemoved"
        FROM products p
        LEFT JOIN google_feed_images gfi ON gfi.shopify_product_id = p.shopify_product_id
        WHERE p.status = 'active' AND p.featured_image_url IS NULL AND (gfi.status IN ('disapproved', 'failed') OR gfi.status IS NULL)
        ORDER BY p.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    async function getCountQuery() {
      // Base case: status = 'all', missingOnly = false
      if (!missingOnly && status === 'all') {
        return sql`
          SELECT COUNT(*) as count
          FROM products p
          LEFT JOIN google_feed_images gfi ON gfi.shopify_product_id = p.shopify_product_id
          WHERE p.status = 'active'
        `
      }

      // missingOnly = true, status = 'all'
      if (missingOnly && status === 'all') {
        return sql`
          SELECT COUNT(*) as count
          FROM products p
          LEFT JOIN google_feed_images gfi ON gfi.shopify_product_id = p.shopify_product_id
          WHERE p.status = 'active' AND p.featured_image_url IS NULL
        `
      }

      // status = 'approved', missingOnly = false
      if (!missingOnly && status === 'approved') {
        return sql`
          SELECT COUNT(*) as count
          FROM products p
          LEFT JOIN google_feed_images gfi ON gfi.shopify_product_id = p.shopify_product_id
          WHERE p.status = 'active' AND gfi.status = 'approved'
        `
      }

      // status = 'approved', missingOnly = true
      if (missingOnly && status === 'approved') {
        return sql`
          SELECT COUNT(*) as count
          FROM products p
          LEFT JOIN google_feed_images gfi ON gfi.shopify_product_id = p.shopify_product_id
          WHERE p.status = 'active' AND p.featured_image_url IS NULL AND gfi.status = 'approved'
        `
      }

      // status = 'issues', missingOnly = false
      if (!missingOnly && status === 'issues') {
        return sql`
          SELECT COUNT(*) as count
          FROM products p
          LEFT JOIN google_feed_images gfi ON gfi.shopify_product_id = p.shopify_product_id
          WHERE p.status = 'active' AND (gfi.status IN ('disapproved', 'failed') OR gfi.status IS NULL)
        `
      }

      // status = 'issues', missingOnly = true
      return sql`
        SELECT COUNT(*) as count
        FROM products p
        LEFT JOIN google_feed_images gfi ON gfi.shopify_product_id = p.shopify_product_id
        WHERE p.status = 'active' AND p.featured_image_url IS NULL AND (gfi.status IN ('disapproved', 'failed') OR gfi.status IS NULL)
      `
    }

    // Get images with product info
    const imagesResult = await getImagesQuery()

    // Get total count
    const countResult = await getCountQuery()

    const total = Number(countResult.rows[0]?.count || 0)

    // Transform results
    interface ImageRow {
      productId: string
      productTitle: string
      handle: string
      imageUrl: string | null
      images: Array<{ url: string; width?: number; height?: number }> | null
      feedImageId: string | null
      originalUrl: string | null
      optimizedUrl: string | null
      originalWidth: number | null
      originalHeight: number | null
      optimizedWidth: number | null
      optimizedHeight: number | null
      status: string | null
      googleStatus: string | null
      googleIssues: Array<{ type: string; description: string }> | null
      compressionApplied: boolean | null
      backgroundRemoved: boolean | null
    }

    const images = (imagesResult.rows as ImageRow[]).map((row) => {
      const primaryImage = row.imageUrl || row.images?.[0]?.url || null
      const issues: string[] = []

      // Check for common issues
      if (!primaryImage) {
        issues.push('No image available')
      } else {
        const width = row.optimizedWidth || row.originalWidth
        const height = row.optimizedHeight || row.originalHeight

        if (width && height) {
          if (width < 100 || height < 100) {
            issues.push('Image too small (min 100x100)')
          }
        } else {
          issues.push('Image dimensions unknown')
        }
      }

      // Add Google-reported issues
      if (row.googleIssues) {
        for (const issue of row.googleIssues) {
          issues.push(issue.description)
        }
      }

      // Determine status
      let effectiveStatus: 'approved' | 'warning' | 'disapproved' | 'pending' = 'pending'
      if (row.status === 'approved' || row.googleStatus === 'approved') {
        effectiveStatus = 'approved'
      } else if (row.status === 'disapproved' || row.googleStatus === 'disapproved') {
        effectiveStatus = 'disapproved'
      } else if (issues.length > 0) {
        effectiveStatus = 'warning'
      }

      return {
        productId: row.productId,
        productTitle: row.productTitle,
        handle: row.handle,
        imageUrl: primaryImage,
        thumbnailUrl: row.optimizedUrl || primaryImage,
        width: row.optimizedWidth || row.originalWidth,
        height: row.optimizedHeight || row.originalHeight,
        status: effectiveStatus,
        issues,
        isOptimized: row.compressionApplied || row.backgroundRemoved || false,
      }
    })

    return {
      images,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      requirements: {
        minWidth: 100,
        minHeight: 100,
        apparelMinWidth: 250,
        apparelMinHeight: 250,
        maxFileSize: '16MB',
        supportedFormats: ['JPEG', 'PNG', 'GIF', 'BMP', 'TIFF'],
        recommendations: [
          'Use white or transparent background',
          'Show the entire product',
          'No watermarks or promotional text',
          'High resolution for zoom functionality',
        ],
      },
    }
  })

  return NextResponse.json(result)
}
