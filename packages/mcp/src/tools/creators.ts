/**
 * MCP Tools for Creator Management
 *
 * Provides AI-accessible tools for managing creators, projects, payouts,
 * and communications within the CGK platform.
 *
 * @ai-pattern mcp-tools
 * @ai-required All tools use withTenant() for data isolation
 */

import { defineTool, jsonResult, errorResult } from '../tools.js'
import { withTenant, sql } from '@cgk/db'
import type { ToolDefinition } from '../tools.js'

// =============================================================================
// Types
// =============================================================================

interface Creator {
  id: string
  email: string
  phone: string | null
  firstName: string
  lastName: string
  status: 'pending' | 'approved' | 'active' | 'paused' | 'terminated'
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  commissionRatePct: number
  commissionType: string
  referralCode: string | null
  instagramHandle: string | null
  tiktokHandle: string | null
  youtubeHandle: string | null
  totalOrders: number
  totalRevenueCents: number
  totalCommissionCents: number
  balanceCents: number
  pendingBalanceCents: number
  currency: string
  approvedAt: string | null
  createdAt: string
  updatedAt: string
}

// Note: Project, Payout, Communication interfaces are defined inline in tool handlers
// to avoid unused type warnings while still documenting expected shapes

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert snake_case database row to camelCase object
 */
function toCamelCase(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
    result[camelKey] = row[key]
  }
  return result
}

/**
 * Format cents as currency string
 */
function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

/**
 * Validate required tenant context
 */
function validateTenantId(tenantId: string | undefined): string {
  if (!tenantId) {
    throw new Error('Tenant context required')
  }
  return tenantId
}

// =============================================================================
// Creator Management Tools
// =============================================================================

/**
 * List creators with optional filters
 */
export const listCreatorsTool = defineTool({
  name: 'list_creators',
  description:
    'List creators with optional filters. Returns paginated results with creator profiles including status, tier, commission rates, and balance information.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      status: {
        type: 'string',
        enum: ['pending', 'approved', 'active', 'paused', 'terminated'],
        description: 'Filter by creator status',
      },
      tier: {
        type: 'string',
        enum: ['bronze', 'silver', 'gold', 'platinum'],
        description: 'Filter by creator tier',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 50, max: 100)',
        default: 50,
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination (default: 0)',
        default: 0,
      },
    },
    required: ['tenantId'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const status = args.status as string | undefined
    const tier = args.tier as string | undefined
    const limit = Math.min(Math.max((args.limit as number) || 50, 1), 100)
    const offset = Math.max((args.offset as number) || 0, 0)

    return withTenant(tenantId, async () => {
      // Build query based on filters
      let result
      if (status && tier) {
        result = await sql`
          SELECT * FROM creators
          WHERE status = ${status}::creator_status
            AND tier = ${tier}::creator_tier
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (status) {
        result = await sql`
          SELECT * FROM creators
          WHERE status = ${status}::creator_status
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (tier) {
        result = await sql`
          SELECT * FROM creators
          WHERE tier = ${tier}::creator_tier
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else {
        result = await sql`
          SELECT * FROM creators
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }

      // Get total count
      const countResult = await sql`SELECT COUNT(*) as total FROM creators`
      const countRow = countResult.rows[0]
      const total = countRow ? Number(countRow.total) : 0

      const creators = result.rows.map((row) => toCamelCase(row as Record<string, unknown>))

      return jsonResult({
        creators,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + creators.length < total,
        },
      })
    })
  },
})

/**
 * Get creator details by ID
 */
export const getCreatorTool = defineTool({
  name: 'get_creator',
  description:
    'Get detailed information about a specific creator including profile, balance, commission settings, and social handles.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      creatorId: {
        type: 'string',
        description: 'Creator ID to retrieve',
      },
    },
    required: ['tenantId', 'creatorId'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const creatorId = args.creatorId as string

    if (!creatorId) {
      return errorResult('creatorId is required')
    }

    return withTenant(tenantId, async () => {
      const result = await sql`
        SELECT * FROM creators WHERE id = ${creatorId}
      `

      const row = result.rows[0]
      if (!row) {
        return errorResult(`Creator not found: ${creatorId}`)
      }

      const creator = toCamelCase(row as Record<string, unknown>) as unknown as Creator

      // Get recent activity stats
      const projectsResult = await sql`
        SELECT COUNT(*) as total,
               COUNT(*) FILTER (WHERE status = 'completed') as completed
        FROM creator_projects
        WHERE creator_id = ${creatorId}
      `
      const projectRow = projectsResult.rows[0]

      const payoutsResult = await sql`
        SELECT COUNT(*) as total,
               SUM(net_amount_cents) FILTER (WHERE status = 'completed') as total_paid
        FROM payouts
        WHERE creator_id = ${creatorId}
      `
      const payoutRow = payoutsResult.rows[0]

      return jsonResult({
        creator,
        stats: {
          totalProjects: projectRow ? Number(projectRow.total) : 0,
          completedProjects: projectRow ? Number(projectRow.completed) : 0,
          totalPayouts: payoutRow ? Number(payoutRow.total) : 0,
          totalPaidCents: payoutRow ? Number(payoutRow.total_paid) || 0 : 0,
        },
      })
    })
  },
})

/**
 * Search creators by name or email
 */
export const searchCreatorsTool = defineTool({
  name: 'search_creators',
  description:
    'Search for creators by name, email, or referral code. Returns matching creators with profile information.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      query: {
        type: 'string',
        description: 'Search query (searches name, email, referral code)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 20, max: 50)',
        default: 20,
      },
    },
    required: ['tenantId', 'query'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const query = args.query as string
    const limit = Math.min(Math.max((args.limit as number) || 20, 1), 50)

    if (!query || query.length < 2) {
      return errorResult('Search query must be at least 2 characters')
    }

    return withTenant(tenantId, async () => {
      const searchPattern = `%${query}%`

      const result = await sql`
        SELECT * FROM creators
        WHERE first_name ILIKE ${searchPattern}
           OR last_name ILIKE ${searchPattern}
           OR email ILIKE ${searchPattern}
           OR referral_code ILIKE ${searchPattern}
           OR CONCAT(first_name, ' ', last_name) ILIKE ${searchPattern}
        ORDER BY
          CASE
            WHEN email ILIKE ${searchPattern} THEN 1
            WHEN referral_code ILIKE ${searchPattern} THEN 2
            ELSE 3
          END,
          created_at DESC
        LIMIT ${limit}
      `

      const creators = result.rows.map((row) => toCamelCase(row as Record<string, unknown>))

      return jsonResult({
        query,
        results: creators,
        count: creators.length,
      })
    })
  },
})

