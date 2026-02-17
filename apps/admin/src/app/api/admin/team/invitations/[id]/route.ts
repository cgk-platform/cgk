export const dynamic = 'force-dynamic'

import {
  checkPermissionOrRespond,
  getInvitation,
  requireAuth,
  revokeInvitation,
  type AuthContext,
} from '@cgk-platform/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

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

  // Check permission to view invitations
  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    tenantId,
    'team.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const invitation = await getInvitation(id)

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Ensure invitation belongs to this tenant
    if (invitation.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    return NextResponse.json({ invitation })
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    )
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

  // Check permission to manage team (revoke invitations)
  const revokePermissionDenied = await checkPermissionOrRespond(
    auth.userId,
    tenantId,
    'team.manage'
  )
  if (revokePermissionDenied) return revokePermissionDenied

  try {
    // Verify invitation belongs to this tenant
    const invitation = await getInvitation(id)
    if (!invitation || invitation.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
    const userAgent = headersList.get('user-agent') || undefined

    await revokeInvitation(id, auth.userId, { ipAddress, userAgent })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking invitation:', error)
    const message = error instanceof Error ? error.message : 'Failed to revoke invitation'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
