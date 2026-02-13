/**
 * Creator Brand Preferences API Route
 *
 * GET /api/creator/brands/[brandSlug]/preferences - Get brand-specific preferences
 * PATCH /api/creator/brands/[brandSlug]/preferences - Update brand-specific preferences
 */

import { sql } from '@cgk-platform/db'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'
import type {
  BrandNotificationOverrides,
  BrandPreferences,
  BrandSampleAddress,
  UpdateBrandPreferencesInput,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ brandSlug: string }>
}

/**
 * Default notification overrides (no overrides - use global settings)
 */
const DEFAULT_NOTIFICATION_OVERRIDES: BrandNotificationOverrides = {
  muteAll: false,
  projectAssigned: null,
  projectUpdated: null,
  messageReceived: null,
  paymentReceived: null,
  deadlineReminder: null,
  revisionRequested: null,
}

/**
 * Validate the creator has access to the brand
 */
async function validateBrandAccess(creatorId: string, brandSlug: string): Promise<string | null> {
  const result = await sql`
    SELECT cm.organization_id
    FROM creator_memberships cm
    JOIN organizations o ON o.id = cm.organization_id
    WHERE cm.creator_id = ${creatorId}
      AND o.slug = ${brandSlug}
      AND cm.status IN ('active', 'paused', 'pending')
  `

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return row.organization_id as string
}

/**
 * Fetch brand-specific preferences for the authenticated creator
 */
export async function GET(req: Request, { params }: RouteParams): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  const { brandSlug } = await params

  if (!brandSlug) {
    return Response.json({ error: 'Brand slug is required' }, { status: 400 })
  }

  try {
    // Validate access
    const brandId = await validateBrandAccess(context.creatorId, brandSlug)
    if (!brandId) {
      return Response.json({ error: 'Brand not found or no access' }, { status: 404 })
    }

    // Get existing preferences
    const result = await sql`
      SELECT
        id,
        creator_id as "creatorId",
        brand_id as "brandId",
        notification_overrides as "notificationOverrides",
        sample_address as "sampleAddress",
        preferred_contact_method as "preferredContactMethod",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM creator_brand_preferences
      WHERE creator_id = ${context.creatorId}
        AND brand_id = ${brandId}
    `

    // If no preferences exist, return defaults
    if (result.rows.length === 0) {
      const defaultPreferences: BrandPreferences = {
        id: '',
        creatorId: context.creatorId,
        brandId,
        notificationOverrides: DEFAULT_NOTIFICATION_OVERRIDES,
        sampleAddress: null,
        preferredContactMethod: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      return Response.json({
        preferences: defaultPreferences,
        isDefault: true,
      })
    }

    const row = result.rows[0]
    if (!row) {
      return Response.json({ error: 'Preferences not found' }, { status: 404 })
    }

    const preferences: BrandPreferences = {
      id: row.id as string,
      creatorId: row.creatorId as string,
      brandId: row.brandId as string,
      notificationOverrides: (row.notificationOverrides as BrandNotificationOverrides) || DEFAULT_NOTIFICATION_OVERRIDES,
      sampleAddress: row.sampleAddress as BrandSampleAddress | null,
      preferredContactMethod: row.preferredContactMethod as BrandPreferences['preferredContactMethod'],
      notes: row.notes as string | null,
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
 * Update brand-specific preferences for the authenticated creator
 */
export async function PATCH(req: Request, { params }: RouteParams): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  const { brandSlug } = await params

  if (!brandSlug) {
    return Response.json({ error: 'Brand slug is required' }, { status: 400 })
  }

  let body: UpdateBrandPreferencesInput

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    // Validate access
    const brandId = await validateBrandAccess(context.creatorId, brandSlug)
    if (!brandId) {
      return Response.json({ error: 'Brand not found or no access' }, { status: 404 })
    }

    // Check if preferences exist
    const existingResult = await sql`
      SELECT id, notification_overrides, sample_address
      FROM creator_brand_preferences
      WHERE creator_id = ${context.creatorId}
        AND brand_id = ${brandId}
    `

    if (existingResult.rows.length === 0) {
      // Create new preferences
      const notificationOverrides = body.notificationOverrides
        ? { ...DEFAULT_NOTIFICATION_OVERRIDES, ...body.notificationOverrides }
        : DEFAULT_NOTIFICATION_OVERRIDES

      const sampleAddress = body.sampleAddress !== undefined
        ? body.sampleAddress
        : null

      await sql`
        INSERT INTO creator_brand_preferences (
          creator_id,
          brand_id,
          notification_overrides,
          sample_address,
          preferred_contact_method,
          notes
        ) VALUES (
          ${context.creatorId},
          ${brandId},
          ${JSON.stringify(notificationOverrides)},
          ${sampleAddress ? JSON.stringify(sampleAddress) : null},
          ${body.preferredContactMethod || null},
          ${body.notes || null}
        )
      `

      return Response.json({
        success: true,
        message: 'Preferences created successfully',
      })
    }

    // Update existing preferences
    const existing = existingResult.rows[0]
    if (!existing) {
      return Response.json({ error: 'Preferences not found' }, { status: 404 })
    }

    // Merge notification overrides
    const currentOverrides = (existing.notification_overrides as BrandNotificationOverrides) || DEFAULT_NOTIFICATION_OVERRIDES
    const newOverrides = body.notificationOverrides
      ? { ...currentOverrides, ...body.notificationOverrides }
      : currentOverrides

    // Handle sample address (null means clear, undefined means keep existing)
    let newSampleAddress = existing.sample_address
    if (body.sampleAddress !== undefined) {
      if (body.sampleAddress === null) {
        newSampleAddress = null
      } else {
        const existingAddress = existing.sample_address as BrandSampleAddress | null
        newSampleAddress = existingAddress
          ? { ...existingAddress, ...body.sampleAddress }
          : { useDefault: true, addressLine1: null, addressLine2: null, city: null, state: null, postalCode: null, countryCode: 'US', ...body.sampleAddress }
      }
    }

    await sql`
      UPDATE creator_brand_preferences
      SET
        notification_overrides = ${JSON.stringify(newOverrides)},
        sample_address = ${newSampleAddress ? JSON.stringify(newSampleAddress) : null},
        preferred_contact_method = CASE
          WHEN ${body.preferredContactMethod !== undefined}
          THEN ${body.preferredContactMethod || null}
          ELSE preferred_contact_method
        END,
        notes = CASE
          WHEN ${body.notes !== undefined}
          THEN ${body.notes || null}
          ELSE notes
        END,
        updated_at = NOW()
      WHERE creator_id = ${context.creatorId}
        AND brand_id = ${brandId}
    `

    return Response.json({
      success: true,
      message: 'Preferences updated successfully',
    })
  } catch (error) {
    console.error('Error updating brand preferences:', error)
    return Response.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}