/**
 * Update creator profile
 */
export const updateCreatorTool = defineTool({
  name: 'update_creator',
  description:
    'Update creator profile information including contact details, tier, commission rate, and social handles.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      creatorId: {
        type: 'string',
        description: 'Creator ID to update',
      },
      firstName: {
        type: 'string',
        description: 'First name',
      },
      lastName: {
        type: 'string',
        description: 'Last name',
      },
      phone: {
        type: 'string',
        description: 'Phone number',
      },
      tier: {
        type: 'string',
        enum: ['bronze', 'silver', 'gold', 'platinum'],
        description: 'Creator tier',
      },
      commissionRatePct: {
        type: 'number',
        description: 'Commission rate percentage (e.g., 10.0 for 10%)',
        minimum: 0,
        maximum: 100,
      },
      instagramHandle: {
        type: 'string',
        description: 'Instagram handle',
      },
      tiktokHandle: {
        type: 'string',
        description: 'TikTok handle',
      },
      youtubeHandle: {
        type: 'string',
        description: 'YouTube handle',
      },
      notes: {
        type: 'string',
        description: 'Internal notes about the creator',
      },
    },
    required: ['tenantId', 'creatorId'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const creatorId = args.creatorId as string

    if (!creatorId) {
      return errorResult('creatorId is required')
    }

    return withTenant(tenantId, async () => {
      // Verify creator exists
      const existingResult = await sql`
        SELECT id FROM creators WHERE id = ${creatorId}
      `
      if (!existingResult.rows[0]) {
        return errorResult(`Creator not found: ${creatorId}`)
      }

      // Build update fields
      const updates: string[] = []
      const firstName = args.firstName as string | undefined
      const lastName = args.lastName as string | undefined
      const phone = args.phone as string | undefined
      const tier = args.tier as string | undefined
      const commissionRatePct = args.commissionRatePct as number | undefined
      const instagramHandle = args.instagramHandle as string | undefined
      const tiktokHandle = args.tiktokHandle as string | undefined
      const youtubeHandle = args.youtubeHandle as string | undefined
      const notes = args.notes as string | undefined

      // Execute individual updates based on provided fields
      if (firstName !== undefined) {
        await sql`UPDATE creators SET first_name = ${firstName} WHERE id = ${creatorId}`
        updates.push('firstName')
      }
      if (lastName !== undefined) {
        await sql`UPDATE creators SET last_name = ${lastName} WHERE id = ${creatorId}`
        updates.push('lastName')
      }
      if (phone !== undefined) {
        await sql`UPDATE creators SET phone = ${phone} WHERE id = ${creatorId}`
        updates.push('phone')
      }
      if (tier !== undefined) {
        await sql`UPDATE creators SET tier = ${tier}::creator_tier WHERE id = ${creatorId}`
        updates.push('tier')
      }
      if (commissionRatePct !== undefined) {
        await sql`UPDATE creators SET commission_rate_pct = ${commissionRatePct} WHERE id = ${creatorId}`
        updates.push('commissionRatePct')
      }
      if (instagramHandle !== undefined) {
        await sql`UPDATE creators SET instagram_handle = ${instagramHandle} WHERE id = ${creatorId}`
        updates.push('instagramHandle')
      }
      if (tiktokHandle !== undefined) {
        await sql`UPDATE creators SET tiktok_handle = ${tiktokHandle} WHERE id = ${creatorId}`
        updates.push('tiktokHandle')
      }
      if (youtubeHandle !== undefined) {
        await sql`UPDATE creators SET youtube_handle = ${youtubeHandle} WHERE id = ${creatorId}`
        updates.push('youtubeHandle')
      }
      if (notes !== undefined) {
        await sql`UPDATE creators SET notes = ${notes} WHERE id = ${creatorId}`
        updates.push('notes')
      }

      if (updates.length === 0) {
        return errorResult('No fields provided to update')
      }

      // Fetch updated creator
      const result = await sql`SELECT * FROM creators WHERE id = ${creatorId}`
      const row = result.rows[0]
      if (!row) {
        return errorResult('Failed to fetch updated creator')
      }

      const updatedCreator = toCamelCase(row as Record<string, unknown>)

      return jsonResult({
        success: true,
        updatedFields: updates,
        creator: updatedCreator,
      })
    })
  },
})

/**
 * Approve creator application
 */
export const approveCreatorTool = defineTool({
  name: 'approve_creator',
  description:
    'Approve a pending creator application. Sets status to approved and records approval timestamp.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      creatorId: {
        type: 'string',
        description: 'Creator ID to approve',
      },
      tier: {
        type: 'string',
        enum: ['bronze', 'silver', 'gold', 'platinum'],
        description: 'Initial tier to assign (default: bronze)',
        default: 'bronze',
      },
      commissionRatePct: {
        type: 'number',
        description: 'Commission rate to assign (default: 10.0)',
        default: 10.0,
      },
      notes: {
        type: 'string',
        description: 'Approval notes',
      },
    },
    required: ['tenantId', 'creatorId'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const creatorId = args.creatorId as string
    const tier = (args.tier as string) || 'bronze'
    const commissionRatePct = (args.commissionRatePct as number) || 10.0
    const notes = args.notes as string | undefined

    if (!creatorId) {
      return errorResult('creatorId is required')
    }

    return withTenant(tenantId, async () => {
      // Verify creator exists and is pending
      const existingResult = await sql`
        SELECT id, status, email, first_name, last_name FROM creators WHERE id = ${creatorId}
      `
      const existingRow = existingResult.rows[0]
      if (!existingRow) {
        return errorResult(`Creator not found: ${creatorId}`)
      }

      const currentStatus = existingRow.status as string
      if (currentStatus !== 'pending') {
        return errorResult(`Creator is not pending approval. Current status: ${currentStatus}`)
      }

      // Update to approved
      const now = new Date().toISOString()
      await sql`
        UPDATE creators
        SET status = 'approved'::creator_status,
            tier = ${tier}::creator_tier,
            commission_rate_pct = ${commissionRatePct},
            approved_at = ${now},
            notes = COALESCE(${notes ?? null}, notes)
        WHERE id = ${creatorId}
      `

      // Fetch updated creator
      const result = await sql`SELECT * FROM creators WHERE id = ${creatorId}`
      const row = result.rows[0]
      if (!row) {
        return errorResult('Failed to fetch approved creator')
      }

      const creator = toCamelCase(row as Record<string, unknown>) as unknown as Creator

      return jsonResult({
        success: true,
        message: `Creator ${creator.firstName} ${creator.lastName} approved`,
        creator,
      })
    })
  },
})

