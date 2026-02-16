export const dynamic = 'force-dynamic'
export const revalidate = 0

import { requireAuth, type AuthContext } from '@cgk-platform/auth'
import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { logSettingsChange, resetAIUsage } from '@/lib/settings'

export async function POST(request: Request) {
  // Require authentication
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only super admins can reset AI usage
  if (auth.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Only super admins can reset AI usage' },
      { status: 403 }
    )
  }

  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = auth.userId

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  await withTenant(tenantSlug, async () => {
    await resetAIUsage(tenantId)
    await logSettingsChange(
      tenantId,
      userId,
      'ai',
      { action: 'reset_usage', aiCurrentMonthUsageUsd: 0 },
      null
    )
  })

  return NextResponse.json({ success: true })
}
