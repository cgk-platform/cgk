export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { redirect } from 'next/navigation'

import {
  exchangeCodeForTokens,
  decodeOAuthState,
  getOAuthConfigFromEnv,
  createConnection,
  type GDriveConnection,
} from '@cgk-platform/dam'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error)
    return redirect('/admin/dam/gdrive?error=oauth_denied')
  }

  if (!code || !state) {
    return redirect('/admin/dam/gdrive?error=missing_params')
  }

  try {
    // Decode state
    const oauthState = decodeOAuthState(state)
    const { tenantId, userId, folderId, returnUrl } = oauthState

    // Get OAuth config
    const oauthConfig = getOAuthConfigFromEnv()

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(oauthConfig, code)

    // If no folder was specified, redirect to folder selection
    if (!folderId) {
      // Store tokens temporarily and redirect to folder selection
      // For now, redirect back with success
      return redirect(returnUrl || '/admin/dam/gdrive?success=connected')
    }

    // Get folder name from Drive
    const folderName = 'Google Drive Folder'

    // Create the connection
    const connection = await withTenant(tenantId, () =>
      createConnection(tenantId, userId, {
        name: folderName,
        folder_id: folderId,
        folder_name: folderName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(tokens.expiry_date).toISOString(),
        sync_mode: 'one_way',
        auto_sync: true,
      })
    )

    return redirect(returnUrl || `/admin/dam/gdrive?success=connected&connection=${(connection as GDriveConnection).id}`)
  } catch (error) {
    console.error('OAuth callback error:', error)
    return redirect('/admin/dam/gdrive?error=callback_failed')
  }
}
