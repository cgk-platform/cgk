/**
 * Video Comments API
 *
 * GET /api/admin/videos/[id]/comments - List comments with threading
 * POST /api/admin/videos/[id]/comments - Create a comment
 */

export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createComment,
  getComments,
  validateCommentInput,
  type CommentListOptions,
  type CreateCommentInput,
} from '@cgk-platform/video/interactions'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id: videoId } = await params
  const url = new URL(request.url)

  const options: CommentListOptions = {
    includeReplies: url.searchParams.get('includeReplies') !== 'false',
    limit: Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10))),
    offset: Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10)),
    sort: (url.searchParams.get('sort') as CommentListOptions['sort']) || 'newest',
  }

  const timestampStart = url.searchParams.get('timestampStart')
  const timestampEnd = url.searchParams.get('timestampEnd')

  if (timestampStart) {
    options.timestampStart = parseInt(timestampStart, 10)
  }
  if (timestampEnd) {
    options.timestampEnd = parseInt(timestampEnd, 10)
  }

  const result = await getComments(tenantSlug, videoId, options)

  return NextResponse.json({
    comments: result.comments,
    totalCount: result.totalCount,
  })
}

export async function POST(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')
  const userName = headerList.get('x-user-name') || undefined

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id: videoId } = await params

  let body: CreateCommentInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = validateCommentInput(body)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 })
  }

  // Add user name from headers if not provided
  if (!body.userName && userName) {
    body.userName = userName
  }

  try {
    const comment = await createComment(tenantSlug, videoId, userId, body)
    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create comment'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
