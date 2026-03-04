import { completeGoogleAdsOAuth } from '@cgk-platform/integrations'
import { redirect } from 'next/navigation'
import { logger } from '@cgk-platform/logging'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/integrations/google-ads/callback
 * Handle Google Ads OAuth callback
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    logger.error(
      'Google Ads OAuth error:',
      error instanceof Error ? error : new Error(String(error))
    )
    redirect(`/admin/settings/integrations?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    redirect('/admin/settings/integrations?error=Missing+OAuth+parameters')
  }

  try {
    const result = await completeGoogleAdsOAuth({ code, state })

    // Redirect based on account selection requirement
    if (result.requiresAccountSelection) {
      redirect('/admin/settings/integrations/google-ads?selectAccount=true')
    }

    redirect(result.returnUrl || '/admin/settings/integrations?success=google_ads')
  } catch (err) {
    logger.error(
      'Google Ads OAuth callback failed:',
      err instanceof Error ? err : new Error(String(err))
    )
    const message = err instanceof Error ? err.message : 'OAuth failed'
    redirect(`/admin/settings/integrations?error=${encodeURIComponent(message)}`)
  }
}
