/**
 * Payout Methods API
 *
 * GET    /api/contractor/payments/methods - List payout methods
 * POST   /api/contractor/payments/methods - Add payout method
 * PATCH  /api/contractor/payments/methods - Update payout method
 * DELETE /api/contractor/payments/methods - Remove payout method
 */

import {
  addPayoutMethod,
  getPayoutMethods,
  getW9Status,
  PayoutMethodError,
  removePayoutMethod,
  updatePayoutMethod,
  type AddPayoutMethodInput,
  type CheckAddress,
  type PayoutMethodType,
  type UpdatePayoutMethodInput,
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
    const [methods, w9Status] = await Promise.all([
      getPayoutMethods(auth.contractorId, auth.tenantSlug),
      getW9Status(auth.contractorId, auth.tenantSlug),
    ])

    return Response.json({
      methods: methods.map((m) => ({
        id: m.id,
        type: m.type,
        isDefault: m.isDefault,
        status: m.status,
        // Stripe Connect fields
        stripeAccountId: m.stripeAccountId,
        stripeAccountStatus: m.stripeAccountStatus,
        stripeOnboardingComplete: m.stripeOnboardingComplete,
        stripePayoutsEnabled: m.stripePayoutsEnabled,
        stripeRequirementsDue: m.stripeRequirementsDue,
        accountCountry: m.accountCountry,
        accountCurrency: m.accountCurrency,
        // Alternative methods
        paypalEmail: m.paypalEmail,
        venmoHandle: m.venmoHandle,
        checkAddress: m.checkAddress,
        bankName: m.bankName,
        accountLastFour: m.accountLastFour,
        verificationStatus: m.verificationStatus,
        verifiedAt: m.verifiedAt?.toISOString() || null,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      w9Status,
    })
  } catch (error) {
    console.error('Error fetching payout methods:', error)
    return Response.json(
      { error: 'Failed to fetch payout methods' },
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
    type: Exclude<PayoutMethodType, 'stripe_connect' | 'stripe_connect_standard'>
    paypalEmail?: string
    venmoHandle?: string
    checkAddress?: CheckAddress
    setAsDefault?: boolean
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.type) {
    return Response.json({ error: 'Method type is required' }, { status: 400 })
  }

  // Type validation is done by TypeScript - body.type is already narrowed to exclude stripe_connect types

  try {
    const input: AddPayoutMethodInput = {
      type: body.type,
      paypalEmail: body.paypalEmail,
      venmoHandle: body.venmoHandle,
      checkAddress: body.checkAddress,
      setAsDefault: body.setAsDefault,
    }

    const method = await addPayoutMethod(
      auth.contractorId,
      auth.tenantId,
      auth.tenantSlug,
      input
    )

    return Response.json({
      success: true,
      method: {
        id: method.id,
        type: method.type,
        isDefault: method.isDefault,
        status: method.status,
        paypalEmail: method.paypalEmail,
        venmoHandle: method.venmoHandle,
        checkAddress: method.checkAddress,
        verificationStatus: method.verificationStatus,
        createdAt: method.createdAt.toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof PayoutMethodError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }
    console.error('Error adding payout method:', error)
    return Response.json(
      { error: 'Failed to add payout method' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  let body: {
    id: string
    isDefault?: boolean
    paypalEmail?: string
    venmoHandle?: string
    checkAddress?: CheckAddress
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id) {
    return Response.json({ error: 'Method ID is required' }, { status: 400 })
  }

  try {
    const input: UpdatePayoutMethodInput = {
      isDefault: body.isDefault,
      paypalEmail: body.paypalEmail,
      venmoHandle: body.venmoHandle,
      checkAddress: body.checkAddress,
    }

    const method = await updatePayoutMethod(
      body.id,
      auth.contractorId,
      auth.tenantSlug,
      input
    )

    return Response.json({
      success: true,
      method: {
        id: method.id,
        type: method.type,
        isDefault: method.isDefault,
        status: method.status,
        paypalEmail: method.paypalEmail,
        venmoHandle: method.venmoHandle,
        checkAddress: method.checkAddress,
        verificationStatus: method.verificationStatus,
        updatedAt: method.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof PayoutMethodError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }
    console.error('Error updating payout method:', error)
    return Response.json(
      { error: 'Failed to update payout method' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  const url = new URL(req.url)
  const methodId = url.searchParams.get('id')

  if (!methodId) {
    return Response.json({ error: 'Method ID is required' }, { status: 400 })
  }

  try {
    await removePayoutMethod(methodId, auth.contractorId, auth.tenantSlug)
    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof PayoutMethodError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }
    console.error('Error removing payout method:', error)
    return Response.json(
      { error: 'Failed to remove payout method' },
      { status: 500 }
    )
  }
}
