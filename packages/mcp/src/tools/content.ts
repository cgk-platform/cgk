/**
 * MCP Content Tools
 *
 * Brand knowledge document management and creative ideas CRUD.
 * Queries existing tables: brand_context_documents, creative_ideas.
 *
 * Categories:
 * - Brand Documents: list, get, search, create, update, delete (6 tools)
 * - Creative Ideas: list, get, search, create, update, delete (6 tools)
 *
 * Total: 12 tools
 *
 * @ai-pattern mcp-tools
 * @ai-required All queries must use withTenant()
 */

import { sql, withTenant } from '@cgk-platform/db'

import { defineTool, jsonResult, errorResult } from '../tools'
import type { ToolDefinition } from '../tools'
import type { ToolResult } from '../types'

// =============================================================================
// Helper: PostgreSQL array literal
// =============================================================================

function toPostgresArray(arr: string[] | null | undefined): string | null {
  if (!arr || arr.length === 0) return null
  const escaped = arr.map((v) => v.replace(/"/g, '\\"'))
  return `{${escaped.join(',')}}`
}

// =============================================================================
// Brand Document Tools
// =============================================================================

export const listBrandDocumentsTool = defineTool({
  name: 'list_brand_documents',
  description:
    'List brand context documents with optional category and active-only filter. ' +
    'Categories: brand_voice, product_info, faq, policies, guidelines, templates.',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Filter by category (brand_voice, product_info, faq, policies, guidelines, templates)',
        enum: ['brand_voice', 'product_info', 'faq', 'policies', 'guidelines', 'templates'],
      },
      activeOnly: {
        type: 'boolean',
        description: 'Only return active documents (default: true)',
        default: true,
      },
      limit: {
        type: 'number',
        description: 'Max documents to return (default: 50)',
        default: 50,
        minimum: 1,
        maximum: 200,
      },
    },
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) return errorResult('Tenant ID is required')

    const activeOnly = args.activeOnly !== false
    const category = args.category as string | undefined
    const limit = Math.min(Number(args.limit) || 50, 200)

    try {
      const result = await withTenant(tenantId, async () => {
        if (category && activeOnly) {
          return sql`
            SELECT id, slug, title, category, tags, version, is_active,
                   created_at, updated_at
            FROM brand_context_documents
            WHERE category = ${category}::document_category AND is_active = true
            ORDER BY updated_at DESC
            LIMIT ${limit}
          `
        } else if (category) {
          return sql`
            SELECT id, slug, title, category, tags, version, is_active,
                   created_at, updated_at
            FROM brand_context_documents
            WHERE category = ${category}::document_category
            ORDER BY updated_at DESC
            LIMIT ${limit}
          `
        } else if (activeOnly) {
          return sql`
            SELECT id, slug, title, category, tags, version, is_active,
                   created_at, updated_at
            FROM brand_context_documents
            WHERE is_active = true
            ORDER BY updated_at DESC
            LIMIT ${limit}
          `
        } else {
          return sql`
            SELECT id, slug, title, category, tags, version, is_active,
                   created_at, updated_at
            FROM brand_context_documents
            ORDER BY updated_at DESC
            LIMIT ${limit}
          `
        }
      })
      return jsonResult({ documents: result.rows, count: result.rows.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to list brand documents: ${message}`)
    }
  },
})

export const getBrandDocumentTool = defineTool({
  name: 'get_brand_document',
  description: 'Get a brand context document by ID or slug, including full content.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Document ID' },
      slug: { type: 'string', description: 'Document slug (alternative to ID)' },
    },
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) return errorResult('Tenant ID is required')

    const id = args.id as string | undefined
    const slug = args.slug as string | undefined
    if (!id && !slug) return errorResult('Either id or slug is required')

    try {
      const result = await withTenant(tenantId, async () => {
        if (id) {
          return sql`
            SELECT id, slug, title, content, category, tags, version,
                   is_active, created_at, updated_at, created_by, updated_by
            FROM brand_context_documents
            WHERE id = ${id}
          `
        }
        return sql`
          SELECT id, slug, title, content, category, tags, version,
                 is_active, created_at, updated_at, created_by, updated_by
          FROM brand_context_documents
          WHERE slug = ${slug!}
        `
      })

      const doc = result.rows[0]
      if (!doc) return errorResult('Document not found')
      return jsonResult(doc)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get brand document: ${message}`)
    }
  },
})

