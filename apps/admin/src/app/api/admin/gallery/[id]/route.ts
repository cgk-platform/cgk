/**
 * Gallery Submission API Routes
 * PATCH: Update submission status (approve/reject)
 * DELETE: Delete submission
 */

import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import { NextResponse } from 'next/server'

import {
  deleteUGCSubmission,
  getUGCSubmissionById,
  logChange,
  updateUGCSubmissionStatus,
} from '@/lib/admin-utilities/db'
import type { UGCModerationAction } from '@/lib/admin-utilities/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, context: RouteContext) {
  const { tenantId } = await getTenantContext(req)
  const { id } = await context.params

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const submission = await getUGCSubmissionById(tenantId, id)

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    return NextResponse.json({ submission })
  } catch (error) {
    console.error('Failed to fetch submission:', error)
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const { tenantId, userId, email } = await requireAuth(req)
  const { id } = await context.params

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const body: UGCModerationAction = await req.json()
    const { action, notes } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const status = action === 'approve' ? 'approved' : 'rejected'
    const reviewedBy = email || userId

    const submission = await updateUGCSubmissionStatus(
      tenantId,
      id,
      status,
      reviewedBy,
      notes
    )

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Log the change
    await logChange(tenantId, {
      source: 'admin',
      action: action,
      entityType: 'ugc_submission',
      entityId: id,
      summary: `${action === 'approve' ? 'Approved' : 'Rejected'} UGC submission from ${submission.customerName || 'Unknown'}`,
      details: { previousStatus: 'pending', newStatus: status, notes },
      userId,
      userEmail: email,
    })

    return NextResponse.json({ success: true, submission })
  } catch (error) {
    console.error('Failed to update submission:', error)
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const { tenantId, userId, email } = await requireAuth(req)
  const { id } = await context.params

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    // Get submission details before deletion for logging
    const submission = await getUGCSubmissionById(tenantId, id)

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const deleted = await deleteUGCSubmission(tenantId, id)

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 })
    }

    // Log the deletion
    await logChange(tenantId, {
      source: 'admin',
      action: 'delete',
      entityType: 'ugc_submission',
      entityId: id,
      summary: `Deleted UGC submission from ${submission.customerName || 'Unknown'}`,
      details: { customerEmail: submission.customerEmail },
      userId,
      userEmail: email,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete submission:', error)
    return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 })
  }
}
