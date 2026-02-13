export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext } from '@cgk-platform/auth'
import { addComment, getComments } from '@cgk-platform/support'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/support/tickets/[id]/comments
 * Get comments for a ticket
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id: ticketId } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  // Agents can see internal comments
  const includeInternal = true

  try {
    const result = await getComments(tenantId, ticketId, includeInternal, page, limit)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/support/tickets/[id]/comments
 * Add a comment to a ticket
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id: ticketId } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const input = body as {
    content?: string
    isInternal?: boolean
    attachments?: string[]
  }

  if (!input.content) {
    return NextResponse.json(
      { error: 'Comment content is required' },
      { status: 400 }
    )
  }

  try {
    const comment = await addComment(tenantId, ticketId, {
      content: input.content,
      authorId: auth.userId,
      authorName: auth.email, // Use email as name, could be enhanced to get user's name
      authorType: 'agent',
      isInternal: input.isInternal || false,
      attachments: input.attachments || [],
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error adding comment:', error)
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    )
  }
}