/**
 * Reject creator application
 */
export const rejectCreatorTool = defineTool({
  name: 'reject_creator',
  description: 'Reject a pending creator application with an optional reason.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      creatorId: {
        type: 'string',
        description: 'Creator ID to reject',
      },
      reason: {
        type: 'string',
        description: 'Rejection reason (stored in notes)',
      },
    },
    required: ['tenantId', 'creatorId'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const creatorId = args.creatorId as string
    const reason = args.reason as string | undefined

    if (!creatorId) {
      return errorResult('creatorId is required')
    }

    return withTenant(tenantId, async () => {
      // Verify creator exists and is pending
      const existingResult = await sql`
        SELECT id, status, email, first_name, last_name FROM creators WHERE id = ${creatorId}
      `
      const existingRow = existingResult.rows[0]
      if (!existingRow) {
        return errorResult(`Creator not found: ${creatorId}`)
      }

      const currentStatus = existingRow.status as string
      if (currentStatus !== 'pending') {
        return errorResult(`Creator is not pending. Current status: ${currentStatus}`)
      }

      // Update to terminated (rejected)
      const rejectionNote = reason ? `Rejected: ${reason}` : 'Application rejected'
      await sql`
        UPDATE creators
        SET status = 'terminated'::creator_status,
            notes = ${rejectionNote}
        WHERE id = ${creatorId}
      `

      return jsonResult({
        success: true,
        message: `Creator application rejected`,
        creatorId,
        reason: reason || 'No reason provided',
      })
    })
  },
})

// =============================================================================
// Project Tools
// =============================================================================

/**
 * List creator projects
 */
export const listProjectsTool = defineTool({
  name: 'list_projects',
  description: 'List creator projects with optional filters by status or creator.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      creatorId: {
        type: 'string',
        description: 'Filter by creator ID',
      },
      status: {
        type: 'string',
        enum: ['draft', 'submitted', 'in_review', 'revision_requested', 'approved', 'completed', 'cancelled'],
        description: 'Filter by project status',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 50, max: 100)',
        default: 50,
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination (default: 0)',
        default: 0,
      },
    },
    required: ['tenantId'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const creatorId = args.creatorId as string | undefined
    const status = args.status as string | undefined
    const limit = Math.min(Math.max((args.limit as number) || 50, 1), 100)
    const offset = Math.max((args.offset as number) || 0, 0)

    return withTenant(tenantId, async () => {
      let result
      if (creatorId && status) {
        result = await sql`
          SELECT * FROM creator_projects
          WHERE creator_id = ${creatorId}
            AND status = ${status}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (creatorId) {
        result = await sql`
          SELECT * FROM creator_projects
          WHERE creator_id = ${creatorId}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (status) {
        result = await sql`
          SELECT * FROM creator_projects
          WHERE status = ${status}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else {
        result = await sql`
          SELECT * FROM creator_projects
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }

      const projects = result.rows.map((row) => toCamelCase(row as Record<string, unknown>))

      // Get total count based on filters
      let countResult
      if (creatorId && status) {
        countResult = await sql`
          SELECT COUNT(*) as total FROM creator_projects
          WHERE creator_id = ${creatorId} AND status = ${status}
        `
      } else if (creatorId) {
        countResult = await sql`
          SELECT COUNT(*) as total FROM creator_projects WHERE creator_id = ${creatorId}
        `
      } else if (status) {
        countResult = await sql`
          SELECT COUNT(*) as total FROM creator_projects WHERE status = ${status}
        `
      } else {
        countResult = await sql`SELECT COUNT(*) as total FROM creator_projects`
      }
      const countRow = countResult.rows[0]
      const total = countRow ? Number(countRow.total) : 0

      return jsonResult({
        projects,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + projects.length < total,
        },
      })
    })
  },
})

/**
 * Get project details
 */
export const getProjectTool = defineTool({
  name: 'get_project',
  description: 'Get detailed information about a specific creator project including files and revisions.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      projectId: {
        type: 'string',
        description: 'Project ID to retrieve',
      },
    },
    required: ['tenantId', 'projectId'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const projectId = args.projectId as string

    if (!projectId) {
      return errorResult('projectId is required')
    }

    return withTenant(tenantId, async () => {
      const result = await sql`
        SELECT * FROM creator_projects WHERE id = ${projectId}
      `

      const row = result.rows[0]
      if (!row) {
        return errorResult(`Project not found: ${projectId}`)
      }

      const project = toCamelCase(row as Record<string, unknown>)

      // Get project files
      const filesResult = await sql`
        SELECT * FROM project_files
        WHERE project_id = ${projectId}
        ORDER BY uploaded_at DESC
      `
      const files = filesResult.rows.map((r) => toCamelCase(r as Record<string, unknown>))

      // Get revision history
      const revisionsResult = await sql`
        SELECT * FROM project_revisions
        WHERE project_id = ${projectId}
        ORDER BY revision_number DESC
      `
      const revisions = revisionsResult.rows.map((r) => toCamelCase(r as Record<string, unknown>))

      // Get creator info
      const creatorResult = await sql`
        SELECT id, email, first_name, last_name, tier
        FROM creators
        WHERE id = ${(row as Record<string, unknown>).creator_id as string}
      `
      const creatorRow = creatorResult.rows[0]
      const creator = creatorRow ? toCamelCase(creatorRow as Record<string, unknown>) : null

      return jsonResult({
        project,
        files,
        revisions,
        creator,
      })
    })
  },
})

/**
 * Create a new project
 */
