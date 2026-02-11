import { completeMetaOAuth } from '@cgk/integrations'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/integrations/meta/callback
 * Handle Meta Ads OAuth callback
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('Meta OAuth error:', error, errorDescription)
    redirect(`/admin/settings/integrations?error=${encodeURIComponent(errorDescription || error)}`)
  }

  if (!code || !state) {
    redirect('/admin/settings/integrations?error=Missing+OAuth+parameters')
  }

  try {
    const result = await completeMetaOAuth({ code, state })

    // Redirect based on account selection requirement
    if (result.requiresAccountSelection) {
      redirect('/admin/settings/integrations/meta?selectAccount=true')
    }

    redirect(result.returnUrl || '/admin/settings/integrations?success=meta')
  } catch (err) {
    console.error('Meta OAuth callback failed:', err)
    const message = err instanceof Error ? err.message : 'OAuth failed'
    redirect(`/admin/settings/integrations?error=${encodeURIComponent(message)}`)
  }
}
