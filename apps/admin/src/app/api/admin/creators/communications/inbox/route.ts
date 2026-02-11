export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createConversation,
  getConversations,
  getUnreadCount,
} from '@/lib/creator-communications/db'
import type { ConversationFilters } from '@/lib/creator-communications/types'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)

  const filters: ConversationFilters = {
    status: (url.searchParams.get('status') as 'open' | 'pending' | 'closed') || undefined,
    assigned_to: url.searchParams.get('assignedTo') || undefined,
    creator_id: url.searchParams.get('creatorId') || undefined,
    is_starred: url.searchParams.get('starred') === 'true' ? true : undefined,
    is_archived: url.searchParams.get('archived') === 'true' ? true : false,
    search: url.searchParams.get('search') || undefined,
    page: parseInt(url.searchParams.get('page') || '1', 10),
    limit: parseInt(url.searchParams.get('limit') || '20', 10),
  }

  const { rows, totalCount } = await getConversations(tenantSlug, filters)
  const unreadCount = await getUnreadCount(tenantSlug)

  return NextResponse.json({
    conversations: rows,
    totalCount,
    unreadCount,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(totalCount / filters.limit),
  })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json()
  const { creatorId, subject, content } = body

  if (!creatorId || !content) {
    return NextResponse.json(
      { error: 'creatorId and content are required' },
      { status: 400 },
    )
  }

  const conversation = await createConversation(
    tenantSlug,
    creatorId,
    subject || null,
    content,
    userId,
  )

  if (!conversation) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, conversation })
}