export const createProjectTool = defineTool({
  name: 'create_project',
  description: 'Create a new project for a creator with title, description, and payment details.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      creatorId: {
        type: 'string',
        description: 'Creator ID to assign project to',
      },
      brandId: {
        type: 'string',
        description: 'Brand ID for the project',
      },
      title: {
        type: 'string',
        description: 'Project title',
      },
      description: {
        type: 'string',
        description: 'Project description',
      },
      brief: {
        type: 'string',
        description: 'Project brief/requirements',
      },
      dueDate: {
        type: 'string',
        description: 'Due date (ISO 8601 format)',
      },
      paymentCents: {
        type: 'number',
        description: 'Payment amount in cents',
      },
      maxRevisions: {
        type: 'number',
        description: 'Maximum number of revisions allowed (default: 3)',
        default: 3,
      },
      createdBy: {
        type: 'string',
        description: 'User ID creating the project',
      },
    },
    required: ['tenantId', 'creatorId', 'brandId', 'title', 'createdBy'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const creatorId = args.creatorId as string
    const brandId = args.brandId as string
    const title = args.title as string
    const description = (args.description as string) || null
    const brief = (args.brief as string) || null
    const dueDate = (args.dueDate as string) || null
    const paymentCents = (args.paymentCents as number) || 0
    const maxRevisions = (args.maxRevisions as number) || 3
    const createdBy = args.createdBy as string

    if (!creatorId || !brandId || !title || !createdBy) {
      return errorResult('creatorId, brandId, title, and createdBy are required')
    }

    return withTenant(tenantId, async () => {
      // Verify creator exists
      const creatorResult = await sql`SELECT id, status FROM creators WHERE id = ${creatorId}`
      const creatorRow = creatorResult.rows[0]
      if (!creatorRow) {
        return errorResult(`Creator not found: ${creatorId}`)
      }

      // Generate project ID
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

      // Insert project
      const result = await sql`
        INSERT INTO creator_projects (
          id, creator_id, brand_id, title, description, brief,
          due_date, payment_cents, max_revisions, created_by, status
        )
        VALUES (
          ${projectId}, ${creatorId}, ${brandId}, ${title}, ${description},
          ${brief}, ${dueDate}, ${paymentCents}, ${maxRevisions}, ${createdBy}, 'draft'
        )
        RETURNING *
      `

      const row = result.rows[0]
      if (!row) {
        return errorResult('Failed to create project')
      }

      const project = toCamelCase(row as Record<string, unknown>)

      return jsonResult({
        success: true,
        message: 'Project created successfully',
        project,
      })
    })
  },
})

/**
 * Update project details
 */
export const updateProjectTool = defineTool({
  name: 'update_project',
  description: 'Update project details including title, description, brief, due date, and payment.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      projectId: {
        type: 'string',
        description: 'Project ID to update',
      },
      title: {
        type: 'string',
        description: 'Project title',
      },
      description: {
        type: 'string',
        description: 'Project description',
      },
      brief: {
        type: 'string',
        description: 'Project brief/requirements',
      },
      dueDate: {
        type: 'string',
        description: 'Due date (ISO 8601 format)',
      },
      paymentCents: {
        type: 'number',
        description: 'Payment amount in cents',
      },
      feedback: {
        type: 'string',
        description: 'Feedback for the creator',
      },
    },
    required: ['tenantId', 'projectId'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const projectId = args.projectId as string

    if (!projectId) {
      return errorResult('projectId is required')
    }

    return withTenant(tenantId, async () => {
      // Verify project exists
      const existingResult = await sql`SELECT id FROM creator_projects WHERE id = ${projectId}`
      if (!existingResult.rows[0]) {
        return errorResult(`Project not found: ${projectId}`)
      }

      const updates: string[] = []
      const title = args.title as string | undefined
      const description = args.description as string | undefined
      const brief = args.brief as string | undefined
      const dueDate = args.dueDate as string | undefined
      const paymentCents = args.paymentCents as number | undefined
      const feedback = args.feedback as string | undefined

      // Execute individual updates
      if (title !== undefined) {
        await sql`UPDATE creator_projects SET title = ${title} WHERE id = ${projectId}`
        updates.push('title')
      }
      if (description !== undefined) {
        await sql`UPDATE creator_projects SET description = ${description} WHERE id = ${projectId}`
        updates.push('description')
      }
      if (brief !== undefined) {
        await sql`UPDATE creator_projects SET brief = ${brief} WHERE id = ${projectId}`
        updates.push('brief')
      }
      if (dueDate !== undefined) {
        await sql`UPDATE creator_projects SET due_date = ${dueDate} WHERE id = ${projectId}`
        updates.push('dueDate')
      }
      if (paymentCents !== undefined) {
        await sql`UPDATE creator_projects SET payment_cents = ${paymentCents} WHERE id = ${projectId}`
        updates.push('paymentCents')
      }
      if (feedback !== undefined) {
        const now = new Date().toISOString()
        await sql`UPDATE creator_projects SET feedback = ${feedback}, feedback_at = ${now} WHERE id = ${projectId}`
        updates.push('feedback')
      }

      if (updates.length === 0) {
        return errorResult('No fields provided to update')
      }

      // Fetch updated project
      const result = await sql`SELECT * FROM creator_projects WHERE id = ${projectId}`
      const row = result.rows[0]
      if (!row) {
        return errorResult('Failed to fetch updated project')
      }

      const project = toCamelCase(row as Record<string, unknown>)

      return jsonResult({
        success: true,
        updatedFields: updates,
        project,
      })
    })
  },
})

/**
 * Update project status
 */
