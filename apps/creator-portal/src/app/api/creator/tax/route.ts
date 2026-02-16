/**
 * Creator Tax API Routes
 *
 * Handles tax operations for creators:
 * - GET: Retrieve W-9 status and tax documents
 * - POST: Submit W-9 form
 */

import { NextResponse } from 'next/server'

import {
  getW9Status,
  listTaxForms,
  saveW9,
  logTaxAction,
  THRESHOLD_CENTS,
  type TaxClassification,
} from '@cgk-platform/tax'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

/**
 * Get active tenant slug from creator auth context
 */
function getActiveTenantSlug(auth: CreatorAuthContext): string | null {
  const activeMembership = auth.memberships.find((m) => m.status === 'active')
  return activeMembership?.brandSlug || null
}

// GET - Get creator's tax status and documents
export async function GET(request: Request) {
  let auth: CreatorAuthContext
  try {
    auth = await requireCreatorAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantSlug = getActiveTenantSlug(auth)
  if (!tenantSlug) {
    return NextResponse.json({ error: 'No active membership' }, { status: 400 })
  }

  try {
    // Get W-9 status
    const w9Status = await getW9Status(tenantSlug, auth.creatorId, 'creator')

    // Get 1099 forms for this creator
    const { forms } = await listTaxForms(tenantSlug, {
      payeeType: 'creator',
      limit: 50,
    })

    // Filter forms for this specific creator
    const creatorForms = forms.filter((form) => form.payeeId === auth.creatorId)

    // Map forms to response format
    const documents = creatorForms.map((form) => ({
      id: form.id,
      year: form.taxYear,
      formType: form.formType,
      totalAmountCents: form.totalAmountCents,
      status: form.status,
      filedAt: form.irsFiledAt?.toISOString() || null,
      deliveredAt: form.deliveredAt?.toISOString() || null,
    }))

    // Log tax info viewed
    await logTaxAction(
      tenantSlug,
      'tax_info_viewed',
      null,
      auth.creatorId,
      'creator',
      auth.creatorId,
      {
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        notes: 'Creator viewed tax status via portal',
      }
    )

    const taxStatus = {
      w9: {
        hasW9: w9Status.hasW9,
        status: w9Status.status,
        tinLastFour: w9Status.tinLastFour || null,
        certifiedAt: w9Status.certifiedAt?.toISOString() || null,
        certifiedName: w9Status.certifiedName || null,
        eDeliveryConsent: w9Status.eDeliveryConsent || false,
      },
      documents,
      // Note: currentYearEarnings would require aggregating from payouts table
      // For now, return null to indicate it's not available
      currentYearEarnings: null,
      threshold: THRESHOLD_CENTS,
    }

    return NextResponse.json(taxStatus)
  } catch (error) {
    console.error('Error fetching tax status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tax status' },
      { status: 500 }
    )
  }
}

// POST - Submit W-9 form
export async function POST(request: Request) {
  let auth: CreatorAuthContext
  try {
    auth = await requireCreatorAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantSlug = getActiveTenantSlug(auth)
  if (!tenantSlug) {
    return NextResponse.json({ error: 'No active membership' }, { status: 400 })
  }

  let body: {
    legalName: string
    businessName?: string
    taxClassification: string
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    postalCode: string
    tin: string
    tinType: 'ssn' | 'ein'
    certificationName: string
    eDeliveryConsent: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  const required = [
    'legalName',
    'taxClassification',
    'addressLine1',
    'city',
    'state',
    'postalCode',
    'tin',
    'tinType',
    'certificationName',
  ]

  for (const field of required) {
    if (!body[field as keyof typeof body]) {
      return NextResponse.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      )
    }
  }

  // Validate TIN format
  const tinDigits = body.tin.replace(/\D/g, '')
  if (tinDigits.length !== 9) {
    return NextResponse.json(
      { error: 'TIN must be 9 digits' },
      { status: 400 }
    )
  }

  try {
    // Save W-9 using the tax package
    await saveW9(
      tenantSlug,
      {
        payeeId: auth.creatorId,
        payeeType: 'creator',
        legalName: body.legalName,
        businessName: body.businessName,
        taxClassification: body.taxClassification as TaxClassification,
        address: {
          line1: body.addressLine1,
          line2: body.addressLine2,
          city: body.city,
          state: body.state,
          postalCode: body.postalCode,
          country: 'US',
        },
        tin: body.tin,
        tinType: body.tinType,
        certificationDate: new Date(),
        certificationName: body.certificationName,
        certificationIp: request.headers.get('x-forwarded-for') || 'unknown',
        eDeliveryConsent: body.eDeliveryConsent,
        eDeliveryConsentAt: body.eDeliveryConsent ? new Date() : undefined,
      },
      auth.creatorId,
      {
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      }
    )

    return NextResponse.json({
      success: true,
      message: 'W-9 submitted successfully',
      status: 'approved', // W-9 is approved immediately after validation
    })
  } catch (error) {
    console.error('Error saving W-9:', error)
    const message = error instanceof Error ? error.message : 'Failed to save W-9'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
