/**
 * Stripe Connect Self-Hosted Onboarding API
 *
 * GET  /api/contractor/payments/connect/onboard - Get onboarding status
 * POST /api/contractor/payments/connect/onboard - Start onboarding (step 1)
 */

import {
  createStripeAccount,
  getOnboardingProgress,
  getPayoutMethods,
  StripeConnectError,
  type StripeBusinessType,
} from '@cgk/payments'

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
    const progress = await getOnboardingProgress(auth.contractorId, auth.tenantSlug)

    if (!progress) {
      return Response.json({
        started: false,
        currentStep: 0,
        stripeAccountId: null,
      })
    }

    // Get payout method status
    const methods = await getPayoutMethods(auth.contractorId, auth.tenantSlug)
    const stripeMethod = methods.find(
      (m) => m.type === 'stripe_connect' || m.type === 'stripe_connect_standard'
    )

    return Response.json({
      started: true,
      currentStep: progress.currentStep,
      stripeAccountId: progress.stripeAccountId,
      step1Data: progress.step1Data,
      step2Data: progress.step2Data,
      step3Data: progress.step3Data,
      step4Completed: progress.step4Completed,
      completedAt: progress.completedAt?.toISOString() || null,
      // Include method status for requirements
      stripeAccountStatus: stripeMethod?.stripeAccountStatus || null,
      stripePayoutsEnabled: stripeMethod?.stripePayoutsEnabled || false,
      stripeRequirementsDue: stripeMethod?.stripeRequirementsDue || [],
      stripeRequirementsErrors: stripeMethod?.stripeRequirementsErrors || [],
    })
  } catch (error) {
    console.error('Error fetching onboarding progress:', error)
    return Response.json(
      { error: 'Failed to fetch onboarding progress' },
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
    businessType: StripeBusinessType
    country: string
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.businessType) {
    return Response.json({ error: 'Business type is required' }, { status: 400 })
  }

  if (!body.country) {
    return Response.json({ error: 'Country is required' }, { status: 400 })
  }

  try {
    const result = await createStripeAccount(
      auth.contractorId,
      auth.tenantId,
      auth.tenantSlug,
      {
        businessType: body.businessType,
        country: body.country,
      }
    )

    return Response.json({
      success: true,
      accountId: result.accountId,
      progress: {
        currentStep: result.progress.currentStep,
        stripeAccountId: result.progress.stripeAccountId,
        step1Data: result.progress.step1Data,
      },
    })
  } catch (error) {
    if (error instanceof StripeConnectError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }
    console.error('Error creating Stripe account:', error)
    return Response.json(
      { error: 'Failed to create Stripe account' },
      { status: 500 }
    )
  }
}
