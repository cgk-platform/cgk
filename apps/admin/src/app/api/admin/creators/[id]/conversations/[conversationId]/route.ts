export const dynamic = 'force-dynamic'

import { getUserById } from '@cgk/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getConversationMessages,
  sendConversationMessage,
  markConversationRead,
} from '@/lib/creators/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; conversationId: string }> },
) {
  const { conversationId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const messages = await getConversationMessages(tenantSlug, conversationId, true)

  // Mark as read for admin
  await markConversationRead(tenantSlug, conversationId, 'admin')

  return NextResponse.json({ messages })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; conversationId: string }> },
) {
  const { conversationId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    content: string
    contentHtml?: string
    attachments?: Array<{ name: string; url: string; size: number; type: string }>
    isInternal?: boolean
    scheduledFor?: string
  }
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

  const message = await sendConversationMessage(tenantSlug, conversationId, {
    senderType: 'admin',
    senderId: userId,
    senderName,
    content: body.content.trim(),
    contentHtml: body.contentHtml,
    attachments: body.attachments,
    isInternal: body.isInternal || false,
    scheduledFor: body.scheduledFor,
  })

  if (!message) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message })
}
