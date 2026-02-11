export const dynamic = 'force-dynamic'

import { getUserById } from '@cgk/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getThread, getMessages, sendMessage, markThreadRead, updateThreadStatus } from '@/lib/messaging/db'
import { MESSAGE_CHANNELS, type MessageChannel } from '@/lib/messaging/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const thread = await getThread(tenantSlug, threadId)
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  const messages = await getMessages(tenantSlug, threadId)
  await markThreadRead(tenantSlug, threadId)

  return NextResponse.json({ thread, messages })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { content?: string; channel?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
    return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
  }

  const channel = (body.channel || 'email') as MessageChannel
  if (!MESSAGE_CHANNELS.includes(channel)) {
    return NextResponse.json(
      { error: `Invalid channel. Must be one of: ${MESSAGE_CHANNELS.join(', ')}` },
      { status: 400 },
    )
  }

  const user = await getUserById(userId)
  const senderName = user ? (user.name || user.email) : 'Admin'

  const message = await sendMessage(
    tenantSlug,
    threadId,
    senderName,
    userId,
    body.content.trim(),
    channel,
  )

  if (!message) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validStatuses = ['open', 'pending', 'closed']
  if (!body.status || !validStatuses.includes(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 },
    )
  }

  const success = await updateThreadStatus(
    tenantSlug,
    threadId,
    body.status as 'open' | 'pending' | 'closed',
  )

  if (!success) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
