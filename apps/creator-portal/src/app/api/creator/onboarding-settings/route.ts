/**
 * Onboarding Settings API
 *
 * GET /api/creator/onboarding-settings - Get tenant onboarding settings
 */

import { sql, withTenant, getTenantFromRequest } from '@cgk-platform/db'
import type { OnboardingSettings, SurveyQuestion } from '../../../../lib/onboarding/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SettingsRecord {
  welcome_call_enabled: boolean
  welcome_call_mode: string
  welcome_call_external_url: string | null
  welcome_call_external_behavior: string | null
  welcome_call_event_type_id: string | null
  survey_questions: SurveyQuestion[]
  require_social_media: boolean
  require_portfolio: boolean
  enabled_social_platforms: string[]
}

/**
 * Get tenant onboarding settings
 */
export async function GET(request: Request): Promise<Response> {
  const tenant = await getTenantFromRequest(request)

  if (!tenant) {
    return Response.json(
      { error: 'Tenant context required' },
      { status: 400 }
    )
  }

  const settings = await withTenant(tenant.slug, async () => {
    const result = await sql<SettingsRecord>`
      SELECT
        welcome_call_enabled,
        welcome_call_mode,
        welcome_call_external_url,
        welcome_call_external_behavior,
        welcome_call_event_type_id,
        survey_questions,
        require_social_media,
        require_portfolio,
        enabled_social_platforms
      FROM tenant_onboarding_settings
      LIMIT 1
    `
    return result.rows[0]
  })

  // Return default settings if none found
  if (!settings) {
    const defaultSettings: OnboardingSettings = {
      welcomeCall: {
        enabled: true,
        mode: 'disabled',
        isConfigured: false,
      },
      surveyQuestions: [],
    }
    return Response.json({ settings: defaultSettings })
  }

  // Determine if welcome call is properly configured
  const isConfigured =
    settings.welcome_call_mode === 'disabled' ||
    (settings.welcome_call_mode === 'external' && Boolean(settings.welcome_call_external_url)) ||
    (settings.welcome_call_mode === 'internal' && Boolean(settings.welcome_call_event_type_id))

  const onboardingSettings: OnboardingSettings = {
    welcomeCall: {
      enabled: settings.welcome_call_enabled,
      mode: settings.welcome_call_mode as 'internal' | 'external' | 'disabled',
      isConfigured,
      externalUrl: settings.welcome_call_external_url || undefined,
      externalUrlBehavior: (settings.welcome_call_external_behavior as 'redirect' | 'embed') || undefined,
    },
    surveyQuestions: settings.survey_questions || [],
  }

  return Response.json({ settings: onboardingSettings })
}
