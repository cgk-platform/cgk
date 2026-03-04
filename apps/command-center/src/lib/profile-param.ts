import { isValidProfile, PROFILE_SLUGS, type ProfileSlug } from '@cgk-platform/openclaw'

/**
 * Validate and extract profile slug from route params.
 * Returns null with a 400 response if invalid.
 */
export function validateProfileParam(params: {
  profile: string
}): { profile: ProfileSlug } | { error: Response } {
  const { profile } = params
  if (!isValidProfile(profile)) {
    return {
      error: Response.json(
        { error: `Invalid profile: ${profile}. Must be one of: ${PROFILE_SLUGS.join(', ')}` },
        { status: 400 }
      ),
    }
  }
  return { profile }
}