export const searchBrandDocumentsTool = defineTool({
  name: 'search_brand_documents',
  description:
    'Full-text search across brand context documents by title, content, or slug. ' +
    'Optionally filter by category or tags.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search text (matches title, content, slug)' },
      category: {
        type: 'string',
        description: 'Filter by category',
        enum: ['brand_voice', 'product_info', 'faq', 'policies', 'guidelines', 'templates'],
      },
      limit: { type: 'number', description: 'Max results (default: 20)', default: 20, minimum: 1, maximum: 100 },
    },
    required: ['query'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) return errorResult('Tenant ID is required')

    const query = args.query as string
    const category = args.category as string | undefined
    const limit = Math.min(Number(args.limit) || 20, 100)
    const pattern = `%${query}%`

    try {
      const result = await withTenant(tenantId, async () => {
        if (category) {
          return sql`
            SELECT id, slug, title, category, tags, version, is_active,
                   created_at, updated_at
            FROM brand_context_documents
            WHERE is_active = true
              AND category = ${category}::document_category
              AND (title ILIKE ${pattern} OR content ILIKE ${pattern} OR slug ILIKE ${pattern})
            ORDER BY updated_at DESC
            LIMIT ${limit}
          `
        }
        return sql`
          SELECT id, slug, title, category, tags, version, is_active,
                 created_at, updated_at
          FROM brand_context_documents
          WHERE is_active = true
            AND (title ILIKE ${pattern} OR content ILIKE ${pattern} OR slug ILIKE ${pattern})
          ORDER BY updated_at DESC
          LIMIT ${limit}
        `
      })
      return jsonResult({ documents: result.rows, count: result.rows.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to search brand documents: ${message}`)
    }
  },
})

export const createBrandDocumentTool = defineTool({
  name: 'create_brand_document',
  description:
    'Create a new brand context document. Slug must be unique. ' +
    'Categories: brand_voice, product_info, faq, policies, guidelines, templates.',
  inputSchema: {
    type: 'object',
    properties: {
      slug: { type: 'string', description: 'URL-friendly slug (unique, lowercase-hyphens)' },
      title: { type: 'string', description: 'Document title' },
      content: { type: 'string', description: 'Full markdown content' },
      category: {
        type: 'string',
        description: 'Document category',
        enum: ['brand_voice', 'product_info', 'faq', 'policies', 'guidelines', 'templates'],
      },
      tags: {
        type: 'array',
        description: 'Tags for categorization',
        items: { type: 'string' },
      },
    },
    required: ['slug', 'title', 'content', 'category'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) return errorResult('Tenant ID is required')

    const slug = args.slug as string
    const title = args.title as string
    const content = args.content as string
    const category = args.category as string
    const tags = (args.tags as string[]) || []
    const tagsJson = JSON.stringify(tags)

    try {
      const result = await withTenant(tenantId, async () => {
        return sql`
          INSERT INTO brand_context_documents (
            slug, title, content, category, tags, version, is_active
          ) VALUES (
            ${slug}, ${title}, ${content},
            ${category}::document_category, ${tagsJson}::jsonb,
            1, true
          )
          RETURNING id, slug, title, category, tags, version,
                    is_active, created_at, updated_at
        `
      })

      const doc = result.rows[0]
      if (!doc) return errorResult('Failed to create document')
      return jsonResult(doc)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('unique') || message.includes('duplicate')) {
        return errorResult(`Slug "${slug}" already exists. Choose a different slug.`)
      }
      return errorResult(`Failed to create brand document: ${message}`)
    }
  },
})

export const updateBrandDocumentTool = defineTool({
  name: 'update_brand_document',
  description:
    'Update an existing brand context document. Only provide fields you want to change. ' +
    'Content changes auto-increment version and save previous version to history.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Document ID to update' },
      slug: { type: 'string', description: 'New slug' },
      title: { type: 'string', description: 'New title' },
      content: { type: 'string', description: 'New content (triggers version increment)' },
      category: {
        type: 'string',
        description: 'New category',
        enum: ['brand_voice', 'product_info', 'faq', 'policies', 'guidelines', 'templates'],
      },
      tags: {
        type: 'array',
        description: 'New tags (replaces existing)',
        items: { type: 'string' },
      },
      is_active: { type: 'boolean', description: 'Set active/inactive status' },
    },
    required: ['id'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) return errorResult('Tenant ID is required')

    const id = args.id as string
    const newContent = args.content as string | undefined

    try {
      const result = await withTenant(tenantId, async () => {
        // Fetch current document
        const current = await sql`
          SELECT id, slug, title, content, category, tags, version, is_active
          FROM brand_context_documents WHERE id = ${id}
        `
        const doc = current.rows[0]
        if (!doc) return null

        const slug = (args.slug as string) ?? doc.slug
        const title = (args.title as string) ?? doc.title
        const content = newContent ?? (doc.content as string)
        const category = (args.category as string) ?? doc.category
        const tags = (args.tags as string[]) ?? doc.tags
        const isActive = (args.is_active as boolean) ?? doc.is_active
        const tagsJson = JSON.stringify(tags)

        const contentChanged = newContent && newContent !== doc.content
        const newVersion = contentChanged ? (doc.version as number) + 1 : (doc.version as number)

        // Save old version to history if content changed
        if (contentChanged) {
          await sql`
            INSERT INTO brand_context_versions (document_id, version, content)
            VALUES (${id}, ${doc.version as number}, ${doc.content as string})
          `
        }

        const updated = await sql`
          UPDATE brand_context_documents SET
            slug = ${slug}, title = ${title}, content = ${content},
            category = ${category}::document_category, tags = ${tagsJson}::jsonb,
            version = ${newVersion}, is_active = ${isActive},
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING id, slug, title, category, tags, version,
                    is_active, created_at, updated_at
        `
        return updated.rows[0] ?? null
      })

      if (!result) return errorResult('Document not found')
      return jsonResult(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to update brand document: ${message}`)
    }
  },
})