export const updateProjectStatusTool = defineTool({
  name: 'update_project_status',
  description:
    'Change project status (e.g., submit, approve, request revision, complete, cancel).',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      projectId: {
        type: 'string',
        description: 'Project ID to update',
      },
      status: {
        type: 'string',
        enum: ['draft', 'submitted', 'in_review', 'revision_requested', 'approved', 'completed', 'cancelled'],
        description: 'New project status',
      },
      feedback: {
        type: 'string',
        description: 'Optional feedback or notes for status change',
      },
    },
    required: ['tenantId', 'projectId', 'status'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const projectId = args.projectId as string
    const newStatus = args.status as string
    const feedback = args.feedback as string | undefined

    if (!projectId || !newStatus) {
      return errorResult('projectId and status are required')
    }

    return withTenant(tenantId, async () => {
      // Verify project exists
      const existingResult = await sql`
        SELECT id, status, revision_count, max_revisions FROM creator_projects WHERE id = ${projectId}
      `
      const existingRow = existingResult.rows[0]
      if (!existingRow) {
        return errorResult(`Project not found: ${projectId}`)
      }

      const currentStatus = existingRow.status as string
      const now = new Date().toISOString()

      // Update based on new status
      if (newStatus === 'submitted') {
        await sql`
          UPDATE creator_projects
          SET status = ${newStatus}, submitted_at = ${now}
          WHERE id = ${projectId}
        `
      } else if (newStatus === 'approved') {
        await sql`
          UPDATE creator_projects
          SET status = ${newStatus}, approved_at = ${now}
          WHERE id = ${projectId}
        `
      } else if (newStatus === 'completed') {
        await sql`
          UPDATE creator_projects
          SET status = ${newStatus}, completed_at = ${now}
          WHERE id = ${projectId}
        `
      } else if (newStatus === 'revision_requested') {
        const revisionCount = (existingRow.revision_count as number) + 1
        await sql`
          UPDATE creator_projects
          SET status = ${newStatus},
              revision_count = ${revisionCount},
              feedback = ${feedback ?? null},
              feedback_at = ${now}
          WHERE id = ${projectId}
        `
      } else {
        await sql`
          UPDATE creator_projects SET status = ${newStatus} WHERE id = ${projectId}
        `
      }

      // Fetch updated project
      const result = await sql`SELECT * FROM creator_projects WHERE id = ${projectId}`
      const row = result.rows[0]
      if (!row) {
        return errorResult('Failed to fetch updated project')
      }

      const project = toCamelCase(row as Record<string, unknown>)

      return jsonResult({
        success: true,
        message: `Project status changed from ${currentStatus} to ${newStatus}`,
        project,
      })
    })
  },
})

// =============================================================================
// Payout Tools
// =============================================================================

/**
 * List payouts
 */
export const listPayoutsTool = defineTool({
  name: 'list_payouts',
  description: 'List payouts with optional filters by creator, status, or date range.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      creatorId: {
        type: 'string',
        description: 'Filter by creator ID',
      },
      status: {
        type: 'string',
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        description: 'Filter by payout status',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 50, max: 100)',
        default: 50,
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination (default: 0)',
        default: 0,
      },
    },
    required: ['tenantId'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const creatorId = args.creatorId as string | undefined
    const status = args.status as string | undefined
    const limit = Math.min(Math.max((args.limit as number) || 50, 1), 100)
    const offset = Math.max((args.offset as number) || 0, 0)

    return withTenant(tenantId, async () => {
      let result
      if (creatorId && status) {
        result = await sql`
          SELECT p.*, c.email as creator_email, c.first_name, c.last_name
          FROM payouts p
          JOIN creators c ON p.creator_id = c.id
          WHERE p.creator_id = ${creatorId}
            AND p.status = ${status}::payout_status
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (creatorId) {
        result = await sql`
          SELECT p.*, c.email as creator_email, c.first_name, c.last_name
          FROM payouts p
          JOIN creators c ON p.creator_id = c.id
          WHERE p.creator_id = ${creatorId}
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (status) {
        result = await sql`
          SELECT p.*, c.email as creator_email, c.first_name, c.last_name
          FROM payouts p
          JOIN creators c ON p.creator_id = c.id
          WHERE p.status = ${status}::payout_status
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else {
        result = await sql`
          SELECT p.*, c.email as creator_email, c.first_name, c.last_name
          FROM payouts p
          JOIN creators c ON p.creator_id = c.id
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }

      const payouts = result.rows.map((row) => {
        const camel = toCamelCase(row as Record<string, unknown>)
        return {
          ...camel,
          amountFormatted: formatCurrency(camel.amountCents as number, camel.currency as string),
          netAmountFormatted: formatCurrency(camel.netAmountCents as number, camel.currency as string),
        }
      })

      // Get total count
      let countResult
      if (creatorId && status) {
        countResult = await sql`
          SELECT COUNT(*) as total FROM payouts
          WHERE creator_id = ${creatorId} AND status = ${status}::payout_status
        `
      } else if (creatorId) {
        countResult = await sql`SELECT COUNT(*) as total FROM payouts WHERE creator_id = ${creatorId}`
      } else if (status) {
        countResult = await sql`SELECT COUNT(*) as total FROM payouts WHERE status = ${status}::payout_status`
      } else {
        countResult = await sql`SELECT COUNT(*) as total FROM payouts`
      }
      const countRow = countResult.rows[0]
      const total = countRow ? Number(countRow.total) : 0

      return jsonResult({
        payouts,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + payouts.length < total,
        },
      })
    })
  },
})

/**
 * Get payout details
 */
export const getPayoutTool = defineTool({
  name: 'get_payout',
  description: 'Get detailed information about a specific payout including transaction history.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      payoutId: {
        type: 'string',
        description: 'Payout ID to retrieve',
      },
    },
    required: ['tenantId', 'payoutId'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const payoutId = args.payoutId as string

    if (!payoutId) {
      return errorResult('payoutId is required')
    }

    return withTenant(tenantId, async () => {
      const result = await sql`
        SELECT p.*, c.email as creator_email, c.first_name, c.last_name
        FROM payouts p
        JOIN creators c ON p.creator_id = c.id
        WHERE p.id = ${payoutId}
      `

      const row = result.rows[0]
      if (!row) {
        return errorResult(`Payout not found: ${payoutId}`)
      }

      const payout = toCamelCase(row as Record<string, unknown>)

      // Get related balance transaction
      const transactionResult = await sql`
        SELECT * FROM balance_transactions
        WHERE payout_id = ${payoutId}
        ORDER BY created_at DESC
      `
      const transactions = transactionResult.rows.map((r) => toCamelCase(r as Record<string, unknown>))

      return jsonResult({
        payout: {
          ...payout,
          amountFormatted: formatCurrency(payout.amountCents as number, payout.currency as string),
          netAmountFormatted: formatCurrency(payout.netAmountCents as number, payout.currency as string),
        },
        transactions,
      })
    })
  },
})

/**
 * Get creator balance
 */
