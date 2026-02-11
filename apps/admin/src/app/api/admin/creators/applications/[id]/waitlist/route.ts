export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { updateApplicationStatus } from '@/lib/creators-admin-ops'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { notes } = body as { notes?: string }

    await updateApplicationStatus(tenantSlug, id, 'waitlisted', userId, {
      internalNotes: notes,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error waitlisting application:', error)
    return NextResponse.json(
      { error: 'Failed to waitlist application' },
      { status: 500 }
    )
  }
}
