import { NextResponse } from 'next/server'
import { getSetupStatus } from '@/lib/setup-detection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/setup/status
 *
 * Returns the current setup status of the platform.
 * Used by the setup wizard to determine which steps are complete.
 */
export async function GET() {
  try {
    const status = await getSetupStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('Failed to get setup status:', error)
    return NextResponse.json(
      {
        isConfigured: false,
        steps: {
          database: false,
          cache: false,
          storage: false,
          migrations: false,
          admin: false,
          config: false,
        },
        errors: {
          database: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
