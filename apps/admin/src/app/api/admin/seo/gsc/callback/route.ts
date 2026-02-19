export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { redirect } from 'next/navigation'

import { validateOAuthState } from '@/lib/oauth-state'
import {
  exchangeCodeForTokens,
  storeGSCCredentials,
  getGSCSites,
} from '@/lib/seo/google-search-console'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    const errorDescription = searchParams.get('error_description') || 'OAuth authorization failed'
    return redirect(`/admin/seo?error=${encodeURIComponent(errorDescription)}`)
  }

  if (!code || !state) {
    return redirect('/admin/seo?error=Missing+authorization+code')
  }

  // Validate HMAC-signed state (prevents CSRF; checks signature + 1hr expiry)
  let stateData: { tenantSlug: string; timestamp: number }
  try {
    stateData = await validateOAuthState<{ tenantSlug: string }>(state)
  } catch {
    return redirect('/admin/seo?error=Invalid+or+expired+state+token')
  }

  const { tenantSlug } = stateData

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Get available GSC sites
    // For now, we'll store with a placeholder site URL
    // In production, you'd show a site selection UI
    let siteUrl = ''

    try {
      // Temporarily store tokens to fetch sites
      await withTenant(tenantSlug, () =>
        storeGSCCredentials({
          siteUrl: 'https://placeholder.com',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        })
      )

      const sites = await withTenant(tenantSlug, () => getGSCSites())

      if (sites.length === 0) {
        return redirect('/admin/seo?error=No+sites+found+in+Search+Console')
      }

      // Use the first site (in production, let user choose)
      siteUrl = sites[0] || ''
    } catch {
      return redirect('/admin/seo?error=Failed+to+fetch+Search+Console+sites')
    }

    // Store final credentials with correct site URL
    await withTenant(tenantSlug, () =>
      storeGSCCredentials({
        siteUrl,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      })
    )

    return redirect('/admin/seo?success=Connected+to+Google+Search+Console')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed'
    return redirect(`/admin/seo?error=${encodeURIComponent(message)}`)
  }
}
