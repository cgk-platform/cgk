export const dynamic = 'force-dynamic'

import {
  getInvitationCountToday,
  getTeamMembers,
  requireAuth,
  type AuthContext,
} from '@cgk/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

const MAX_INVITATIONS_PER_DAY = 50

export async function GET(request: Request) {
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

  // Only admins and owners can view team
  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '20', 10)

  try {
    const { members, total } = await getTeamMembers(tenantId, { page, limit })
    const invitationsToday = await getInvitationCountToday(tenantId)

    return NextResponse.json({
      members,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      rateLimit: {
        used: invitationsToday,
        remaining: Math.max(0, MAX_INVITATIONS_PER_DAY - invitationsToday),
        limit: MAX_INVITATIONS_PER_DAY,
      },
    })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    )
  }
}
