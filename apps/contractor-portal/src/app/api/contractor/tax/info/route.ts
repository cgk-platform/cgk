/**
 * Contractor Tax Info API
 *
 * GET  /api/contractor/tax/info - Get W-9 status
 * POST /api/contractor/tax/info - Submit W-9 info
 */

import {
  getTaxInfo,
  getW9Status,
  requiresW9,
  submitW9,
  TaxError,
  type CheckAddress,
  type SubmitW9Input,
  type TaxEntityType,
} from '@cgk-platform/payments'

import {
  requireContractorAuth,
  unauthorizedResponse,
} from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  try {
    const [w9Status, taxInfo, needsW9] = await Promise.all([
      getW9Status(auth.contractorId, auth.tenantSlug),
      getTaxInfo(auth.contractorId, auth.tenantSlug),
      requiresW9(auth.contractorId, auth.tenantSlug),
    ])

    return Response.json({
      required: needsW9,
      status: w9Status,
      // Only return non-sensitive data
      info: taxInfo
        ? {
            taxIdType: taxInfo.taxIdType,
            taxIdLast4: taxInfo.taxIdLast4,
            legalName: taxInfo.legalName,
            businessName: taxInfo.businessName,
            entityType: taxInfo.entityType,
            address: taxInfo.address,
            signedAt: taxInfo.signedAt.toISOString(),
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching tax info:', error)
    return Response.json(
      { error: 'Failed to fetch tax info' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  let body: {
    taxIdType: 'ssn' | 'ein'
    taxId: string
    legalName: string
    businessName?: string
    entityType: TaxEntityType
    address: CheckAddress
    signature: string
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!body.taxIdType || !['ssn', 'ein'].includes(body.taxIdType)) {
    return Response.json({ error: 'Valid tax ID type (ssn or ein) is required' }, { status: 400 })
  }

  if (!body.taxId) {
    return Response.json({ error: 'Tax ID is required' }, { status: 400 })
  }

  // Validate tax ID format based on type
  // Remove any non-digit characters for validation
  const taxIdDigitsOnly = body.taxId.replace(/\D/g, '')

  if (body.taxIdType === 'ssn') {
    // SSN format: XXX-XX-XXXX (9 digits)
    // Valid patterns: 123-45-6789, 123456789
    const ssnRegex = /^(?!000|666|9\d{2})\d{3}(?!00)\d{2}(?!0000)\d{4}$/

    if (taxIdDigitsOnly.length !== 9) {
      return Response.json(
        { error: 'SSN must contain exactly 9 digits' },
        { status: 400 }
      )
    }

    if (!ssnRegex.test(taxIdDigitsOnly)) {
      return Response.json(
        { error: 'Invalid SSN format. SSN cannot start with 000, 666, or 9XX. Area and group numbers cannot be all zeros.' },
        { status: 400 }
      )
    }
  } else if (body.taxIdType === 'ein') {
    // EIN format: XX-XXXXXXX (9 digits)
    // First two digits must be a valid campus code (01-99, excluding certain codes)
    const einRegex = /^\d{9}$/

    if (taxIdDigitsOnly.length !== 9) {
      return Response.json(
        { error: 'EIN must contain exactly 9 digits' },
        { status: 400 }
      )
    }

    if (!einRegex.test(taxIdDigitsOnly)) {
      return Response.json(
        { error: 'Invalid EIN format. EIN must be 9 digits.' },
        { status: 400 }
      )
    }

    // Validate EIN prefix (first two digits)
    // IRS assigns prefixes based on campus location - 00 and certain codes are invalid
    const einPrefix = parseInt(taxIdDigitsOnly.substring(0, 2), 10)
    if (einPrefix === 0 || einPrefix === 7 || einPrefix === 8 || einPrefix === 9 ||
        einPrefix === 17 || einPrefix === 18 || einPrefix === 19 || einPrefix === 28 ||
        einPrefix === 29 || einPrefix === 49 || einPrefix === 69 || einPrefix === 70 ||
        einPrefix === 78 || einPrefix === 79 || einPrefix === 89 || einPrefix >= 97) {
      return Response.json(
        { error: 'Invalid EIN prefix. The first two digits must be a valid IRS campus code.' },
        { status: 400 }
      )
    }
  }

  if (!body.legalName) {
    return Response.json({ error: 'Legal name is required' }, { status: 400 })
  }

  if (!body.entityType) {
    return Response.json({ error: 'Entity type is required' }, { status: 400 })
  }

  if (!body.address) {
    return Response.json({ error: 'Address is required' }, { status: 400 })
  }

  if (!body.signature) {
    return Response.json({ error: 'Signature is required' }, { status: 400 })
  }

  // Get IP address from request
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    null

  try {
    const input: SubmitW9Input = {
      taxIdType: body.taxIdType,
      taxId: body.taxId,
      legalName: body.legalName,
      businessName: body.businessName,
      entityType: body.entityType,
      address: body.address,
      signature: body.signature,
    }

    const w9Info = await submitW9(
      auth.contractorId,
      auth.tenantId,
      auth.tenantSlug,
      input,
      ipAddress || undefined
    )

    return Response.json({
      success: true,
      info: {
        taxIdType: w9Info.taxIdType,
        taxIdLast4: w9Info.taxIdLast4,
        legalName: w9Info.legalName,
        businessName: w9Info.businessName,
        entityType: w9Info.entityType,
        address: w9Info.address,
        signedAt: w9Info.signedAt.toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof TaxError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }
    console.error('Error submitting W-9:', error)
    return Response.json(
      { error: 'Failed to submit W-9' },
      { status: 500 }
    )
  }
}
