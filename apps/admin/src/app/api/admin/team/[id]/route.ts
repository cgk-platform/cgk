export const dynamic = 'force-dynamic'

import {
  getTeamMember,
  removeMember,
  requireAuth,
  updateMemberRole,
  type AuthContext,
  type UserRole,
} from '@cgk-platform/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

const VALID_ROLES: UserRole[] = ['owner', 'admin', 'member']

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const member = await getTeamMember(tenantId, id)

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    return NextResponse.json({ member })
  } catch (error) {
    console.error('Error fetching team member:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team member' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only owners can change roles
  if (!['owner', 'super_admin'].includes(auth.role)) {
    return NextResponse.json(
      { error: 'Only owners can change team member roles' },
      { status: 403 }
    )
  }

  // Cannot change own role
  if (id === auth.userId) {
    return NextResponse.json(
      { error: 'Cannot change your own role' },
      { status: 400 }
    )
  }

  let body: { role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.role || !VALID_ROLES.includes(body.role as UserRole)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
    const userAgent = headersList.get('user-agent') || undefined

    await updateMemberRole(
      tenantId,
      id,
      body.role as UserRole,
      auth.userId,
      { ipAddress, userAgent }
    )

    return NextResponse.json({ success: true, role: body.role })
  } catch (error) {
    console.error('Error updating member role:', error)
    const message = error instanceof Error ? error.message : 'Failed to update role'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only owners can remove members
  if (!['owner', 'super_admin'].includes(auth.role)) {
    return NextResponse.json(
      { error: 'Only owners can remove team members' },
      { status: 403 }
    )
  }

  // Cannot remove self (use leave instead)
  if (id === auth.userId) {
    return NextResponse.json(
      { error: 'Cannot remove yourself. Use the leave organization option instead.' },
      { status: 400 }
    )
  }

  try {
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
    const userAgent = headersList.get('user-agent') || undefined

    await removeMember(tenantId, id, auth.userId, { ipAddress, userAgent })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing team member:', error)
    const message = error instanceof Error ? error.message : 'Failed to remove member'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
