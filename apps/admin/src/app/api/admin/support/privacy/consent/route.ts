/**
 * Consent Records API
 *
 * GET /api/admin/support/privacy/consent - List consent records
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk/auth'
import {
  getActiveConsent,
  getConsentRecords,
  getConsentRecordsFiltered,
  type ConsentFilters,
  type ConsentType,
} from '@cgk/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const VALID_CONSENT_TYPES: ConsentType[] = ['marketing', 'analytics', 'third_party', 'data_processing']

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams
    const customerEmail = searchParams.get('email')
    const consentType = searchParams.get('type') as ConsentType | null
    const granted = searchParams.get('granted')
    const active = searchParams.get('active') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const getActive = searchParams.get('getActive') === 'true'

    // If getting active consent status for a specific customer
    if (getActive && customerEmail) {
      const activeConsent = await getActiveConsent(tenantId, customerEmail)
      return NextResponse.json({ activeConsent })
    }

    // If getting full history for a customer
    if (customerEmail && !consentType && !getActive) {
      const records = await getConsentRecords(tenantId, customerEmail)
      return NextResponse.json({ records })
    }

    // Get filtered list
    const filters: ConsentFilters = {
      limit: Math.min(limit, 100),
      page,
    }

    if (customerEmail) {
      filters.customerEmail = customerEmail
    }

    if (consentType && VALID_CONSENT_TYPES.includes(consentType)) {
      filters.consentType = consentType
    }

    if (granted === 'true') {
      filters.granted = true
    } else if (granted === 'false') {
      filters.granted = false
    }

    if (active) {
      filters.active = true
    }

    const { records, total } = await getConsentRecordsFiltered(tenantId, filters)

    return NextResponse.json({
      records,
      pagination: {
        total,
        page: filters.page ?? 1,
        limit: filters.limit ?? 50,
        totalPages: Math.ceil(total / (filters.limit ?? 50)),
      },
    })
  } catch (error) {
    console.error('[privacy/consent] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch consent records' },
      { status: 500 }
    )
  }
}