export const getCreatorBalanceTool = defineTool({
  name: 'get_creator_balance',
  description: 'Get a creator\'s available balance and pending earnings.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      creatorId: {
        type: 'string',
        description: 'Creator ID to get balance for',
      },
    },
    required: ['tenantId', 'creatorId'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const creatorId = args.creatorId as string

    if (!creatorId) {
      return errorResult('creatorId is required')
    }

    return withTenant(tenantId, async () => {
      const result = await sql`
        SELECT id, email, first_name, last_name,
               balance_cents, pending_balance_cents, currency,
               total_commission_cents
        FROM creators
        WHERE id = ${creatorId}
      `

      const row = result.rows[0]
      if (!row) {
        return errorResult(`Creator not found: ${creatorId}`)
      }

      const creator = toCamelCase(row as Record<string, unknown>)
      const currency = creator.currency as string

      // Get pending payouts
      const pendingResult = await sql`
        SELECT COALESCE(SUM(net_amount_cents), 0) as pending_payouts
        FROM payouts
        WHERE creator_id = ${creatorId}
          AND status IN ('pending', 'processing')
      `
      const pendingRow = pendingResult.rows[0]
      const pendingPayoutsCents = pendingRow ? Number(pendingRow.pending_payouts) : 0

      // Get recent transactions
      const transactionsResult = await sql`
        SELECT * FROM balance_transactions
        WHERE creator_id = ${creatorId}
        ORDER BY created_at DESC
        LIMIT 10
      `
      const recentTransactions = transactionsResult.rows.map((r) => toCamelCase(r as Record<string, unknown>))

      return jsonResult({
        creator: {
          id: creator.id,
          email: creator.email,
          name: `${creator.firstName} ${creator.lastName}`,
        },
        balance: {
          availableCents: creator.balanceCents as number,
          availableFormatted: formatCurrency(creator.balanceCents as number, currency),
          pendingCents: creator.pendingBalanceCents as number,
          pendingFormatted: formatCurrency(creator.pendingBalanceCents as number, currency),
          pendingPayoutsCents,
          pendingPayoutsFormatted: formatCurrency(pendingPayoutsCents, currency),
          totalEarnedCents: creator.totalCommissionCents as number,
          totalEarnedFormatted: formatCurrency(creator.totalCommissionCents as number, currency),
          currency,
        },
        recentTransactions,
      })
    })
  },
})

/**
 * Initiate a payout
 */
export const initiatePayoutTool = defineTool({
  name: 'initiate_payout',
  description:
    'Initiate a payout to a creator. Creates a pending payout record and deducts from available balance.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      creatorId: {
        type: 'string',
        description: 'Creator ID to pay out',
      },
      amountCents: {
        type: 'number',
        description: 'Amount to pay out in cents (must be <= available balance)',
      },
      method: {
        type: 'string',
        enum: ['stripe', 'wise', 'paypal', 'bank_transfer', 'manual'],
        description: 'Payout method',
      },
      notes: {
        type: 'string',
        description: 'Optional notes for the payout',
      },
    },
    required: ['tenantId', 'creatorId', 'amountCents', 'method'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const creatorId = args.creatorId as string
    const amountCents = args.amountCents as number
    const method = args.method as string
    const notes = args.notes as string | undefined

    if (!creatorId || !amountCents || !method) {
      return errorResult('creatorId, amountCents, and method are required')
    }

    if (amountCents <= 0) {
      return errorResult('amountCents must be greater than 0')
    }

    return withTenant(tenantId, async () => {
      // Get creator and validate balance
      const creatorResult = await sql`
        SELECT id, email, first_name, last_name, balance_cents, currency
        FROM creators
        WHERE id = ${creatorId}
      `
      const creatorRow = creatorResult.rows[0]
      if (!creatorRow) {
        return errorResult(`Creator not found: ${creatorId}`)
      }

      const availableBalance = creatorRow.balance_cents as number
      const currency = creatorRow.currency as string

      if (amountCents > availableBalance) {
        return errorResult(
          `Insufficient balance. Requested: ${formatCurrency(amountCents, currency)}, ` +
          `Available: ${formatCurrency(availableBalance, currency)}`
        )
      }

      // Calculate fees (simplified - 2% for example)
      const feeRate = 0.02
      const feeCents = Math.round(amountCents * feeRate)
      const netAmountCents = amountCents - feeCents
      const now = new Date().toISOString()

      // Generate payout ID
      const payoutId = `payout_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

      // Create payout record
      const payoutResult = await sql`
        INSERT INTO payouts (
          id, creator_id, amount_cents, fee_cents, net_amount_cents,
          currency, method, status, notes, initiated_at
        )
        VALUES (
          ${payoutId}, ${creatorId}, ${amountCents}, ${feeCents}, ${netAmountCents},
          ${currency}, ${method}::payout_method, 'pending'::payout_status, ${notes ?? null}, ${now}
        )
        RETURNING *
      `

      const payoutRow = payoutResult.rows[0]
      if (!payoutRow) {
        return errorResult('Failed to create payout')
      }

      // Deduct from creator balance
      const newBalance = availableBalance - amountCents
      await sql`
        UPDATE creators
        SET balance_cents = ${newBalance}
        WHERE id = ${creatorId}
      `

      // Create balance transaction
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      await sql`
        INSERT INTO balance_transactions (
          id, creator_id, type, amount_cents, currency,
          balance_after_cents, payout_id, description
        )
        VALUES (
          ${transactionId}, ${creatorId}, 'payout', ${-amountCents}, ${currency},
          ${newBalance}, ${payoutId}, ${'Payout initiated'}
        )
      `

      const payout = toCamelCase(payoutRow as Record<string, unknown>)

      return jsonResult({
        success: true,
        message: 'Payout initiated successfully',
        payout: {
          ...payout,
          amountFormatted: formatCurrency(amountCents, currency),
          feeFormatted: formatCurrency(feeCents, currency),
          netAmountFormatted: formatCurrency(netAmountCents, currency),
        },
        newBalance: {
          cents: newBalance,
          formatted: formatCurrency(newBalance, currency),
        },
      })
    })
  },
})

/**
 * Get payout history
 */
export const getPayoutHistoryTool = defineTool({
  name: 'get_payout_history',
  description: 'Get complete payout history for a creator with summary statistics.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      creatorId: {
        type: 'string',
        description: 'Creator ID to get history for',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of payouts (default: 50)',
        default: 50,
      },
    },
    required: ['tenantId', 'creatorId'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const creatorId = args.creatorId as string
    const limit = Math.min(Math.max((args.limit as number) || 50, 1), 100)

    if (!creatorId) {
      return errorResult('creatorId is required')
    }

    return withTenant(tenantId, async () => {
      // Verify creator exists
      const creatorResult = await sql`
        SELECT id, currency FROM creators WHERE id = ${creatorId}
      `
      const creatorRow = creatorResult.rows[0]
      if (!creatorRow) {
        return errorResult(`Creator not found: ${creatorId}`)
      }

      const currency = creatorRow.currency as string

      // Get payouts
      const payoutsResult = await sql`
        SELECT * FROM payouts
        WHERE creator_id = ${creatorId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
      const payouts = payoutsResult.rows.map((row) => {
        const camel = toCamelCase(row as Record<string, unknown>)
        return {
          ...camel,
          amountFormatted: formatCurrency(camel.amountCents as number, camel.currency as string),
          netAmountFormatted: formatCurrency(camel.netAmountCents as number, camel.currency as string),
        }
      })

      // Get summary stats
      const statsResult = await sql`
        SELECT
          COUNT(*) as total_payouts,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_payouts,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_payouts,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_payouts,
          COALESCE(SUM(net_amount_cents) FILTER (WHERE status = 'completed'), 0) as total_paid_cents,
          COALESCE(SUM(net_amount_cents) FILTER (WHERE status = 'pending'), 0) as pending_cents
        FROM payouts
        WHERE creator_id = ${creatorId}
      `
      const statsRow = statsResult.rows[0]

      return jsonResult({
        creatorId,
        payouts,
        summary: {
          totalPayouts: statsRow ? Number(statsRow.total_payouts) : 0,
          completedPayouts: statsRow ? Number(statsRow.completed_payouts) : 0,
          pendingPayouts: statsRow ? Number(statsRow.pending_payouts) : 0,
          failedPayouts: statsRow ? Number(statsRow.failed_payouts) : 0,
          totalPaidCents: statsRow ? Number(statsRow.total_paid_cents) : 0,
          totalPaidFormatted: formatCurrency(
            statsRow ? Number(statsRow.total_paid_cents) : 0,
            currency
          ),
          pendingCents: statsRow ? Number(statsRow.pending_cents) : 0,
          pendingFormatted: formatCurrency(
            statsRow ? Number(statsRow.pending_cents) : 0,
            currency
          ),
        },
      })
    })
  },
})

