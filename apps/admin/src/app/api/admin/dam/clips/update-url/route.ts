export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * PATCH /api/admin/dam/clips/update-url
 *
 * Updates the file_url of an existing dam_assets record. Used to
 * backfill clips that were ingested with local file paths as fileUrl
 * before the file was uploaded to Vercel Blob.
 *
 * Auth: tenant API key.
 */

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'

import { validateTenantApiKey } from '@/lib/api-key-auth'
import { logger } from '@cgk-platform/logging'

export async function PATCH(request: Request) {
  const auth = await validateTenantApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { assetId, fileUrl, fileSizeBytes, fileHash } = body as Record<string, unknown>

  if (!assetId || typeof assetId !== 'string') {
    return NextResponse.json({ error: 'assetId is required' }, { status: 400 })
  }
  if (!fileUrl || typeof fileUrl !== 'string') {
    return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 })
  }
  // Only accept Vercel Blob URLs to prevent URL injection
  if (!fileUrl.includes('.vercel-storage.com')) {
    return NextResponse.json({ error: 'fileUrl must be a Vercel Blob URL' }, { status: 400 })
  }

  const { tenantSlug } = auth

  try {
    const updated = await withTenant(tenantSlug, async () => {
      // Build update based on provided fields. Separate branches for
      // each combination since @vercel/postgres has no fragment composition.
      if (typeof fileSizeBytes === 'number' && typeof fileHash === 'string') {
        const result = await sql`
          UPDATE dam_assets
          SET file_url = ${fileUrl},
              file_size_bytes = ${fileSizeBytes},
              file_hash = ${fileHash},
              updated_at = NOW()
          WHERE id = ${assetId}
            AND tenant_id = ${tenantSlug}
            AND deleted_at IS NULL
          RETURNING id
        `
        return result.rows.length > 0
      } else if (typeof fileSizeBytes === 'number') {
        const result = await sql`
          UPDATE dam_assets
          SET file_url = ${fileUrl},
              file_size_bytes = ${fileSizeBytes},
              updated_at = NOW()
          WHERE id = ${assetId}
            AND tenant_id = ${tenantSlug}
            AND deleted_at IS NULL
          RETURNING id
        `
        return result.rows.length > 0
      } else if (typeof fileHash === 'string') {
        const result = await sql`
          UPDATE dam_assets
          SET file_url = ${fileUrl},
              file_hash = ${fileHash},
              updated_at = NOW()
          WHERE id = ${assetId}
            AND tenant_id = ${tenantSlug}
            AND deleted_at IS NULL
          RETURNING id
        `
        return result.rows.length > 0
      } else {
        const result = await sql`
          UPDATE dam_assets
          SET file_url = ${fileUrl},
              updated_at = NOW()
          WHERE id = ${assetId}
            AND tenant_id = ${tenantSlug}
            AND deleted_at IS NULL
          RETURNING id
        `
        return result.rows.length > 0
      }
    })

    if (!updated) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    return NextResponse.json({ updated: true })
  } catch (error) {
    logger.error(
      'DAM clip URL update error:',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    )
  }
}
