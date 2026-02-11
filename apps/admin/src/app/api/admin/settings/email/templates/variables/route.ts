export const dynamic = 'force-dynamic'

import {
  COMMON_VARIABLES,
  NOTIFICATION_VARIABLES,
  getVariablesForType,
} from '@cgk/communications'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/settings/email/templates/variables
 *
 * Get available template variables
 *
 * Query params:
 * - notificationType: Get variables for a specific notification type
 * - all: If true, return all notification types and their variables
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const notificationType = url.searchParams.get('notificationType')
  const all = url.searchParams.get('all') === 'true'

  // Return all variables grouped by notification type
  if (all) {
    const allVariables: Record<string, typeof COMMON_VARIABLES> = {
      common: COMMON_VARIABLES,
      ...NOTIFICATION_VARIABLES,
    }

    return NextResponse.json({ variables: allVariables })
  }

  // Return variables for a specific notification type
  if (notificationType) {
    const variables = getVariablesForType(notificationType)
    return NextResponse.json({
      notificationType,
      variables,
    })
  }

  // Return just common variables
  return NextResponse.json({
    commonVariables: COMMON_VARIABLES,
    notificationTypes: Object.keys(NOTIFICATION_VARIABLES),
  })
}
