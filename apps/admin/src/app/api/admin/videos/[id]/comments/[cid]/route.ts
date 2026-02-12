/**
 * Single Video Comment API
 *
 * PATCH /api/admin/videos/[id]/comments/[cid] - Update comment
 * DELETE /api/admin/videos/[id]/comments/[cid] - Delete comment
 */

export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  deleteComment,
  updateComment,
  validateCommentInput,
  type UpdateCommentInput,
} from '@cgk/video/interactions'

interface RouteParams {
  params: Promise<{ id: string; cid: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { cid: commentId } = await params

  let body: UpdateCommentInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = validateCommentInput(body)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 })
  }

  const comment = await updateComment(tenantSlug, userId, commentId, body)

  if (!comment) {
    return NextResponse.json({ error: 'Comment not found or not owned by user' }, { status: 404 })
  }

  return NextResponse.json({ comment })
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')
  const userRole = headerList.get('x-user-role')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { cid: commentId } = await params

  // Admins can delete any comment
  const isAdmin = userRole === 'admin' || userRole === 'owner'

  const deleted = await deleteComment(tenantSlug, userId, commentId, isAdmin)

  if (!deleted) {
    return NextResponse.json({ error: 'Comment not found or not owned by user' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
