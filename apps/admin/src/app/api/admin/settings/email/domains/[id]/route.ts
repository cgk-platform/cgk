export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  deleteDomain,
  deleteDomainFromResend,
  getDomainById,
  getResendConfig,
} from '@cgk/communications'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/settings/email/domains/[id]
 * Get a specific email domain
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const domain = await withTenant(tenantSlug, () => getDomainById(id))

  if (!domain) {
    return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
  }

  return NextResponse.json({ domain })
}

/**
 * DELETE /api/admin/settings/email/domains/[id]
 * Delete an email domain
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Get domain first to check if it exists and get Resend ID
  const domain = await withTenant(tenantSlug, () => getDomainById(id))

  if (!domain) {
    return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
  }

  // Delete from Resend first
  if (domain.resendDomainId) {
    const resendConfig = getResendConfig()
    if (resendConfig) {
      const result = await deleteDomainFromResend(domain.resendDomainId, resendConfig)
      if (!result.success) {
        // Log but don't block deletion
        console.warn(`Failed to delete domain from Resend: ${result.error}`)
      }
    }
  }

  // Delete from database (will cascade to sender addresses)
  const deleted = await withTenant(tenantSlug, () => deleteDomain(id))

  if (!deleted) {
    return NextResponse.json({ error: 'Failed to delete domain' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
