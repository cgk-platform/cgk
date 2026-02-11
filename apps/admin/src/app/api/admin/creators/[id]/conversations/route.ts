export const dynamic = 'force-dynamic'

import { getUserById } from '@cgk/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCreatorConversations, createConversation } from '@/lib/creators/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const conversations = await getCreatorConversations(tenantSlug, id)

  return NextResponse.json({ conversations })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: creatorId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { subject?: string; content: string; isInternal?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
    return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
  }

  const user = await getUserById(userId)
  const senderName = user ? (user.name || user.email) : 'Admin'

  const result = await createConversation(tenantSlug, creatorId, body.subject || null, {
    senderType: 'admin',
    senderId: userId,
    senderName,
    content: body.content.trim(),
    isInternal: body.isInternal || false,
  })

  if (!result) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    conversation: result.conversation,
    message: result.message,
  })
}
