export const dynamic = 'force-dynamic'

import { getUserById } from '@cgk/auth'
import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { response_body?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.response_body || typeof body.response_body !== 'string' || !body.response_body.trim()) {
    return NextResponse.json({ error: 'response_body is required' }, { status: 400 })
  }

  let responseAuthor = 'Admin'
  if (userId) {
    const user = await getUserById(userId)
    if (user?.name) {
      responseAuthor = user.name
    }
  }

  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE reviews
      SET response_body = ${body.response_body!.trim()},
          response_author = ${responseAuthor},
          responded_at = NOW(),
          updated_at = NOW()
      WHERE id = ${id}
    `
  })

  return NextResponse.json({ success: true })
}
