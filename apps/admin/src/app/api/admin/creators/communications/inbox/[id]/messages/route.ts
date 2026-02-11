export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { createConversationMessage } from '@/lib/creator-communications/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json()
  const { content, isInternal, scheduledFor } = body

  if (!content) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const message = await createConversationMessage(
    tenantSlug,
    id,
    content,
    userId,
    isInternal || false,
    scheduledFor,
  )

  if (!message) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, message })
}
