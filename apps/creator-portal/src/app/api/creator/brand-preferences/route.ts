/**
 * Creator Brand Preferences API Route
 *
 * GET /api/creator/brand-preferences - Get creator's general brand preferences
 * PUT /api/creator/brand-preferences - Update creator's general brand preferences
 */

import { sql } from '@cgk/db'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'
import type {
  BrandCategory,
  ContentFormatPreference,
  ContentType,
  CreatorBrandPreferences,
  PartnershipType,
  PlatformPreference,
  PricingRange,
  RateCardEntry,
  UpdateCreatorBrandPreferencesInput,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Default pricing ranges (all enabled by default)
 */
const DEFAULT_PRICING_RANGES: Record<PricingRange, boolean> = {
  budget: true,
  midrange: true,
  premium: true,
  luxury: true,
}

/**
 * Calculate profile completeness based on filled sections
 */
function calculateProfileCompleteness(preferences: {
  preferredCategories: BrandCategory[]
  contentTypes: ContentType[]
  partnershipTypes: PartnershipType[]
  contentFormats: ContentFormatPreference[]
  platformPreferences: PlatformPreference[]
  rateCard: RateCardEntry[]
}): number {
  let score = 0
  const sections = 6

  if (preferences.preferredCategories.length > 0) score++
  if (preferences.contentTypes.length > 0) score++
  if (preferences.partnershipTypes.length > 0) score++
  if (preferences.contentFormats.length > 0) score++
  if (preferences.platformPreferences.length > 0) score++
  if (preferences.rateCard.length > 0) score++

  return Math.round((score / sections) * 100)
}

/**
 * Fetch creator's general brand preferences
 */
export async function GET(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const result = await sql`
      SELECT
        id,
        creator_id as "creatorId",
        preferred_categories as "preferredCategories",
        content_types as "contentTypes",
        pricing_ranges as "pricingRanges",
        partnership_types as "partnershipTypes",
        content_formats as "contentFormats",
        platform_preferences as "platformPreferences",
        rate_card as "rateCard",
        minimum_rate_cents as "minimumRateCents",
        is_available_for_work as "isAvailableForWork",
        availability_notes as "availabilityNotes",
        profile_completeness_percent as "profileCompletenessPercent",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM creator_preferences
      WHERE creator_id = ${context.creatorId}
    `

    // If no preferences exist, return defaults
    if (result.rows.length === 0) {
      const defaultPreferences: CreatorBrandPreferences = {
        id: '',
        creatorId: context.creatorId,
        preferredCategories: [],
        contentTypes: [],
        pricingRanges: DEFAULT_PRICING_RANGES,
        partnershipTypes: [],
        contentFormats: [],
        platformPreferences: [],
        rateCard: [],
        minimumRateCents: null,
        isAvailableForWork: true,
        availabilityNotes: null,
        profileCompletenessPercent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      return Response.json({
        preferences: defaultPreferences,
        isDefault: true,
      })
    }

    const row = result.rows[0]!
    const preferences: CreatorBrandPreferences = {
      id: row.id as string,
      creatorId: row.creatorId as string,
      preferredCategories: (row.preferredCategories as BrandCategory[]) || [],
      contentTypes: (row.contentTypes as ContentType[]) || [],
      pricingRanges: (row.pricingRanges as Record<PricingRange, boolean>) || DEFAULT_PRICING_RANGES,
      partnershipTypes: (row.partnershipTypes as PartnershipType[]) || [],
      contentFormats: (row.contentFormats as ContentFormatPreference[]) || [],
      platformPreferences: (row.platformPreferences as PlatformPreference[]) || [],
      rateCard: (row.rateCard as RateCardEntry[]) || [],
      minimumRateCents: row.minimumRateCents ? Number(row.minimumRateCents) : null,
      isAvailableForWork: Boolean(row.isAvailableForWork),
      availabilityNotes: row.availabilityNotes as string | null,
      profileCompletenessPercent: Number(row.profileCompletenessPercent),
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string),
    }

    return Response.json({
      preferences,
      isDefault: false,
    })
  } catch (error) {
    console.error('Error fetching brand preferences:', error)
    return Response.json({ error: 'Failed to fetch preferences' }, { status: 500 })
  }
}

/**
 * Update creator's general brand preferences
 */
export async function PUT(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  let body: UpdateCreatorBrandPreferencesInput

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    // Check if preferences exist
    const existingResult = await sql`
      SELECT id FROM creator_preferences
      WHERE creator_id = ${context.creatorId}
    `

    // Prepare values for upsert
    const preferredCategories = body.preferredCategories || []
    const contentTypes = body.contentTypes || []
    const pricingRanges = body.pricingRanges || DEFAULT_PRICING_RANGES
    const partnershipTypes = body.partnershipTypes || []
    const contentFormats = body.contentFormats || []
    const platformPreferences = body.platformPreferences || []
    const rateCard = body.rateCard || []
    const minimumRateCents = body.minimumRateCents ?? null
    const isAvailableForWork = body.isAvailableForWork ?? true
    const availabilityNotes = body.availabilityNotes ?? null

    // Calculate completeness
    const profileCompletenessPercent = calculateProfileCompleteness({
      preferredCategories,
      contentTypes,
      partnershipTypes,
      contentFormats,
      platformPreferences,
      rateCard,
    })

    if (existingResult.rows.length === 0) {
      // Create new preferences
      await sql`
        INSERT INTO creator_preferences (
          creator_id,
          preferred_categories,
          content_types,
          pricing_ranges,
          partnership_types,
          content_formats,
          platform_preferences,
          rate_card,
          minimum_rate_cents,
          is_available_for_work,
          availability_notes,
          profile_completeness_percent
        ) VALUES (
          ${context.creatorId},
          ${JSON.stringify(preferredCategories)},
          ${JSON.stringify(contentTypes)},
          ${JSON.stringify(pricingRanges)},
          ${JSON.stringify(partnershipTypes)},
          ${JSON.stringify(contentFormats)},
          ${JSON.stringify(platformPreferences)},
          ${JSON.stringify(rateCard)},
          ${minimumRateCents},
          ${isAvailableForWork},
          ${availabilityNotes},
          ${profileCompletenessPercent}
        )
      `
    } else {
      // Update existing preferences
      await sql`
        UPDATE creator_preferences
        SET
          preferred_categories = ${JSON.stringify(preferredCategories)},
          content_types = ${JSON.stringify(contentTypes)},
          pricing_ranges = ${JSON.stringify(pricingRanges)},
          partnership_types = ${JSON.stringify(partnershipTypes)},
          content_formats = ${JSON.stringify(contentFormats)},
          platform_preferences = ${JSON.stringify(platformPreferences)},
          rate_card = ${JSON.stringify(rateCard)},
          minimum_rate_cents = ${minimumRateCents},
          is_available_for_work = ${isAvailableForWork},
          availability_notes = ${availabilityNotes},
          profile_completeness_percent = ${profileCompletenessPercent},
          updated_at = NOW()
        WHERE creator_id = ${context.creatorId}
      `
    }

    return Response.json({
      success: true,
      message: 'Preferences saved successfully',
      profileCompletenessPercent,
    })
  } catch (error) {
    console.error('Error updating brand preferences:', error)
    return Response.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}
