/**
 * Brand context documents database operations
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk/db'

import type {
  BrandContextDocument,
  BrandContextDocumentRow,
  DocumentVersion,
  DocumentFilters,
  CreateDocumentInput,
  UpdateDocumentInput,
} from './types'

const DOC_SORT_COLUMNS: Record<string, string> = {
  created_at: 'd.created_at',
  updated_at: 'd.updated_at',
  title: 'd.title',
  category: 'd.category',
}

export async function getDocuments(filters: DocumentFilters): Promise<{ rows: BrandContextDocumentRow[]; totalCount: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 0

  if (filters.search) {
    paramIndex++
    conditions.push(`(d.title ILIKE $${paramIndex} OR d.content ILIKE $${paramIndex} OR d.slug ILIKE $${paramIndex})`)
    values.push(`%${filters.search}%`)
  }
  if (filters.category) {
    paramIndex++
    conditions.push(`d.category = $${paramIndex}::document_category`)
    values.push(filters.category)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const sortCol = DOC_SORT_COLUMNS[filters.sort] || 'd.updated_at'
  const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(filters.limit, filters.offset)

  const dataResult = await sql.query(
    `SELECT d.id, d.slug, d.title, d.content, d.category, d.tags, d.version,
            d.is_active, d.created_at, d.updated_at, d.created_by, d.updated_by,
            cu.name as created_by_name, uu.name as updated_by_name
     FROM brand_context_documents d
     LEFT JOIN public.users cu ON d.created_by = cu.id
     LEFT JOIN public.users uu ON d.updated_by = uu.id
     ${whereClause}
     ORDER BY ${sortCol} ${sortDir} NULLS LAST
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values,
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*) as count FROM brand_context_documents d ${whereClause}`,
    countValues,
  )

  return {
    rows: dataResult.rows as BrandContextDocumentRow[],
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

export async function getDocumentById(id: string): Promise<BrandContextDocument | null> {
  const result = await sql<BrandContextDocument>`
    SELECT id, slug, title, content, category, tags, version,
           is_active, created_at, updated_at, created_by, updated_by
    FROM brand_context_documents
    WHERE id = ${id}
  `
  return result.rows[0] || null
}

export async function getDocumentBySlug(slug: string): Promise<BrandContextDocument | null> {
  const result = await sql<BrandContextDocument>`
    SELECT id, slug, title, content, category, tags, version,
           is_active, created_at, updated_at, created_by, updated_by
    FROM brand_context_documents
    WHERE slug = ${slug}
  `
  return result.rows[0] || null
}

export async function createDocument(input: CreateDocumentInput, userId?: string): Promise<BrandContextDocument> {
  const tags = input.tags || []
  const tagsJson = JSON.stringify(tags)

  const result = await sql<BrandContextDocument>`
    INSERT INTO brand_context_documents (
      slug, title, content, category, tags, version, is_active, created_by, updated_by
    ) VALUES (
      ${input.slug}, ${input.title}, ${input.content},
      ${input.category}::document_category, ${tagsJson}::jsonb,
      1, true, ${userId || null}, ${userId || null}
    )
    RETURNING id, slug, title, content, category, tags, version,
              is_active, created_at, updated_at, created_by, updated_by
  `
  return result.rows[0]!
}

export async function updateDocument(input: UpdateDocumentInput, userId?: string): Promise<BrandContextDocument | null> {
  const current = await getDocumentById(input.id)
  if (!current) return null

  const slug = input.slug ?? current.slug
  const title = input.title ?? current.title
  const content = input.content ?? current.content
  const category = input.category ?? current.category
  const tags = input.tags ?? current.tags
  const isActive = input.is_active ?? current.is_active

  // Increment version if content changed
  const newVersion = input.content && input.content !== current.content
    ? current.version + 1
    : current.version

  // If content changed, save the old version to history
  if (input.content && input.content !== current.content) {
    await sql`
      INSERT INTO brand_context_versions (document_id, version, content, created_by)
      VALUES (${input.id}, ${current.version}, ${current.content}, ${userId || null})
    `
  }

  const tagsJson = JSON.stringify(tags)

  const result = await sql<BrandContextDocument>`
    UPDATE brand_context_documents SET
      slug = ${slug}, title = ${title}, content = ${content},
      category = ${category}::document_category, tags = ${tagsJson}::jsonb,
      version = ${newVersion}, is_active = ${isActive},
      updated_by = ${userId || null}, updated_at = NOW()
    WHERE id = ${input.id}
    RETURNING id, slug, title, content, category, tags, version,
              is_active, created_at, updated_at, created_by, updated_by
  `
  return result.rows[0] || null
}

export async function deleteDocument(id: string): Promise<boolean> {
  // Delete version history first
  await sql`DELETE FROM brand_context_versions WHERE document_id = ${id}`
  const result = await sql`DELETE FROM brand_context_documents WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}

export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const result = await sql<DocumentVersion>`
    SELECT v.id, v.document_id, v.version, v.content, v.created_at, v.created_by,
           u.name as created_by_name
    FROM brand_context_versions v
    LEFT JOIN public.users u ON v.created_by = u.id
    WHERE v.document_id = ${documentId}
    ORDER BY v.version DESC
  `
  return result.rows
}

export async function restoreDocumentVersion(documentId: string, version: number, userId?: string): Promise<BrandContextDocument | null> {
  const versionResult = await sql<{ content: string }>`
    SELECT content FROM brand_context_versions
    WHERE document_id = ${documentId} AND version = ${version}
  `

  if (!versionResult.rows[0]) return null

  return updateDocument({
    id: documentId,
    content: versionResult.rows[0].content,
  }, userId)
}

export async function getActiveDocuments(): Promise<BrandContextDocument[]> {
  const result = await sql<BrandContextDocument>`
    SELECT id, slug, title, content, category, tags, version,
           is_active, created_at, updated_at, created_by, updated_by
    FROM brand_context_documents
    WHERE is_active = true
    ORDER BY category, title
  `
  return result.rows
}

export async function getDocumentsByCategory(category: string): Promise<BrandContextDocument[]> {
  const result = await sql<BrandContextDocument>`
    SELECT id, slug, title, content, category, tags, version,
           is_active, created_at, updated_at, created_by, updated_by
    FROM brand_context_documents
    WHERE category = ${category}::document_category AND is_active = true
    ORDER BY title
  `
  return result.rows
}
