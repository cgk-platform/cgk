export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

import { requireAuth, checkPermissionOrRespond } from '@cgk-platform/auth'
import { withTenant, sql } from '@cgk-platform/db'
import { sendJob } from '@cgk-platform/jobs'

const VALID_ACTIONS: Record<string, string> = {
  approve: 'approved',
  reject: 'rejected',
  spam: 'spam',
}

interface ReviewData {
  id: string
  author_email: string
  author_name: string | null
  product_title: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Authenticate and check permissions
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId,
    'reviews.moderate'
  )
  if (permissionDenied) return permissionDenied

  // Get tenant slug
  const orgResult = await sql`
    SELECT slug FROM public.organizations
    WHERE id = ${auth.tenantId}
    LIMIT 1
  `
  const tenantSlug = orgResult.rows[0]?.slug as string
  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action as 'approve' | 'reject' | 'spam' | undefined
  const newStatus = action ? VALID_ACTIONS[action] : undefined
  if (!newStatus || !action) {
    return NextResponse.json(
      { error: 'Invalid action. Must be: approve, reject, or spam' },
      { status: 400 }
    )
  }

  // Get review data before updating
  const review = await withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, author_email, author_name, product_title
      FROM reviews
      WHERE id = ${id}
    `
    return result.rows[0] as ReviewData | undefined
  })

  if (!review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }

  // Update review status
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE reviews
      SET status = ${newStatus}::review_status, updated_at = NOW()
      WHERE id = ${id}
    `
  })

  // Queue notification email for approved/rejected reviews (not spam)
  if (action !== 'spam' && review.author_email) {
    try {
      await sendJob('review.moderated', {
        tenantId: auth.tenantId,
        reviewId: id,
        action,
        reviewerEmail: review.author_email,
        reviewerName: review.author_name,
        productTitle: review.product_title,
      })
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to queue review moderation notification:', error)
    }
  }

  return NextResponse.json({ success: true, status: newStatus })
}
