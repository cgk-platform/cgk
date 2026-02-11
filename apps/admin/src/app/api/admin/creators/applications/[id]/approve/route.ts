export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { withTenant, sql } from '@cgk/db'

import { updateApplicationStatus, getApplicationById } from '@/lib/creators-admin-ops'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const {
      commissionPercent,
      discountCode,
      tier,
      notes,
      sendNotification,
    } = body as {
      commissionPercent?: number
      discountCode?: string
      tier?: string
      notes?: string
      sendNotification?: boolean
    }

    // Fetch application
    const application = await getApplicationById(tenantSlug, id)
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Create creator record
    const creator = await withTenant(tenantSlug, async () => {
      // Generate discount code if not provided
      const finalCode = discountCode || generateDiscountCode(application.name)

      // Insert creator
      const result = await sql`
        INSERT INTO creators (
          email, first_name, last_name, phone,
          status, tier, commission_rate_pct, referral_code,
          instagram_handle, tiktok_handle, youtube_handle,
          notes
        ) VALUES (
          ${application.email},
          ${application.name.split(' ')[0] || application.name},
          ${application.name.split(' ').slice(1).join(' ') || ''},
          ${application.phone},
          'approved'::creator_status,
          ${(tier as 'bronze' | 'silver' | 'gold' | 'platinum') || 'bronze'}::creator_tier,
          ${commissionPercent || 10},
          ${finalCode},
          ${application.instagram},
          ${application.tiktok},
          ${application.youtube},
          ${notes || null}
        )
        RETURNING *
      `
      return result.rows[0]
    })

    // Update application status
    await updateApplicationStatus(tenantSlug, id, 'approved', userId, {
      internalNotes: notes,
      creatorId: creator?.id,
    })

    // TODO: Send notification email if sendNotification is true

    return NextResponse.json({
      success: true,
      creator,
      notificationSent: sendNotification || false,
    })
  } catch (error) {
    console.error('Error approving application:', error)
    return NextResponse.json(
      { error: 'Failed to approve application' },
      { status: 500 }
    )
  }
}

function generateDiscountCode(name: string): string {
  const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 6)
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, '0')
  return `${cleanName}${random}`
}
