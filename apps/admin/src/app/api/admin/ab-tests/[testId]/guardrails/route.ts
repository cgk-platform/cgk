export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getGuardrails } from '@/lib/ab-tests/db'

interface RouteContext {
  params: Promise<{ testId: string }>
}

/**
 * GET /api/admin/ab-tests/[testId]/guardrails
 * Get guardrails for a test
 */
export async function GET(_request: Request, context: RouteContext) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { testId } = await context.params

  const guardrails = await getGuardrails(tenantSlug, testId)

  return NextResponse.json({ guardrails })
}
