/**
 * Video Reactions API
 *
 * GET /api/admin/videos/[id]/reactions - Get reaction summaries
 * POST /api/admin/videos/[id]/reactions - Add/toggle reaction
 * DELETE /api/admin/videos/[id]/reactions - Remove reaction
 */

export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getReactionSummaries,
  removeReaction,
  toggleReaction,
  validateReactionInput,
  type AddReactionInput,
} from '@cgk-platform/video/interactions'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id') || undefined

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id: videoId } = await params
  const summaries = await getReactionSummaries(tenantSlug, videoId, userId)

  return NextResponse.json({ reactions: summaries })
}

export async function POST(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id: videoId } = await params

  let body: AddReactionInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = validateReactionInput(body)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 })
  }

  const result = await toggleReaction(tenantSlug, videoId, userId, body)

  return NextResponse.json({
    added: result.added,
    reaction: result.reaction,
  })
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id: videoId } = await params
  const url = new URL(request.url)

  const emoji = url.searchParams.get('emoji')
  if (!emoji) {
    return NextResponse.json({ error: 'emoji parameter required' }, { status: 400 })
  }

  const timestampParam = url.searchParams.get('timestamp')
  const timestampSeconds = timestampParam ? parseInt(timestampParam, 10) : null

  const removed = await removeReaction(tenantSlug, videoId, userId, emoji, timestampSeconds)

  return NextResponse.json({ removed })
}
