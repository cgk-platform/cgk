export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
  }

  const url = new URL(request.url)
  const query = url.searchParams.get('q') || ''
  const minQuality = parseInt(url.searchParams.get('minQuality') || '0', 10)
  const excludeBurnedCaptions = url.searchParams.get('clean') === 'true'
  const sourceType = url.searchParams.get('source') || ''
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 100)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  return withTenant(tenantSlug, async () => {
    // When query text is provided, use full-text search with ts_rank.
    // When no query text, use simple filter queries ordered by quality_score.
    // Filter combinations are expressed as separate query branches because
    // @vercel/postgres does not support sql.unsafe() or fragment composition.

    if (query) {
      // Full-text search branches
      if (excludeBurnedCaptions && sourceType && minQuality > 0) {
        const result = await sql`
          SELECT
            a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
            a.duration_seconds, a.clip_source_type, a.has_burned_captions,
            s.id AS segment_id, s.start_time, s.end_time,
            s.description AS segment_description, s.mood, s.camera,
            s.subjects, s.quality_score, s.text_overlay_severity,
            ts_rank(
              to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, '')),
              plainto_tsquery('english', ${query})
            ) AS relevance
          FROM dam_clip_segments s
          JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
          WHERE s.tenant_id = ${tenantSlug}
            AND to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, ''))
                @@ plainto_tsquery('english', ${query})
            AND a.has_burned_captions = FALSE
            AND a.clip_source_type = ${sourceType}
            AND s.quality_score >= ${minQuality}
          ORDER BY relevance DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        return NextResponse.json({ results: result.rows, query, mode: 'text' })
      }

      if (excludeBurnedCaptions && sourceType) {
        const result = await sql`
          SELECT
            a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
            a.duration_seconds, a.clip_source_type, a.has_burned_captions,
            s.id AS segment_id, s.start_time, s.end_time,
            s.description AS segment_description, s.mood, s.camera,
            s.subjects, s.quality_score, s.text_overlay_severity,
            ts_rank(
              to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, '')),
              plainto_tsquery('english', ${query})
            ) AS relevance
          FROM dam_clip_segments s
          JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
          WHERE s.tenant_id = ${tenantSlug}
            AND to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, ''))
                @@ plainto_tsquery('english', ${query})
            AND a.has_burned_captions = FALSE
            AND a.clip_source_type = ${sourceType}
          ORDER BY relevance DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        return NextResponse.json({ results: result.rows, query, mode: 'text' })
      }

      if (sourceType && minQuality > 0) {
        const result = await sql`
          SELECT
            a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
            a.duration_seconds, a.clip_source_type, a.has_burned_captions,
            s.id AS segment_id, s.start_time, s.end_time,
            s.description AS segment_description, s.mood, s.camera,
            s.subjects, s.quality_score, s.text_overlay_severity,
            ts_rank(
              to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, '')),
              plainto_tsquery('english', ${query})
            ) AS relevance
          FROM dam_clip_segments s
          JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
          WHERE s.tenant_id = ${tenantSlug}
            AND to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, ''))
                @@ plainto_tsquery('english', ${query})
            AND a.clip_source_type = ${sourceType}
            AND s.quality_score >= ${minQuality}
          ORDER BY relevance DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        return NextResponse.json({ results: result.rows, query, mode: 'text' })
      }

      if (excludeBurnedCaptions && minQuality > 0) {
        const result = await sql`
          SELECT
            a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
            a.duration_seconds, a.clip_source_type, a.has_burned_captions,
            s.id AS segment_id, s.start_time, s.end_time,
            s.description AS segment_description, s.mood, s.camera,
            s.subjects, s.quality_score, s.text_overlay_severity,
            ts_rank(
              to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, '')),
              plainto_tsquery('english', ${query})
            ) AS relevance
          FROM dam_clip_segments s
          JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
          WHERE s.tenant_id = ${tenantSlug}
            AND to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, ''))
                @@ plainto_tsquery('english', ${query})
            AND a.has_burned_captions = FALSE
            AND s.quality_score >= ${minQuality}
          ORDER BY relevance DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        return NextResponse.json({ results: result.rows, query, mode: 'text' })
      }

      if (sourceType) {
        const result = await sql`
          SELECT
            a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
            a.duration_seconds, a.clip_source_type, a.has_burned_captions,
            s.id AS segment_id, s.start_time, s.end_time,
            s.description AS segment_description, s.mood, s.camera,
            s.subjects, s.quality_score, s.text_overlay_severity,
            ts_rank(
              to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, '')),
              plainto_tsquery('english', ${query})
            ) AS relevance
          FROM dam_clip_segments s
          JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
          WHERE s.tenant_id = ${tenantSlug}
            AND to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, ''))
                @@ plainto_tsquery('english', ${query})
            AND a.clip_source_type = ${sourceType}
          ORDER BY relevance DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        return NextResponse.json({ results: result.rows, query, mode: 'text' })
      }

      if (excludeBurnedCaptions) {
        const result = await sql`
          SELECT
            a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
            a.duration_seconds, a.clip_source_type, a.has_burned_captions,
            s.id AS segment_id, s.start_time, s.end_time,
            s.description AS segment_description, s.mood, s.camera,
            s.subjects, s.quality_score, s.text_overlay_severity,
            ts_rank(
              to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, '')),
              plainto_tsquery('english', ${query})
            ) AS relevance
          FROM dam_clip_segments s
          JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
          WHERE s.tenant_id = ${tenantSlug}
            AND to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, ''))
                @@ plainto_tsquery('english', ${query})
            AND a.has_burned_captions = FALSE
          ORDER BY relevance DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        return NextResponse.json({ results: result.rows, query, mode: 'text' })
      }

      if (minQuality > 0) {
        const result = await sql`
          SELECT
            a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
            a.duration_seconds, a.clip_source_type, a.has_burned_captions,
            s.id AS segment_id, s.start_time, s.end_time,
            s.description AS segment_description, s.mood, s.camera,
            s.subjects, s.quality_score, s.text_overlay_severity,
            ts_rank(
              to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, '')),
              plainto_tsquery('english', ${query})
            ) AS relevance
          FROM dam_clip_segments s
          JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
          WHERE s.tenant_id = ${tenantSlug}
            AND to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, ''))
                @@ plainto_tsquery('english', ${query})
            AND s.quality_score >= ${minQuality}
          ORDER BY relevance DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        return NextResponse.json({ results: result.rows, query, mode: 'text' })
      }

      // Query only, no filters
      const result = await sql`
        SELECT
          a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
          a.duration_seconds, a.clip_source_type, a.has_burned_captions,
          s.id AS segment_id, s.start_time, s.end_time,
          s.description AS segment_description, s.mood, s.camera,
          s.subjects, s.quality_score, s.text_overlay_severity,
          ts_rank(
            to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, '')),
            plainto_tsquery('english', ${query})
          ) AS relevance
        FROM dam_clip_segments s
        JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
        WHERE s.tenant_id = ${tenantSlug}
          AND to_tsvector('english', coalesce(s.description, '') || ' ' || coalesce(a.title, ''))
              @@ plainto_tsquery('english', ${query})
        ORDER BY relevance DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return NextResponse.json({ results: result.rows, query, mode: 'text' })
    }

    // No query text -- filter-only branches ordered by quality_score DESC
    if (excludeBurnedCaptions && sourceType && minQuality > 0) {
      const result = await sql`
        SELECT
          a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
          a.duration_seconds, a.clip_source_type, a.has_burned_captions,
          s.id AS segment_id, s.start_time, s.end_time,
          s.description AS segment_description, s.mood, s.camera,
          s.subjects, s.quality_score, s.text_overlay_severity
        FROM dam_clip_segments s
        JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
        WHERE s.tenant_id = ${tenantSlug}
          AND a.has_burned_captions = FALSE
          AND a.clip_source_type = ${sourceType}
          AND s.quality_score >= ${minQuality}
        ORDER BY s.quality_score DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `
      return NextResponse.json({ results: result.rows, query: '', mode: 'filter' })
    }

    if (excludeBurnedCaptions && sourceType) {
      const result = await sql`
        SELECT
          a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
          a.duration_seconds, a.clip_source_type, a.has_burned_captions,
          s.id AS segment_id, s.start_time, s.end_time,
          s.description AS segment_description, s.mood, s.camera,
          s.subjects, s.quality_score, s.text_overlay_severity
        FROM dam_clip_segments s
        JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
        WHERE s.tenant_id = ${tenantSlug}
          AND a.has_burned_captions = FALSE
          AND a.clip_source_type = ${sourceType}
        ORDER BY s.quality_score DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `
      return NextResponse.json({ results: result.rows, query: '', mode: 'filter' })
    }

    if (sourceType && minQuality > 0) {
      const result = await sql`
        SELECT
          a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
          a.duration_seconds, a.clip_source_type, a.has_burned_captions,
          s.id AS segment_id, s.start_time, s.end_time,
          s.description AS segment_description, s.mood, s.camera,
          s.subjects, s.quality_score, s.text_overlay_severity
        FROM dam_clip_segments s
        JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
        WHERE s.tenant_id = ${tenantSlug}
          AND a.clip_source_type = ${sourceType}
          AND s.quality_score >= ${minQuality}
        ORDER BY s.quality_score DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `
      return NextResponse.json({ results: result.rows, query: '', mode: 'filter' })
    }

    if (excludeBurnedCaptions && minQuality > 0) {
      const result = await sql`
        SELECT
          a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
          a.duration_seconds, a.clip_source_type, a.has_burned_captions,
          s.id AS segment_id, s.start_time, s.end_time,
          s.description AS segment_description, s.mood, s.camera,
          s.subjects, s.quality_score, s.text_overlay_severity
        FROM dam_clip_segments s
        JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
        WHERE s.tenant_id = ${tenantSlug}
          AND a.has_burned_captions = FALSE
          AND s.quality_score >= ${minQuality}
        ORDER BY s.quality_score DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `
      return NextResponse.json({ results: result.rows, query: '', mode: 'filter' })
    }

    if (sourceType) {
      const result = await sql`
        SELECT
          a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
          a.duration_seconds, a.clip_source_type, a.has_burned_captions,
          s.id AS segment_id, s.start_time, s.end_time,
          s.description AS segment_description, s.mood, s.camera,
          s.subjects, s.quality_score, s.text_overlay_severity
        FROM dam_clip_segments s
        JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
        WHERE s.tenant_id = ${tenantSlug}
          AND a.clip_source_type = ${sourceType}
        ORDER BY s.quality_score DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `
      return NextResponse.json({ results: result.rows, query: '', mode: 'filter' })
    }

    if (excludeBurnedCaptions) {
      const result = await sql`
        SELECT
          a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
          a.duration_seconds, a.clip_source_type, a.has_burned_captions,
          s.id AS segment_id, s.start_time, s.end_time,
          s.description AS segment_description, s.mood, s.camera,
          s.subjects, s.quality_score, s.text_overlay_severity
        FROM dam_clip_segments s
        JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
        WHERE s.tenant_id = ${tenantSlug}
          AND a.has_burned_captions = FALSE
        ORDER BY s.quality_score DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `
      return NextResponse.json({ results: result.rows, query: '', mode: 'filter' })
    }

    if (minQuality > 0) {
      const result = await sql`
        SELECT
          a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
          a.duration_seconds, a.clip_source_type, a.has_burned_captions,
          s.id AS segment_id, s.start_time, s.end_time,
          s.description AS segment_description, s.mood, s.camera,
          s.subjects, s.quality_score, s.text_overlay_severity
        FROM dam_clip_segments s
        JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
        WHERE s.tenant_id = ${tenantSlug}
          AND s.quality_score >= ${minQuality}
        ORDER BY s.quality_score DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `
      return NextResponse.json({ results: result.rows, query: '', mode: 'filter' })
    }

    // No filters at all -- return recent clips
    const result = await sql`
      SELECT
        a.id AS asset_id, a.title, a.thumbnail_url, a.mux_playback_id,
        a.duration_seconds, a.clip_source_type, a.has_burned_captions,
        s.id AS segment_id, s.start_time, s.end_time,
        s.description AS segment_description, s.mood, s.camera,
        s.subjects, s.quality_score, s.text_overlay_severity
      FROM dam_clip_segments s
      JOIN dam_assets a ON a.id = s.asset_id AND a.tenant_id = s.tenant_id
      WHERE s.tenant_id = ${tenantSlug}
      ORDER BY s.quality_score DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `
    return NextResponse.json({ results: result.rows, query: '', mode: 'filter' })
  })
}
