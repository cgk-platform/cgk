/**
 * Stripe Connect Account Update API
 *
 * POST /api/contractor/payments/connect/update - Update account info (step-based)
 */

import {
  StripeConnectError,
  updateStripeAccountStep2,
  updateStripeAccountStep3,
  updateStripeAccountStep4,
  type StripeOnboardingStep2,
  type StripeOnboardingStep3,
} from '@cgk-platform/payments'

import {
  requireContractorAuth,
  unauthorizedResponse,
} from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  let body: {
    step: 2 | 3 | 4
    data: StripeOnboardingStep2 | StripeOnboardingStep3 | {
      ssn?: string
      ssnLast4?: string
      nationalId?: string
      cpf?: string
    }
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.step || ![2, 3, 4].includes(body.step)) {
    return Response.json({ error: 'Valid step (2, 3, or 4) is required' }, { status: 400 })
  }

  if (!body.data) {
    return Response.json({ error: 'Step data is required' }, { status: 400 })
  }

  try {
    let progress

    switch (body.step) {
      case 2:
        progress = await updateStripeAccountStep2(
          auth.contractorId,
          auth.tenantSlug,
          body.data as StripeOnboardingStep2
        )
        break

      case 3:
        progress = await updateStripeAccountStep3(
          auth.contractorId,
          auth.tenantSlug,
          body.data as StripeOnboardingStep3
        )
        break

      case 4:
        progress = await updateStripeAccountStep4(
          auth.contractorId,
          auth.tenantSlug,
          body.data as {
            ssn?: string
            ssnLast4?: string
            nationalId?: string
            cpf?: string
          }
        )
        break
    }

    return Response.json({
      success: true,
      progress: {
        currentStep: progress.currentStep,
        step1Data: progress.step1Data,
        step2Data: progress.step2Data,
        step3Data: progress.step3Data,
        step4Completed: progress.step4Completed,
        completedAt: progress.completedAt?.toISOString() || null,
      },
    })
  } catch (error) {
    if (error instanceof StripeConnectError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }
    console.error('Error updating Stripe account:', error)
    return Response.json(
      { error: 'Failed to update Stripe account' },
      { status: 500 }
    )
  }
}
