export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { logSettingsChange, resetAIUsage } from '@/lib/settings'

export async function POST() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const userId = headerList.get('x-user-id')
  const userRole = headerList.get('x-user-role')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (userRole !== 'super_admin') {
    return NextResponse.json(
      { error: 'Only super admins can reset AI usage' },
      { status: 403 }
    )
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