// =============================================================================
// Communication Tools
// =============================================================================

/**
 * Send email to creator
 */
export const sendCreatorEmailTool = defineTool({
  name: 'send_creator_email',
  description:
    'Send an email to a creator. Queues the email for delivery and tracks in communication history.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      creatorId: {
        type: 'string',
        description: 'Creator ID to send email to',
      },
      subject: {
        type: 'string',
        description: 'Email subject',
      },
      contentHtml: {
        type: 'string',
        description: 'Email content in HTML format',
      },
      contentText: {
        type: 'string',
        description: 'Optional plain text version',
      },
      templateSlug: {
        type: 'string',
        description: 'Optional template slug to use instead of content',
      },
      templateVariables: {
        type: 'object',
        description: 'Variables to substitute in template',
      },
    },
    required: ['tenantId', 'creatorId', 'subject'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const creatorId = args.creatorId as string
    const subject = args.subject as string
    const contentHtml = args.contentHtml as string | undefined
    const contentText = args.contentText as string | undefined
    const templateSlug = args.templateSlug as string | undefined
    const templateVariables = args.templateVariables as Record<string, unknown> | undefined

    if (!creatorId || !subject) {
      return errorResult('creatorId and subject are required')
    }

    if (!contentHtml && !templateSlug) {
      return errorResult('Either contentHtml or templateSlug is required')
    }

    return withTenant(tenantId, async () => {
      // Get creator
      const creatorResult = await sql`
        SELECT id, email, first_name, last_name
        FROM creators
        WHERE id = ${creatorId}
      `
      const creatorRow = creatorResult.rows[0]
      if (!creatorRow) {
        return errorResult(`Creator not found: ${creatorId}`)
      }

      let finalHtml = contentHtml || ''
      let finalText = contentText || ''

      // If template is specified, fetch and process it
      if (templateSlug) {
        const templateResult = await sql`
          SELECT content_html, content_text, variables
          FROM creator_email_templates
          WHERE slug = ${templateSlug}
            AND is_enabled = true
        `
        const templateRow = templateResult.rows[0]
        if (!templateRow) {
          return errorResult(`Template not found or disabled: ${templateSlug}`)
        }

        finalHtml = templateRow.content_html as string
        finalText = (templateRow.content_text as string) || ''

        // Substitute variables
        if (templateVariables) {
          for (const [key, value] of Object.entries(templateVariables)) {
            const placeholder = `{{${key}}}`
            finalHtml = finalHtml.replace(new RegExp(placeholder, 'g'), String(value))
            finalText = finalText.replace(new RegExp(placeholder, 'g'), String(value))
          }
        }

        // Add default variables
        finalHtml = finalHtml
          .replace(/\{\{creator_name\}\}/g, `${creatorRow.first_name} ${creatorRow.last_name}`)
          .replace(/\{\{creator_first_name\}\}/g, creatorRow.first_name as string)
          .replace(/\{\{creator_email\}\}/g, creatorRow.email as string)
        finalText = finalText
          .replace(/\{\{creator_name\}\}/g, `${creatorRow.first_name} ${creatorRow.last_name}`)
          .replace(/\{\{creator_first_name\}\}/g, creatorRow.first_name as string)
          .replace(/\{\{creator_email\}\}/g, creatorRow.email as string)
      }

      // Create bulk send record for single email (for tracking)
      const bulkSendId = crypto.randomUUID()
      const now = new Date().toISOString()

      await sql`
        INSERT INTO creator_bulk_sends (
          id, name, subject, content_html, content_text,
          recipient_count, recipient_ids, status, started_at
        )
        VALUES (
          ${bulkSendId}, ${'Individual email'}, ${subject}, ${finalHtml}, ${finalText},
          ${1}, ${`{${creatorId}}`}, 'sending', ${now}
        )
      `

      // Create recipient record
      await sql`
        INSERT INTO creator_bulk_send_recipients (
          id, bulk_send_id, creator_id, creator_email, creator_name, status
        )
        VALUES (
          ${crypto.randomUUID()}, ${bulkSendId}, ${creatorId},
          ${creatorRow.email as string}, ${`${creatorRow.first_name} ${creatorRow.last_name}`}, 'pending'
        )
      `

      // In a real implementation, this would queue the email for actual sending
      // For now, we just record it as queued

      return jsonResult({
        success: true,
        message: 'Email queued for delivery',
        bulkSendId,
        recipient: {
          id: creatorId,
          email: creatorRow.email,
          name: `${creatorRow.first_name} ${creatorRow.last_name}`,
        },
        subject,
      })
    })
  },
})

