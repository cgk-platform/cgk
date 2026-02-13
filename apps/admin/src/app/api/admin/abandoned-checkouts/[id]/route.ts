/**
 * Abandoned Checkout Detail API Route
 * GET: Get a single abandoned checkout with emails
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getAbandonedCheckout,
  getEmailsForCheckout,
} from '@/lib/abandoned-checkouts/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const result = await withTenant(tenantSlug, async () => {
      const [checkout, emails] = await Promise.all([
        getAbandonedCheckout(id),
        getEmailsForCheckout(id),
      ])

      return { checkout, emails }
    })

    if (!result.checkout) {
      return NextResponse.json(
        { error: 'Abandoned checkout not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      checkout: result.checkout,
      emails: result.emails,
    })
  } catch (error) {
    console.error('Failed to fetch abandoned checkout:', error)
    return NextResponse.json(
      { error: 'Failed to fetch abandoned checkout' },
      { status: 500 },
    )
  }
}
