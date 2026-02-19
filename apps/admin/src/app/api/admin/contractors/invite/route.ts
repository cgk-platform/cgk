import { headers } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

import {
  getTenantResendClient,
  getTenantResendSenderConfig,
} from '@cgk-platform/integrations'

import { createContractorInvitation, createProject } from '@/lib/contractors/db'
import type { ContractorInvitation } from '@/lib/contractors/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/contractors/invite
 * Send contractor invitation email
 */
export async function POST(req: NextRequest) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as ContractorInvitation

  if (!body.email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  // Validate due date if project assignment is provided
  if (body.projectAssignment?.dueDate) {
    const dueDate = new Date(body.projectAssignment.dueDate)
    if (dueDate < new Date()) {
      return NextResponse.json(
        { error: 'Project due date must be in the future' },
        { status: 400 },
      )
    }
  }

  // Create contractor and invitation
  const { contractorId, inviteToken } = await createContractorInvitation(
    tenantSlug,
    tenantId,
    body.email,
    body.name,
  )

  // Create initial project if specified
  if (body.projectAssignment) {
    await createProject(tenantSlug, tenantId, {
      contractorId,
      title: body.projectAssignment.title,
      description: body.projectAssignment.description,
      dueDate: body.projectAssignment.dueDate
        ? new Date(body.projectAssignment.dueDate)
        : undefined,
      rateCents: body.projectAssignment.rateCents,
    })
  }

  // Send invitation email
  let emailSent = false
  const portalUrl =
    process.env.NEXT_PUBLIC_CONTRACTOR_PORTAL_URL ||
    process.env.CONTRACTOR_PORTAL_URL ||
    'https://contractors.cgk.com'
  const inviteUrl = `${portalUrl}/api/auth/invite?token=${encodeURIComponent(inviteToken)}&tenant=${encodeURIComponent(tenantSlug)}`

  try {
    const resend = await getTenantResendClient(tenantSlug)
    if (resend) {
      const senderConfig = await getTenantResendSenderConfig(tenantSlug)
      const fromEmail = senderConfig?.from || `noreply@${tenantSlug}.com`

      await resend.emails.send({
        from: fromEmail,
        to: body.email,
        replyTo: senderConfig?.replyTo,
        subject: `You've been invited to join as a contractor`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You're invited!</h2>
            <p>Hi${body.name ? ` ${body.name}` : ''},</p>
            <p>${body.message || 'You have been invited to join as a contractor.'}</p>
            <p style="margin: 24px 0;">
              <a href="${inviteUrl}"
                 style="background-color: #2D2D2D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600;">
                Accept Invitation
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              This invitation expires in 72 hours.
            </p>
          </div>
        `,
      })
      emailSent = true
    } else {
      // Dev mode: log the invite link
      console.log(`[DEV] Contractor invite for ${body.email}: ${inviteUrl}`)
      emailSent = true
    }
  } catch (emailError) {
    console.error('Failed to send contractor invitation email:', emailError)
  }

  return NextResponse.json(
    {
      success: true,
      contractorId,
      emailSent,
      message: emailSent
        ? `Invitation sent to ${body.email}`
        : `Contractor created but email failed. Invite link: ${inviteUrl}`,
    },
    { status: 201 },
  )
}
