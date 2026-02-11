/**
 * Creator Settings API Route
 *
 * GET /api/creator/settings - Fetch profile data
 * PATCH /api/creator/settings - Update profile fields
 */

import { sql } from '@cgk/db'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'
import type { UpdateProfileInput } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Fetch creator profile settings
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
        id, email, name, bio, phone, avatar_url,
        address_line1, address_line2, city, state, postal_code, country_code,
        tax_form_status, tax_form_submitted_at,
        status, email_verified, onboarding_completed, guided_tour_completed,
        created_at
      FROM creators
      WHERE id = ${context.creatorId}
    `

    const creator = result.rows[0]
    if (!creator) {
      return Response.json({ error: 'Creator not found' }, { status: 404 })
    }

    return Response.json({
      profile: {
        id: creator.id,
        email: creator.email,
        name: creator.name,
        bio: creator.bio,
        phone: creator.phone,
        avatarUrl: creator.avatar_url,
        shippingAddress: {
          addressLine1: creator.address_line1,
          addressLine2: creator.address_line2,
          city: creator.city,
          state: creator.state,
          postalCode: creator.postal_code,
          countryCode: creator.country_code || 'US',
        },
        taxFormStatus: creator.tax_form_status,
        taxFormSubmittedAt: creator.tax_form_submitted_at,
        status: creator.status,
        emailVerified: creator.email_verified,
        onboardingCompleted: creator.onboarding_completed,
        guidedTourCompleted: creator.guided_tour_completed,
        createdAt: creator.created_at,
      },
    })
  } catch (error) {
    console.error('Error fetching creator settings:', error)
    return Response.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

/**
 * Update creator profile settings
 */
export async function PATCH(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  let body: UpdateProfileInput

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Validate bio length
  if (body.bio !== undefined && body.bio.length > 160) {
    return Response.json(
      { error: 'Bio must be 160 characters or less' },
      { status: 400 }
    )
  }

  // Validate name is not empty
  if (body.name !== undefined && body.name.trim().length === 0) {
    return Response.json(
      { error: 'Name cannot be empty' },
      { status: 400 }
    )
  }

  try {
    // Build update query dynamically
    const updates: string[] = []
    const values: (string | null)[] = []
    let paramIndex = 1

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(body.name.trim())
    }
    if (body.bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`)
      values.push(body.bio || null)
    }
    if (body.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`)
      values.push(body.phone || null)
    }
    if (body.addressLine1 !== undefined) {
      updates.push(`address_line1 = $${paramIndex++}`)
      values.push(body.addressLine1 || null)
    }
    if (body.addressLine2 !== undefined) {
      updates.push(`address_line2 = $${paramIndex++}`)
      values.push(body.addressLine2 || null)
    }
    if (body.city !== undefined) {
      updates.push(`city = $${paramIndex++}`)
      values.push(body.city || null)
    }
    if (body.state !== undefined) {
      updates.push(`state = $${paramIndex++}`)
      values.push(body.state || null)
    }
    if (body.postalCode !== undefined) {
      updates.push(`postal_code = $${paramIndex++}`)
      values.push(body.postalCode || null)
    }
    if (body.countryCode !== undefined) {
      updates.push(`country_code = $${paramIndex++}`)
      values.push(body.countryCode || 'US')
    }

    if (updates.length === 0) {
      return Response.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Use template literal for the UPDATE
    await sql`
      UPDATE creators
      SET
        name = COALESCE(${body.name}, name),
        bio = CASE WHEN ${body.bio !== undefined} THEN ${body.bio || null} ELSE bio END,
        phone = CASE WHEN ${body.phone !== undefined} THEN ${body.phone || null} ELSE phone END,
        address_line1 = CASE WHEN ${body.addressLine1 !== undefined} THEN ${body.addressLine1 || null} ELSE address_line1 END,
        address_line2 = CASE WHEN ${body.addressLine2 !== undefined} THEN ${body.addressLine2 || null} ELSE address_line2 END,
        city = CASE WHEN ${body.city !== undefined} THEN ${body.city || null} ELSE city END,
        state = CASE WHEN ${body.state !== undefined} THEN ${body.state || null} ELSE state END,
        postal_code = CASE WHEN ${body.postalCode !== undefined} THEN ${body.postalCode || null} ELSE postal_code END,
        country_code = CASE WHEN ${body.countryCode !== undefined} THEN ${body.countryCode || 'US'} ELSE country_code END,
        updated_at = NOW()
      WHERE id = ${context.creatorId}
    `

    return Response.json({
      success: true,
      message: 'Profile updated successfully',
    })
  } catch (error) {
    console.error('Error updating creator settings:', error)
    return Response.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
