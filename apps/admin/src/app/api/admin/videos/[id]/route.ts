export const dynamic = 'force-dynamic'

/**
 * Video Detail API Routes
 *
 * GET - Get video details
 * PATCH - Update video metadata
 * DELETE - Soft delete video
 */

import { withTenant } from '@cgk/db'
import {
  getVideo,
  updateVideo,
  deleteVideo,
  deleteAsset,
  type UpdateVideoInput,
} from '@cgk/video'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { id: videoId } = await context.params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    )
  }

  const video = await withTenant(tenantSlug, () =>
    getVideo(tenantSlug, videoId),
  )

  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  return NextResponse.json({ video })
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: videoId } = await context.params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    )
  }

  let body: UpdateVideoInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Verify video exists and user owns it
  const existingVideo = await withTenant(tenantSlug, () =>
    getVideo(tenantSlug, videoId),
  )

  if (!existingVideo) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  if (existingVideo.userId !== userId) {
    return NextResponse.json(
      { error: 'Not authorized to update this video' },
      { status: 403 },
    )
  }

  const video = await withTenant(tenantSlug, () =>
    updateVideo(tenantSlug, videoId, body),
  )

  return NextResponse.json({ video })
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id: videoId } = await context.params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    )
  }

  // Verify video exists and user owns it
  const existingVideo = await withTenant(tenantSlug, () =>
    getVideo(tenantSlug, videoId),
  )

  if (!existingVideo) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  if (existingVideo.userId !== userId) {
    return NextResponse.json(
      { error: 'Not authorized to delete this video' },
      { status: 403 },
    )
  }

  // Delete from Mux if asset exists
  if (existingVideo.muxAssetId) {
    try {
      await deleteAsset(existingVideo.muxAssetId)
    } catch (error) {
      console.error('Failed to delete Mux asset:', error)
      // Continue with soft delete even if Mux deletion fails
    }
  }

  // Soft delete in database
  await withTenant(tenantSlug, () => deleteVideo(tenantSlug, videoId))

  return NextResponse.json({ success: true })
}
