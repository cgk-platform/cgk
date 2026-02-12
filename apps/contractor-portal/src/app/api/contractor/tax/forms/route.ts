/**
 * Contractor Tax Forms API
 *
 * GET /api/contractor/tax/forms - List tax forms (1099-NEC)
 */

import { getTaxForms } from '@cgk/payments'

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

  const url = new URL(req.url)
  const year = url.searchParams.get('year')
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  try {
    const result = await getTaxForms(
      auth.contractorId,
      auth.tenantSlug,
      {
        year: year ? parseInt(year, 10) : undefined,
        limit: Math.min(limit, 100),
        offset,
      }
    )

    return Response.json({
      forms: result.forms.map((f) => ({
        id: f.id,
        formType: f.formType,
        taxYear: f.taxYear,
        totalAmountCents: f.totalAmountCents,
        status: f.status,
        fileUrl: f.fileUrl,
        generatedAt: f.generatedAt?.toISOString() || null,
        filedAt: f.filedAt?.toISOString() || null,
        createdAt: f.createdAt.toISOString(),
      })),
      total: result.total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching tax forms:', error)
    return Response.json(
      { error: 'Failed to fetch tax forms' },
      { status: 500 }
    )
  }
}
