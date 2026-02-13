export const dynamic = 'force-dynamic'

import { put } from '@vercel/blob'
import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getAssets,
  createAsset,
  extractMetadata,
  computeFileHash,
  generateThumbnail,
  getAssetTypeFromMime,
  getTenantAssetPath,
  getTenantThumbnailPath,
  type AssetFilters,
  type CreateAssetInput,
} from '@cgk-platform/dam'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id') || 'system'

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const filters: AssetFilters = {
    page: Math.max(1, parseInt(url.searchParams.get('page') || '1', 10)),
    limit: Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10))),
    offset: 0,
    search: url.searchParams.get('search') || undefined,
    asset_type: url.searchParams.get('type') as AssetFilters['asset_type'] || undefined,
    collection_id: url.searchParams.get('collection') || undefined,
    tags: url.searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
    rights_status: url.searchParams.get('rights') as AssetFilters['rights_status'] || undefined,
    is_archived: url.searchParams.get('archived') === 'true' ? true :
                 url.searchParams.get('archived') === 'false' ? false : undefined,
    is_favorite: url.searchParams.get('favorite') === 'true' ? true :
                 url.searchParams.get('favorite') === 'false' ? false : undefined,
    date_from: url.searchParams.get('from') || undefined,
    date_to: url.searchParams.get('to') || undefined,
    sort: url.searchParams.get('sort') || 'created_at',
    dir: (url.searchParams.get('dir') || 'desc') as 'asc' | 'desc',
  }
  filters.offset = (filters.page - 1) * filters.limit

  const result = await withTenant(tenantSlug, () => getAssets(tenantSlug, userId, filters))

  return NextResponse.json({
    assets: result.assets,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalCount: result.totalCount,
      totalPages: Math.ceil(result.totalCount / filters.limit),
    },
  })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id') || 'system'

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Determine asset type
    const assetType = getAssetTypeFromMime(file.type)
    if (!assetType) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Compute file hash
    const fileHash = await computeFileHash(buffer)

    // Extract metadata
    const metadata = await extractMetadata(buffer, assetType, file.type)

    // Upload main file
    const assetPath = getTenantAssetPath(tenantSlug, assetType)
    const timestamp = Date.now()
    const ext = file.name.split('.').pop() || ''
    const safeName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_')
    const filename = `${safeName}-${timestamp}.${ext}`

    const blob = await put(`${assetPath}/${filename}`, buffer, {
      access: 'public',
      contentType: file.type,
    })

    // Generate and upload thumbnail
    let thumbnailUrl: string | null = null
    const thumbnail = await generateThumbnail(buffer, assetType, file.type)
    if (thumbnail) {
      const thumbPath = getTenantThumbnailPath(tenantSlug)
      const thumbBlob = await put(`${thumbPath}/${safeName}-${timestamp}-thumb.webp`, thumbnail.buffer, {
        access: 'public',
        contentType: thumbnail.contentType,
      })
      thumbnailUrl = thumbBlob.url
    }

    // Create asset record
    const title = formData.get('title') as string || file.name.replace(/\.[^/.]+$/, '')
    const description = formData.get('description') as string || null
    const tagsStr = formData.get('tags') as string || ''
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : []

    const input: CreateAssetInput = {
      title,
      description,
      asset_type: assetType,
      mime_type: file.type,
      file_extension: ext || null,
      file_url: blob.url,
      thumbnail_url: thumbnailUrl,
      file_size_bytes: buffer.length,
      width: metadata.width || null,
      height: metadata.height || null,
      duration_seconds: metadata.duration_seconds || null,
      exif_data: metadata.exif_data || null,
      manual_tags: tags,
      file_hash: fileHash,
      source_type: 'upload',
    }

    const asset = await withTenant(tenantSlug, () => createAsset(tenantSlug, userId, input))

    return NextResponse.json({ asset }, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
