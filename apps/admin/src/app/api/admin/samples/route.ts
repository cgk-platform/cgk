export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getSampleRequests,
  getSampleStats,
  createSampleRequest,
  parseSampleFilters,
  type SampleProduct,
  type ShippingAddress,
} from '@/lib/creators-admin-ops'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const params: Record<string, string | undefined> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })

  const includeStats = url.searchParams.get('stats') === 'true'
  const filters = parseSampleFilters(params)

  try {
    const { rows, totalCount } = await getSampleRequests(tenantSlug, filters)

    const response: {
      requests: typeof rows
      totalCount: number
      page: number
      limit: number
      totalPages: number
      stats?: Awaited<ReturnType<typeof getSampleStats>>
    } = {
      requests: rows,
      totalCount,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(totalCount / filters.limit),
    }

    if (includeStats) {
      response.stats = await getSampleStats(tenantSlug)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching sample requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sample requests' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { creatorId, products, shippingAddress, priority, notes } = body as {
      creatorId: string
      products: SampleProduct[]
      shippingAddress: ShippingAddress
      priority?: 'normal' | 'rush'
      notes?: string
    }

    if (!creatorId || !products || !shippingAddress) {
      return NextResponse.json(
        { error: 'creatorId, products, and shippingAddress are required' },
        { status: 400 }
      )
    }

    const sampleRequest = await createSampleRequest(tenantSlug, {
      creatorId,
      products,
      shippingAddress,
      priority,
      notes,
    })

    return NextResponse.json({ success: true, request: sampleRequest })
  } catch (error) {
    console.error('Error creating sample request:', error)
    return NextResponse.json(
      { error: 'Failed to create sample request' },
      { status: 500 }
    )
  }
}
