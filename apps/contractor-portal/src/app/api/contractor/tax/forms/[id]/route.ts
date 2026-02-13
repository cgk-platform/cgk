/**
 * Contractor Tax Form Download API
 *
 * GET /api/contractor/tax/forms/[id] - Download tax form
 */

import { getTaxFormById } from '@cgk-platform/payments'

import {
  requireContractorAuth,
  unauthorizedResponse,
} from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: RouteParams) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  const { id: formId } = await params

  try {
    const form = await getTaxFormById(formId, auth.contractorId, auth.tenantSlug)

    if (!form) {
      return Response.json({ error: 'Tax form not found' }, { status: 404 })
    }

    if (!form.fileUrl) {
      return Response.json(
        { error: 'Tax form not yet available for download' },
        { status: 400 }
      )
    }

    // Return the form details with download URL
    return Response.json({
      form: {
        id: form.id,
        formType: form.formType,
        taxYear: form.taxYear,
        totalAmountCents: form.totalAmountCents,
        status: form.status,
        fileUrl: form.fileUrl,
        generatedAt: form.generatedAt?.toISOString() || null,
        filedAt: form.filedAt?.toISOString() || null,
      },
    })
  } catch (error) {
    console.error('Error fetching tax form:', error)
    return Response.json(
      { error: 'Failed to fetch tax form' },
      { status: 500 }
    )
  }
}
