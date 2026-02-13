export const dynamic = 'force-dynamic'

import {
  decryptToken,
  disconnectPlatformWorkspace,
  getPlatformWorkspace,
  revokeToken,
} from '@cgk-platform/slack'
import { NextResponse } from 'next/server'

/**
 * DELETE /api/platform/slack/disconnect
 * Disconnects platform ops Slack workspace
 */
export async function DELETE() {
  try {
    // Get current workspace to revoke tokens
    const workspace = await getPlatformWorkspace()

    if (workspace) {
      // Attempt to revoke tokens (best effort)
      try {
        const botToken = decryptToken(workspace.botTokenEncrypted)
        await revokeToken(botToken)

        if (workspace.userTokenEncrypted) {
          const userToken = decryptToken(workspace.userTokenEncrypted)
          await revokeToken(userToken)
        }
      } catch {
        // Token revocation failure is not critical
      }
    }

    // Mark workspace as inactive
    await disconnectPlatformWorkspace()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to disconnect platform Slack:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Slack' },
      { status: 500 },
    )
  }
}
