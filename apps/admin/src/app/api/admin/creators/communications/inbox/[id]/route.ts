export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  archiveConversation,
  assignConversation,
  getConversation,
  getConversationMessages,
  markConversationRead,
  starConversation,
  updateConversationStatus,
} from '@/lib/creator-communications/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const conversation = await getConversation(tenantSlug, id)
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const messages = await getConversationMessages(tenantSlug, id)

  // Mark as read
  await markConversationRead(tenantSlug, id)

  return NextResponse.json({ conversation, messages })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()
  const { status, assignedTo, starred, archived } = body

  let success = false

  if (status !== undefined) {
    success = await updateConversationStatus(tenantSlug, id, status)
  }

  if (assignedTo !== undefined) {
    success = await assignConversation(tenantSlug, id, assignedTo)
  }

  if (starred !== undefined) {
    success = await starConversation(tenantSlug, id, starred)
  }

  if (archived !== undefined) {
    success = await archiveConversation(tenantSlug, id, archived)
  }

  if (!success) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const conversation = await getConversation(tenantSlug, id)
  return NextResponse.json({ success: true, conversation })
}
