/**
 * Creator Brand Exclusions API Route
 *
 * GET /api/creator/brand-preferences/exclusions - Get brand exclusion list
 * POST /api/creator/brand-preferences/exclusions - Add brand to exclusion list
 */

import { sql } from '@cgk-platform/db'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'
import type { AddBrandExclusionInput, BrandExclusion } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Fetch creator's brand exclusion list
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
        brand_name as "brandName",
        organization_id as "organizationId",
        reason,
        created_at as "createdAt"
      FROM creator_brand_exclusions
      WHERE creator_id = ${context.creatorId}
      ORDER BY created_at DESC
    `

    const exclusions: BrandExclusion[] = result.rows.map((row) => ({
      id: row.id as string,
      brandName: row.brandName as string,
      organizationId: row.organizationId as string | null,
      reason: row.reason as string | null,
      createdAt: new Date(row.createdAt as string),
    }))

    return Response.json({ exclusions })
  } catch (error) {
    console.error('Error fetching brand exclusions:', error)
    return Response.json({ error: 'Failed to fetch exclusions' }, { status: 500 })
  }
}

/**
 * Add a brand to the exclusion list
 */
export async function POST(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  let body: AddBrandExclusionInput

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.brandName || body.brandName.trim() === '') {
    return Response.json({ error: 'Brand name is required' }, { status: 400 })
  }

  try {
    const brandName = body.brandName.trim()
    const organizationId = body.organizationId || null
    const reason = body.reason?.trim() || null

    // Check if already excluded
    const existingResult = await sql`
      SELECT id FROM creator_brand_exclusions
      WHERE creator_id = ${context.creatorId}
        AND LOWER(brand_name) = LOWER(${brandName})
    `

    if (existingResult.rows.length > 0) {
      return Response.json(
        { error: 'This brand is already in your exclusion list' },
        { status: 409 }
      )
    }

    // Insert new exclusion
    const result = await sql`
      INSERT INTO creator_brand_exclusions (
        creator_id,
        organization_id,
        brand_name,
        reason
      ) VALUES (
        ${context.creatorId},
        ${organizationId},
        ${brandName},
        ${reason}
      )
      RETURNING
        id,
        brand_name as "brandName",
        organization_id as "organizationId",
        reason,
        created_at as "createdAt"
    `

    const row = result.rows[0]!
    const exclusion: BrandExclusion = {
      id: row.id as string,
      brandName: row.brandName as string,
      organizationId: row.organizationId as string | null,
      reason: row.reason as string | null,
      createdAt: new Date(row.createdAt as string),
    }

    return Response.json({
      success: true,
      exclusion,
    })
  } catch (error) {
    console.error('Error adding brand exclusion:', error)
    return Response.json({ error: 'Failed to add exclusion' }, { status: 500 })
  }
}