export const deleteBrandDocumentTool = defineTool({
  name: 'delete_brand_document',
  description: 'Soft-delete a brand context document by setting is_active to false.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Document ID to deactivate' },
    },
    required: ['id'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) return errorResult('Tenant ID is required')

    const id = args.id as string

    try {
      const result = await withTenant(tenantId, async () => {
        return sql`
          UPDATE brand_context_documents
          SET is_active = false, updated_at = NOW()
          WHERE id = ${id}
          RETURNING id, slug, title, is_active
        `
      })

      const doc = result.rows[0]
      if (!doc) return errorResult('Document not found')
      return jsonResult({ message: 'Document deactivated', document: doc })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to delete brand document: ${message}`)
    }
  },
})

// =============================================================================
// Creative Ideas Tools
// =============================================================================

export const listCreativeIdeasTool = defineTool({
  name: 'list_creative_ideas',
  description:
    'List creative ideas with optional filters. ' +
    'Types: ad_concept, script, hook, angle, cta, testimonial, trend, inspiration. ' +
    'Statuses: draft, ready, in_use, proven, archived, rejected.',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Filter by idea type',
        enum: ['ad_concept', 'script', 'hook', 'angle', 'cta', 'testimonial', 'trend', 'inspiration'],
      },
      status: {
        type: 'string',
        description: 'Filter by status',
        enum: ['draft', 'ready', 'in_use', 'proven', 'archived', 'rejected'],
      },
      platform: { type: 'string', description: 'Filter by platform (e.g., tiktok, instagram, meta)' },
      product: { type: 'string', description: 'Filter by product name' },
      limit: { type: 'number', description: 'Max results (default: 50)', default: 50, minimum: 1, maximum: 200 },
    },
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) return errorResult('Tenant ID is required')

    const ideaType = args.type as string | undefined
    const status = args.status as string | undefined
    const platform = args.platform as string | undefined
    const product = args.product as string | undefined
    const limit = Math.min(Number(args.limit) || 50, 200)

    try {
      const result = await withTenant(tenantId, async () => {
        // Build dynamic query with parameterized values
        let query = `
          SELECT id, title, type, status, description,
                 products, platforms, formats, tags,
                 times_used as "timesUsed",
                 performance_score as "performanceScore",
                 created_at as "createdAt",
                 updated_at as "updatedAt"
          FROM creative_ideas
          WHERE 1=1
        `
        const params: unknown[] = []

        if (ideaType) {
          params.push(ideaType)
          query += ` AND type = $${params.length}::creative_idea_type`
        }
        if (status) {
          params.push(status)
          query += ` AND status = $${params.length}::creative_idea_status`
        }
        if (platform) {
          params.push(platform)
          query += ` AND $${params.length} = ANY(platforms)`
        }
        if (product) {
          params.push(product)
          query += ` AND $${params.length} = ANY(products)`
        }

        params.push(limit)
        query += ` ORDER BY created_at DESC LIMIT $${params.length}`

        return sql.query(query, params)
      })

      return jsonResult({ ideas: result.rows, count: result.rows.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to list creative ideas: ${message}`)
    }
  },
})

