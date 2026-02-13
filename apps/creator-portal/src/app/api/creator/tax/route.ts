/**
 * Creator Tax API Routes
 *
 * Handles tax operations for creators:
 * - GET: Retrieve W-9 status and tax documents
 * - POST: Submit W-9 form
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Get creator's tax status and documents
export async function GET() {
  // Would get creator from session
  // const creatorId = 'creator_123' // TODO: Get from session

  // Mock response - would use @cgk-platform/tax package
  const taxStatus = {
    w9: {
      hasW9: true,
      status: 'approved',
      tinLastFour: '1234',
      certifiedAt: '2024-06-15T00:00:00Z',
      certifiedName: 'John Creator',
      eDeliveryConsent: true,
    },
    documents: [
      {
        id: '1099_abc123',
        year: 2024,
        formType: '1099-NEC',
        totalAmountCents: 125000,
        status: 'filed',
        filedAt: '2025-01-28T00:00:00Z',
        deliveredAt: '2025-01-28T00:00:00Z',
      },
      {
        id: '1099_def456',
        year: 2023,
        formType: '1099-NEC',
        totalAmountCents: 85000,
        status: 'filed',
        filedAt: '2024-01-30T00:00:00Z',
        deliveredAt: '2024-01-30T00:00:00Z',
      },
    ],
    currentYearEarnings: 45000, // Cents
    threshold: 60000, // Cents ($600)
  }

  return NextResponse.json(taxStatus)
}

// POST - Submit W-9 form
export async function POST(request: Request) {
  // Would get creator from session
  // const creatorId = 'creator_123' // TODO: Get from session

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

  // Would validate and save using @cgk-platform/tax package
  // await saveW9(tenantSlug, {
  //   payeeId: creatorId,
  //   payeeType: 'creator',
  //   legalName: body.legalName,
  //   businessName: body.businessName,
  //   taxClassification: body.taxClassification,
  //   address: {
  //     line1: body.addressLine1,
  //     line2: body.addressLine2,
  //     city: body.city,
  //     state: body.state,
  //     postalCode: body.postalCode,
  //     country: 'US',
  //   },
  //   tin: body.tin,
  //   tinType: body.tinType,
  //   certificationDate: new Date(),
  //   certificationName: body.certificationName,
  //   certificationIp: request.headers.get('x-forwarded-for') || 'unknown',
  //   eDeliveryConsent: body.eDeliveryConsent,
  //   eDeliveryConsentAt: body.eDeliveryConsent ? new Date() : undefined,
  // }, creatorId)

  return NextResponse.json({
    success: true,
    message: 'W-9 submitted successfully',
    status: 'pending_review',
  })
}
