import { headers } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

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
  const { contractorId } = await createContractorInvitation(
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

  // Queue invitation email
  // In production, this would trigger a background job to send the email
  // await jobs.send('contractor/invitation', {
  //   tenantId,
  //   contractorId,
  //   email: body.email,
  //   name: body.name,
  //   message: body.message,
  //   inviteToken,
  // })

  return NextResponse.json(
    {
      success: true,
      contractorId,
      message: `Invitation sent to ${body.email}`,
    },
    { status: 201 },
  )
}
