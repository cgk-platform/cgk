export const dynamic = 'force-dynamic'

/**
 * Video API Routes
 *
 * GET - List videos with pagination
 * POST - Create a new video and get upload URL
 */

import { withTenant } from '@cgk/db'
import {
  getVideos,
  createVideo,
  createDirectUpload,
} from '@cgk/video'
import type { VideoStatus, CreateVideoInput } from '@cgk/video'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    )
  }

  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)),
  )
  const offset = (page - 1) * limit
  const search = url.searchParams.get('search') || ''
  const status = (url.searchParams.get('status') as VideoStatus) || undefined
  const folderId = url.searchParams.get('folderId') || undefined
  const sort =
    (url.searchParams.get('sort') as 'created_at' | 'title' | 'duration_seconds') ||
    'created_at'
  const dir = (url.searchParams.get('dir') as 'asc' | 'desc') || 'desc'

  const result = await withTenant(tenantSlug, () =>
    getVideos(tenantSlug, userId, {
      limit,
      offset,
      search,
      status,
      folderId,
      sort,
      dir,
    }),
  )

  return NextResponse.json({
    videos: result.rows,
    pagination: {
      page,
      limit,
      totalCount: result.totalCount,
      totalPages: Math.ceil(result.totalCount / limit),
    },
  })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    )
  }

  let body: CreateVideoInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.title) {
    return NextResponse.json(
      { error: 'Missing required field: title' },
      { status: 400 },
    )
  }

  // Create direct upload URL
  const { uploadUrl, uploadId } = await createDirectUpload({
    corsOrigin: '*',
  })

  // Create video record
  const video = await withTenant(tenantSlug, () =>
    createVideo(tenantSlug, userId, body, uploadId),
  )

  return NextResponse.json(
    {
      video,
      uploadUrl,
      uploadId,
    },
    { status: 201 },
  )
}
