export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getDrawRequests,
  createDrawRequest,
  getPendingWithdrawalsForDraw,
} from '@/lib/treasury/db/requests'
import { getTreasurySettings } from '@/lib/treasury/db/settings'
import type { CreateDrawRequestInput, DrawRequestStatus } from '@/lib/treasury/types'

/**
 * GET /api/admin/treasury/requests
 * List draw requests with optional filters
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status') as DrawRequestStatus | null
  const payee = url.searchParams.get('payee')
  const includePendingWithdrawals = url.searchParams.get('pendingWithdrawals') === 'true'

  const requests = await getDrawRequests(tenantSlug, {
    status: status || undefined,
    payee: payee || undefined,
  })

  const response: {
    requests: typeof requests
    pendingWithdrawals?: Awaited<ReturnType<typeof getPendingWithdrawalsForDraw>>
  } = { requests }

  if (includePendingWithdrawals) {
    response.pendingWithdrawals = await getPendingWithdrawalsForDraw(tenantSlug)
  }

  return NextResponse.json(response)
}

/**
 * POST /api/admin/treasury/requests
 * Create a new draw request
 */
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

  let body: CreateDrawRequestInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate required fields
  if (!body.description) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }

  if (!body.withdrawal_ids || body.withdrawal_ids.length === 0) {
    return NextResponse.json(
      { error: 'At least one withdrawal must be included' },
      { status: 400 }
    )
  }

  // Get default settings if treasurer info not provided
  if (!body.treasurer_name || !body.treasurer_email) {
    const settings = await getTreasurySettings(tenantSlug)
    if (!body.treasurer_name && settings.treasurer_name) {
      body.treasurer_name = settings.treasurer_name
    }
    if (!body.treasurer_email && settings.treasurer_email) {
      body.treasurer_email = settings.treasurer_email
    }
    if (!body.signers && settings.default_signers.length > 0) {
      body.signers = settings.default_signers
    }
  }

  // Validate treasurer info
  if (!body.treasurer_name || !body.treasurer_email) {
    return NextResponse.json(
      { error: 'Treasurer name and email are required' },
      { status: 400 }
    )
  }

  try {
    const drawRequest = await createDrawRequest(tenantSlug, body, userId)
    return NextResponse.json({ request: drawRequest }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create draw request'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
