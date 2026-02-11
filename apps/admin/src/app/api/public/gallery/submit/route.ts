/**
 * Public Gallery Submission API
 * POST: Submit UGC photos (public, no auth required)
 */

import { getTenantContext } from '@cgk/auth'
import { NextResponse } from 'next/server'

import { createUGCSubmission, logChange } from '@/lib/admin-utilities/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    // Parse form data
    const formData = await req.formData()

    const customerName = formData.get('customerName') as string | null
    const customerEmail = formData.get('customerEmail') as string | null
    const customerPhone = formData.get('customerPhone') as string | null
    const testimonial = formData.get('testimonial') as string | null
    const productsUsedStr = formData.get('productsUsed') as string | null
    const durationDaysStr = formData.get('durationDays') as string | null
    const consentMarketing = formData.get('consentMarketing') === 'true'
    const consentTerms = formData.get('consentTerms') === 'true'

    // Get image URLs (in production, these would be uploaded to storage first)
    const beforeImageUrl = formData.get('beforeImageUrl') as string
    const afterImageUrl = formData.get('afterImageUrl') as string

    if (!beforeImageUrl || !afterImageUrl) {
      return NextResponse.json(
        { error: 'Both before and after images are required' },
        { status: 400 }
      )
    }

    if (!consentTerms) {
      return NextResponse.json(
        { error: 'Terms consent is required' },
        { status: 400 }
      )
    }

    // Parse products used
    const productsUsed = productsUsedStr
      ? productsUsedStr.split(',').map((p) => p.trim()).filter(Boolean)
      : []

    // Parse duration days
    const durationDays = durationDaysStr ? parseInt(durationDaysStr, 10) : undefined

    // Get request metadata
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                      req.headers.get('x-real-ip') ||
                      'unknown'
    const userAgent = req.headers.get('user-agent') || undefined

    // Create the submission
    const submission = await createUGCSubmission(tenantId, {
      customerName: customerName || undefined,
      customerEmail: customerEmail || undefined,
      customerPhone: customerPhone || undefined,
      beforeImageUrl,
      afterImageUrl,
      testimonial: testimonial || undefined,
      productsUsed,
      durationDays,
      consentMarketing,
      consentTerms,
      source: 'web_form',
      ipAddress,
      userAgent,
    })

    // Log the submission
    await logChange(tenantId, {
      source: 'user',
      action: 'create',
      entityType: 'ugc_submission',
      entityId: submission.id,
      summary: `New UGC submission from ${customerName || customerEmail || 'Anonymous'}`,
      details: { customerEmail, productsUsed },
    })

    return NextResponse.json({
      success: true,
      message: 'Thank you for your submission! We will review it shortly.',
      submissionId: submission.id,
    })
  } catch (error) {
    console.error('Failed to create submission:', error)
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  }
}
