import { completeTikTokOAuth } from '@cgk-platform/integrations'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/integrations/tiktok/callback
 * Handle TikTok Ads OAuth callback
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('auth_code') || url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    redirect('/admin/settings/integrations?error=Missing+OAuth+parameters')
  }

  try {
    const result = await completeTikTokOAuth({ code, state })

    // Redirect based on account selection requirement
    if (result.requiresAccountSelection) {
      redirect('/admin/settings/integrations/tiktok?selectAccount=true')
    }

    redirect(result.returnUrl || '/admin/settings/integrations?success=tiktok')
  } catch (err) {
    console.error('TikTok OAuth callback failed:', err)
    const message = err instanceof Error ? err.message : 'OAuth failed'
    redirect(`/admin/settings/integrations?error=${encodeURIComponent(message)}`)
  }
}
