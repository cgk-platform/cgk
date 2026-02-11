import { getInvitations, getTeamMembers, requireAuth } from '@cgk/auth'
import { Card, CardContent } from '@cgk/ui'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { TeamPageClient } from './team-page-client'

async function TeamDataLoader() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const userId = headersList.get('x-user-id')
  const userRole = headersList.get('x-user-role')

  if (!tenantId || !userId) {
    redirect('/login')
  }

  // Fetch team data from the API route to get rate limit info
  const [membersData, invitationsData] = await Promise.all([
    getTeamMembers(tenantId, { page: 1, limit: 50 }),
    getInvitations(tenantId, { status: 'pending', page: 1, limit: 50 }),
  ])

  // Get rate limit from database (we'll calculate it)
  const { sql } = await import('@cgk/db')
  const rateLimitResult = await sql`
    SELECT COUNT(*) as count
    FROM team_invitations
    WHERE tenant_id = ${tenantId}
      AND created_at >= CURRENT_DATE
  `
  const usedToday = parseInt(String(rateLimitResult.rows[0]?.count ?? 0), 10)
  const MAX_DAILY = 50

  return (
    <TeamPageClient
      members={membersData.members}
      invitations={invitationsData.invitations}
      currentUserId={userId}
      currentUserRole={userRole || 'member'}
      rateLimit={{
        used: usedToday,
        remaining: Math.max(0, MAX_DAILY - usedToday),
        limit: MAX_DAILY,
      }}
    />
  )
}

function TeamLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-4 w-60 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-10 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function TeamSettingsPage() {
  // Verify auth
  const headersList = await headers()
  const mockRequest = new Request('http://localhost', {
    headers: headersList,
  })

  try {
    const auth = await requireAuth(mockRequest)
    if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
      return (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view team settings.
            </p>
          </CardContent>
        </Card>
      )
    }
  } catch {
    redirect('/login')
  }

  return (
    <Suspense fallback={<TeamLoadingSkeleton />}>
      <TeamDataLoader />
    </Suspense>
  )
}