export const getCreativeIdeaTool = defineTool({
  name: 'get_creative_idea',
  description: 'Get a creative idea by ID, including full content and project links.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Creative idea ID' },
    },
    required: ['id'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) return errorResult('Tenant ID is required')

    const id = args.id as string

    try {
      const result = await withTenant(tenantId, async () => {
        const ideaResult = await sql`
          SELECT id, title, type, status, description, content,
                 products, platforms, formats, tags,
                 times_used as "timesUsed",
                 performance_score as "performanceScore",
                 best_example as "bestExample",
                 notes,
                 created_at as "createdAt",
                 updated_at as "updatedAt"
          FROM creative_ideas
          WHERE id = ${id}
        `

        const idea = ideaResult.rows[0]
        if (!idea) return null

        const linksResult = await sql`
          SELECT id, idea_id as "ideaId", project_id as "projectId",
                 usage_type as "usageType", performance_notes as "performanceNotes",
                 created_at as "createdAt"
          FROM creative_idea_links
          WHERE idea_id = ${id}
        `

        return { idea, links: linksResult.rows }
      })

      if (!result) return errorResult('Creative idea not found')
      return jsonResult(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get creative idea: ${message}`)
    }
  },
})

export const searchCreativeIdeasTool = defineTool({
  name: 'search_creative_ideas',
  description: 'Search creative ideas by text across title and content.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search text (matches title, content)' },
      type: {
        type: 'string',
        description: 'Filter by type',
        enum: ['ad_concept', 'script', 'hook', 'angle', 'cta', 'testimonial', 'trend', 'inspiration'],
      },
      status: {
        type: 'string',
        description: 'Filter by status',
        enum: ['draft', 'ready', 'in_use', 'proven', 'archived', 'rejected'],
      },
      limit: { type: 'number', description: 'Max results (default: 20)', default: 20, minimum: 1, maximum: 100 },
    },
    required: ['query'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) return errorResult('Tenant ID is required')

    const query = args.query as string
    const ideaType = args.type as string | undefined
    const status = args.status as string | undefined
    const limit = Math.min(Number(args.limit) || 20, 100)
    const pattern = `%${query}%`

    try {
      const result = await withTenant(tenantId, async () => {
        let q = `
          SELECT id, title, type, status, description,
                 products, platforms, tags,
                 performance_score as "performanceScore",
                 created_at as "createdAt"
          FROM creative_ideas
          WHERE (title ILIKE $1 OR content ILIKE $1)
        `
        const params: unknown[] = [pattern]

        if (ideaType) {
          params.push(ideaType)
          q += ` AND type = $${params.length}::creative_idea_type`
        }
        if (status) {
          params.push(status)
          q += ` AND status = $${params.length}::creative_idea_status`
        }

        params.push(limit)
        q += ` ORDER BY created_at DESC LIMIT $${params.length}`

        return sql.query(q, params)
      })

      return jsonResult({ ideas: result.rows, count: result.rows.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to search creative ideas: ${message}`)
    }
  },
})

