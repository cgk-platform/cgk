export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { createTemplate, getTemplates } from '@/lib/creator-communications/db'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const category = url.searchParams.get('category') || undefined

  const templates = await getTemplates(tenantSlug, category)

  return NextResponse.json({ templates })
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
  const { category, name, slug, description, subject, content_html, content_text, variables } = body

  if (!category || !name || !slug || !subject || !content_html) {
    return NextResponse.json(
      { error: 'category, name, slug, subject, and content_html are required' },
      { status: 400 },
    )
  }

  try {
    const template = await createTemplate(
      tenantSlug,
      {
        category,
        name,
        slug,
        description,
        subject,
        content_html,
        content_text,
        variables,
      },
      userId,
    )

    return NextResponse.json({ success: true, template })
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'A template with this slug already exists' },
        { status: 409 },
      )
    }
    throw error
  }
}
