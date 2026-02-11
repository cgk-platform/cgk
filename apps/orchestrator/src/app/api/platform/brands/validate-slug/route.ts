/**
 * Slug Validation API
 *
 * GET /api/platform/brands/validate-slug?slug=xxx - Check if slug is available
 */

import { requireAuth } from '@cgk/auth'
import { generateSlug, isSlugAvailable, isValidSlug } from '@cgk/onboarding'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/platform/brands/validate-slug?slug=xxx&name=xxx
 *
 * Validate a slug or generate one from a name
 */
export async function GET(req: Request) {
  try {
    await requireAuth(req)

    const url = new URL(req.url)
    const slug = url.searchParams.get('slug')
    const name = url.searchParams.get('name')

    // If name provided, generate slug from it
    if (name && !slug) {
      const generatedSlug = generateSlug(name)
      const available = await isSlugAvailable(generatedSlug)

      return Response.json({
        slug: generatedSlug,
        valid: isValidSlug(generatedSlug),
        available,
      })
    }

    // Validate provided slug
    if (!slug) {
      return Response.json(
        { error: 'slug or name parameter required' },
        { status: 400 }
      )
    }

    const valid = isValidSlug(slug)
    const available = valid ? await isSlugAvailable(slug) : false

    return Response.json({
      slug,
      valid,
      available,
      message: !valid
        ? 'Slug must be 3-50 lowercase alphanumeric characters with underscores only'
        : !available
          ? 'This slug is already taken'
          : 'Slug is available',
    })
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