export const createCreativeIdeaTool = defineTool({
  name: 'create_creative_idea',
  description:
    'Create a new creative idea. ' +
    'Types: ad_concept, script, hook, angle, cta, testimonial, trend, inspiration. ' +
    'Statuses: draft, ready, in_use, proven, archived, rejected.',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Idea title' },
      type: {
        type: 'string',
        description: 'Idea type',
        enum: ['ad_concept', 'script', 'hook', 'angle', 'cta', 'testimonial', 'trend', 'inspiration'],
      },
      status: {
        type: 'string',
        description: 'Initial status (default: draft)',
        enum: ['draft', 'ready', 'in_use', 'proven', 'archived', 'rejected'],
        default: 'draft',
      },
      description: { type: 'string', description: 'Brief description' },
      content: { type: 'string', description: 'Full content (script text, detailed concept, etc.)' },
      products: {
        type: 'array',
        description: 'Related products',
        items: { type: 'string' },
      },
      platforms: {
        type: 'array',
        description: 'Target platforms (tiktok, instagram, youtube, meta)',
        items: { type: 'string' },
      },
      formats: {
        type: 'array',
        description: 'Content formats (short, long, reel, story, static)',
        items: { type: 'string' },
      },
      tags: {
        type: 'array',
        description: 'Tags for categorization',
        items: { type: 'string' },
      },
      performanceScore: {
        type: 'number',
        description: 'Performance score 0-100 (optional)',
        minimum: 0,
        maximum: 100,
      },
      bestExample: { type: 'string', description: 'URL or reference to best example' },
      notes: { type: 'string', description: 'Additional notes' },
    },
    required: ['title', 'type'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) return errorResult('Tenant ID is required')

    const title = args.title as string
    const type = args.type as string
    const status = (args.status as string) || 'draft'
    const description = (args.description as string) || null
    const content = (args.content as string) || null
    const products = (args.products as string[]) || []
    const platforms = (args.platforms as string[]) || []
    const formats = (args.formats as string[]) || []
    const tags = (args.tags as string[]) || []
    const performanceScore = (args.performanceScore as number) ?? null
    const bestExample = (args.bestExample as string) || null
    const notes = (args.notes as string) || null

    try {
      const result = await withTenant(tenantId, async () => {
        return sql`
          INSERT INTO creative_ideas (
            title, type, status, description, content,
            products, platforms, formats, tags,
            performance_score, best_example, notes
          ) VALUES (
            ${title},
            ${type}::creative_idea_type,
            ${status}::creative_idea_status,
            ${description},
            ${content},
            ${toPostgresArray(products)}::TEXT[],
            ${toPostgresArray(platforms)}::TEXT[],
            ${toPostgresArray(formats)}::TEXT[],
            ${toPostgresArray(tags)}::TEXT[],
            ${performanceScore},
            ${bestExample},
            ${notes}
          )
          RETURNING
            id, title, type, status, description, content,
            products, platforms, formats, tags,
            times_used as "timesUsed",
            performance_score as "performanceScore",
            best_example as "bestExample",
            notes,
            created_at as "createdAt",
            updated_at as "updatedAt"
        `
      })

      const idea = result.rows[0]
      if (!idea) return errorResult('Failed to create creative idea')
      return jsonResult(idea)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to create creative idea: ${message}`)
    }
  },
})

export const updateCreativeIdeaTool = defineTool({
  name: 'update_creative_idea',
  description: 'Update an existing creative idea. Only provide fields you want to change.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Creative idea ID' },
      title: { type: 'string', description: 'New title' },
      type: {
        type: 'string',
        description: 'New type',
        enum: ['ad_concept', 'script', 'hook', 'angle', 'cta', 'testimonial', 'trend', 'inspiration'],
      },
      status: {
        type: 'string',
        description: 'New status',
        enum: ['draft', 'ready', 'in_use', 'proven', 'archived', 'rejected'],
      },
      description: { type: 'string', description: 'New description' },
      content: { type: 'string', description: 'New content' },
      products: { type: 'array', description: 'New products list', items: { type: 'string' } },
      platforms: { type: 'array', description: 'New platforms list', items: { type: 'string' } },
      formats: { type: 'array', description: 'New formats list', items: { type: 'string' } },
      tags: { type: 'array', description: 'New tags list', items: { type: 'string' } },
      performanceScore: { type: 'number', description: 'New performance score 0-100', minimum: 0, maximum: 100 },
      bestExample: { type: 'string', description: 'New best example URL' },
      notes: { type: 'string', description: 'New notes' },
    },
    required: ['id'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) return errorResult('Tenant ID is required')

    const id = args.id as string

    try {
      const result = await withTenant(tenantId, async () => {
        return sql`
          UPDATE creative_ideas SET
            title = COALESCE(${(args.title as string) ?? null}, title),
            type = COALESCE(${(args.type as string) ?? null}::creative_idea_type, type),
            status = COALESCE(${(args.status as string) ?? null}::creative_idea_status, status),
            description = COALESCE(${(args.description as string) ?? null}, description),
            content = COALESCE(${(args.content as string) ?? null}, content),
            products = COALESCE(${toPostgresArray(args.products as string[] | undefined)}::TEXT[], products),
            platforms = COALESCE(${toPostgresArray(args.platforms as string[] | undefined)}::TEXT[], platforms),
            formats = COALESCE(${toPostgresArray(args.formats as string[] | undefined)}::TEXT[], formats),
            tags = COALESCE(${toPostgresArray(args.tags as string[] | undefined)}::TEXT[], tags),
            performance_score = COALESCE(${(args.performanceScore as number) ?? null}, performance_score),
            best_example = COALESCE(${(args.bestExample as string) ?? null}, best_example),
            notes = COALESCE(${(args.notes as string) ?? null}, notes),
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING
            id, title, type, status, description, content,
            products, platforms, formats, tags,
            times_used as "timesUsed",
            performance_score as "performanceScore",
            best_example as "bestExample",
            notes,
            created_at as "createdAt",
            updated_at as "updatedAt"
        `
      })

      const idea = result.rows[0]
      if (!idea) return errorResult('Creative idea not found')
      return jsonResult(idea)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to update creative idea: ${message}`)
    }
  },
})

