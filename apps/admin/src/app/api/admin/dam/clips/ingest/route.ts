export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { ingestClip, findDuplicateClip, type ClipIngestInput } from '@cgk-platform/dam'

import { validateTenantApiKey } from '@/lib/api-key-auth'
import { logger } from '@cgk-platform/logging'

export async function POST(request: Request) {
  const auth = await validateTenantApiKey(request)
  let tenantSlug: string | null = null
  let userId = 'system'

  if (auth) {
    tenantSlug = auth.tenantSlug
  } else {
    const headerList = await headers()
    tenantSlug = headerList.get('x-tenant-slug')
    userId = headerList.get('x-user-id') || 'system'
  }

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    title,
    fileUrl,
    mimeType,
    description,
    fileSizeBytes,
    width,
    height,
    durationSeconds,
    thumbnailUrl,
    fileHash,
    clipSourceType,
    clipSourceUrl,
    hasBurnedCaptions,
    openclawCatalogId,
    tags,
    segments,
  } = body as Record<string, unknown>

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!fileUrl || typeof fileUrl !== 'string') {
    return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 })
  }
  if (!mimeType || typeof mimeType !== 'string') {
    return NextResponse.json({ error: 'mimeType is required' }, { status: 400 })
  }

  const input: ClipIngestInput = {
    title,
    fileUrl,
    mimeType,
    description: typeof description === 'string' ? description : undefined,
    fileSizeBytes: typeof fileSizeBytes === 'number' ? fileSizeBytes : undefined,
    width: typeof width === 'number' ? width : undefined,
    height: typeof height === 'number' ? height : undefined,
    durationSeconds: typeof durationSeconds === 'number' ? durationSeconds : undefined,
    thumbnailUrl: typeof thumbnailUrl === 'string' ? thumbnailUrl : undefined,
    fileHash: typeof fileHash === 'string' ? fileHash : undefined,
    clipSourceType: typeof clipSourceType === 'string' ? clipSourceType : undefined,
    clipSourceUrl: typeof clipSourceUrl === 'string' ? clipSourceUrl : undefined,
    hasBurnedCaptions: typeof hasBurnedCaptions === 'boolean' ? hasBurnedCaptions : false,
    openclawCatalogId: typeof openclawCatalogId === 'string' ? openclawCatalogId : undefined,
    tags: Array.isArray(tags) ? (tags as string[]) : [],
    segments: Array.isArray(segments) ? segments : [],
  }

  try {
    const result = await withTenant(tenantSlug, async () => {
      // Deduplication check by file hash
      if (input.fileHash) {
        const existingId = await findDuplicateClip(tenantSlug!, input.fileHash)
        if (existingId) {
          return { id: existingId, duplicate: true, segmentCount: 0 }
        }
      }

      const ingestResult = await ingestClip(tenantSlug!, userId, input)
      return {
        id: ingestResult.assetId,
        duplicate: false,
        segmentCount: ingestResult.segmentCount,
      }
    })

    if (result.duplicate) {
      return NextResponse.json({
        id: result.id,
        duplicate: true,
        message: 'Asset already exists with this file hash',
      })
    }

    return NextResponse.json(
      {
        id: result.id,
        duplicate: false,
        segmentCount: result.segmentCount,
        message: 'Clip ingested successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Clip ingest error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ingest failed' },
      { status: 500 }
    )
  }
}