/**
 * List creator communications
 */
export const listCreatorCommunicationsTool = defineTool({
  name: 'list_creator_communications',
  description: 'List past communications (emails) sent to a creator.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      creatorId: {
        type: 'string',
        description: 'Creator ID to get communications for',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 50)',
        default: 50,
      },
    },
    required: ['tenantId', 'creatorId'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const creatorId = args.creatorId as string
    const limit = Math.min(Math.max((args.limit as number) || 50, 1), 100)

    if (!creatorId) {
      return errorResult('creatorId is required')
    }

    return withTenant(tenantId, async () => {
      // Verify creator exists
      const creatorResult = await sql`
        SELECT id, email, first_name, last_name FROM creators WHERE id = ${creatorId}
      `
      const creatorRow = creatorResult.rows[0]
      if (!creatorRow) {
        return errorResult(`Creator not found: ${creatorId}`)
      }

      // Get bulk send recipients for this creator
      const result = await sql`
        SELECT r.*, s.subject, s.content_html, s.name as campaign_name
        FROM creator_bulk_send_recipients r
        JOIN creator_bulk_sends s ON r.bulk_send_id = s.id
        WHERE r.creator_id = ${creatorId}
        ORDER BY r.created_at DESC
        LIMIT ${limit}
      `

      const communications = result.rows.map((row) => {
        const camel = toCamelCase(row as Record<string, unknown>)
        return {
          id: camel.id,
          bulkSendId: camel.bulkSendId,
          subject: camel.subject,
          campaignName: camel.campaignName,
          status: camel.status,
          sentAt: camel.sentAt,
          openedAt: camel.openedAt,
          clickedAt: camel.clickedAt,
          createdAt: camel.createdAt,
        }
      })

      return jsonResult({
        creator: {
          id: creatorId,
          email: creatorRow.email,
          name: `${creatorRow.first_name} ${creatorRow.last_name}`,
        },
        communications,
        count: communications.length,
      })
    })
  },
})

/**
 * Schedule a reminder
 */
export const scheduleReminderTool = defineTool({
  name: 'schedule_reminder',
  description:
    'Schedule a reminder email to be sent to a creator at a specific time.',
  inputSchema: {
    type: 'object',
    properties: {
      tenantId: {
        type: 'string',
        description: 'Tenant ID for data isolation (required)',
      },
      creatorId: {
        type: 'string',
        description: 'Creator ID to send reminder to',
      },
      subject: {
        type: 'string',
        description: 'Reminder subject',
      },
      contentHtml: {
        type: 'string',
        description: 'Reminder content in HTML',
      },
      scheduledFor: {
        type: 'string',
        description: 'When to send the reminder (ISO 8601 format)',
      },
      reminderType: {
        type: 'string',
        enum: ['deadline', 'followup', 'payment', 'general'],
        description: 'Type of reminder for categorization',
      },
    },
    required: ['tenantId', 'creatorId', 'subject', 'contentHtml', 'scheduledFor'],
  },
  async handler(args) {
    const tenantId = validateTenantId(args.tenantId as string | undefined)
    const creatorId = args.creatorId as string
    const subject = args.subject as string
    const contentHtml = args.contentHtml as string
    const scheduledFor = args.scheduledFor as string
    const reminderType = (args.reminderType as string) || 'general'

    if (!creatorId || !subject || !contentHtml || !scheduledFor) {
      return errorResult('creatorId, subject, contentHtml, and scheduledFor are required')
    }

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledFor)
    if (isNaN(scheduledDate.getTime())) {
      return errorResult('Invalid scheduledFor date format')
    }
    if (scheduledDate <= new Date()) {
      return errorResult('scheduledFor must be in the future')
    }

    return withTenant(tenantId, async () => {
      // Verify creator exists
      const creatorResult = await sql`
        SELECT id, email, first_name, last_name FROM creators WHERE id = ${creatorId}
      `
      const creatorRow = creatorResult.rows[0]
      if (!creatorRow) {
        return errorResult(`Creator not found: ${creatorId}`)
      }

      // Create scheduled bulk send
      const bulkSendId = crypto.randomUUID()

      await sql`
        INSERT INTO creator_bulk_sends (
          id, name, subject, content_html,
          recipient_count, recipient_ids, status, scheduled_for
        )
        VALUES (
          ${bulkSendId}, ${`Scheduled reminder: ${reminderType}`}, ${subject}, ${contentHtml},
          ${1}, ${`{${creatorId}}`}, 'scheduled', ${scheduledFor}
        )
      `

      // Create recipient record
      await sql`
        INSERT INTO creator_bulk_send_recipients (
          id, bulk_send_id, creator_id, creator_email, creator_name, status
        )
        VALUES (
          ${crypto.randomUUID()}, ${bulkSendId}, ${creatorId},
          ${creatorRow.email as string}, ${`${creatorRow.first_name} ${creatorRow.last_name}`}, 'pending'
        )
      `

      return jsonResult({
        success: true,
        message: 'Reminder scheduled successfully',
        reminder: {
          id: bulkSendId,
          type: reminderType,
          subject,
          scheduledFor,
          recipient: {
            id: creatorId,
            email: creatorRow.email,
            name: `${creatorRow.first_name} ${creatorRow.last_name}`,
          },
        },
      })
    })
  },
})

// =============================================================================
// Export All Tools
// =============================================================================

/**
 * All creator tools for registration
 */
export const creatorTools: ToolDefinition[] = [
  // Creator Management
  listCreatorsTool,
  getCreatorTool,
  searchCreatorsTool,
  updateCreatorTool,
  approveCreatorTool,
  rejectCreatorTool,
  // Projects
  listProjectsTool,
  getProjectTool,
  createProjectTool,
  updateProjectTool,
  updateProjectStatusTool,
  // Payouts
  listPayoutsTool,
  getPayoutTool,
  getCreatorBalanceTool,
  initiatePayoutTool,
  getPayoutHistoryTool,
  // Communications
  sendCreatorEmailTool,
  listCreatorCommunicationsTool,
  scheduleReminderTool,
]

export default creatorTools