export const deleteCreativeIdeaTool = defineTool({
  name: 'delete_creative_idea',
  description: 'Soft-delete a creative idea by setting status to archived.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Creative idea ID to archive' },
    },
    required: ['id'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) return errorResult('Tenant ID is required')

    const id = args.id as string

    try {
      const result = await withTenant(tenantId, async () => {
        return sql`
          UPDATE creative_ideas
          SET status = 'archived'::creative_idea_status, updated_at = NOW()
          WHERE id = ${id}
          RETURNING id, title, status
        `
      })

      const idea = result.rows[0]
      if (!idea) return errorResult('Creative idea not found')
      return jsonResult({ message: 'Creative idea archived', idea })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to archive creative idea: ${message}`)
    }
  },
})

// =============================================================================
// Export all content tools
// =============================================================================

export const contentTools: ToolDefinition[] = [
  // Brand Documents
  listBrandDocumentsTool,
  getBrandDocumentTool,
  searchBrandDocumentsTool,
  createBrandDocumentTool,
  updateBrandDocumentTool,
  deleteBrandDocumentTool,
  // Creative Ideas
  listCreativeIdeasTool,
  getCreativeIdeaTool,
  searchCreativeIdeasTool,
  createCreativeIdeaTool,
  updateCreativeIdeaTool,
  deleteCreativeIdeaTool,
]
