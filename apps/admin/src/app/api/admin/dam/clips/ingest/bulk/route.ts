export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { ingestClip, findDuplicateClip, type ClipIngestInput } from '@cgk-platform/dam'

import { validateTenantApiKey } from '@/lib/api-key-auth'

interface BulkClipResult {
  title: string
  id?: string
  duplicate: boolean
  segmentCount?: number
  error?: string
}

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

  const { clips } = body as { clips?: unknown }
  if (!Array.isArray(clips) || clips.length === 0) {
    return NextResponse.json({ error: 'clips must be a non-empty array' }, { status: 400 })
  }
  if (clips.length > 100) {
    return NextResponse.json({ error: 'Maximum 100 clips per batch' }, { status: 400 })
  }

  const results: BulkClipResult[] = []
  let succeeded = 0
  let duplicates = 0
  let failed = 0

  const resolvedTenant = tenantSlug

  for (const raw of clips as unknown[]) {
    const item = raw as Record<string, unknown>
    const title = typeof item.title === 'string' ? item.title : String(item.title ?? '')

    if (!item.title || !item.fileUrl || !item.mimeType) {
      failed++
      results.push({
        title,
        duplicate: false,
        error: 'title, fileUrl, and mimeType are required',
      })
      continue
    }

    const input: ClipIngestInput = {
      title: item.title as string,
      fileUrl: item.fileUrl as string,
      mimeType: item.mimeType as string,
      description: typeof item.description === 'string' ? item.description : undefined,
      fileSizeBytes: typeof item.fileSizeBytes === 'number' ? item.fileSizeBytes : undefined,
      width: typeof item.width === 'number' ? item.width : undefined,
      height: typeof item.height === 'number' ? item.height : undefined,
      durationSeconds: typeof item.durationSeconds === 'number' ? item.durationSeconds : undefined,
      thumbnailUrl: typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : undefined,
      fileHash: typeof item.fileHash === 'string' ? item.fileHash : undefined,
      clipSourceType: typeof item.clipSourceType === 'string' ? item.clipSourceType : undefined,
      clipSourceUrl: typeof item.clipSourceUrl === 'string' ? item.clipSourceUrl : undefined,
      hasBurnedCaptions:
        typeof item.hasBurnedCaptions === 'boolean' ? item.hasBurnedCaptions : false,
      openclawCatalogId:
        typeof item.openclawCatalogId === 'string' ? item.openclawCatalogId : undefined,
      tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
      segments: Array.isArray(item.segments) ? item.segments : [],
    }

    try {
      const result = await withTenant(resolvedTenant, async () => {
        if (input.fileHash) {
          const existingId = await findDuplicateClip(resolvedTenant, input.fileHash)
          if (existingId) {
            return { id: existingId, duplicate: true, segmentCount: 0 }
          }
        }

        const ingestResult = await ingestClip(resolvedTenant, userId, input)
        return {
          id: ingestResult.assetId,
          duplicate: false,
          segmentCount: ingestResult.segmentCount,
        }
      })

      if (result.duplicate) {
        duplicates++
        results.push({ title, id: result.id, duplicate: true })
      } else {
        succeeded++
        results.push({ title, id: result.id, duplicate: false, segmentCount: result.segmentCount })
      }
    } catch (error) {
      failed++
      results.push({
        title,
        duplicate: false,
        error: error instanceof Error ? error.message : 'Ingest failed',
      })
    }
  }

  return NextResponse.json(
    {
      results,
      total: clips.length,
      succeeded,
      duplicates,
      failed,
    },
    { status: failed === clips.length ? 422 : 201 }
  )
}
