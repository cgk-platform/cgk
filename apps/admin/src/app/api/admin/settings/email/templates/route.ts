export const dynamic = 'force-dynamic'

import {
  getTemplates,
  seedDefaultTemplates,
  type TemplateFilters,
} from '@cgk-platform/communications'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/settings/email/templates
 *
 * List all email templates for the tenant
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const filters: TemplateFilters = {
    category: url.searchParams.get('category') as TemplateFilters['category'] || undefined,
    notificationType: url.searchParams.get('notificationType') || undefined,
    isActive: url.searchParams.get('isActive') === 'true' ? true
      : url.searchParams.get('isActive') === 'false' ? false
      : undefined,
    search: url.searchParams.get('search') || undefined,
  }

  const templates = await getTemplates(tenantSlug, filters)

  return NextResponse.json({ templates })
}

/**
 * POST /api/admin/settings/email/templates
 *
 * Seed default templates for the tenant
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { action: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.action === 'seed') {
    const templates = await seedDefaultTemplates(tenantSlug)
    return NextResponse.json({
      success: true,
      message: `Seeded ${templates.length} default templates`,
      templates,
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
