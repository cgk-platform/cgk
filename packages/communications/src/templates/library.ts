/**
 * Template Library Aggregation
 *
 * Provides aggregated views of all email templates across the platform,
 * organized by category/function. Used by the central template library UI.
 *
 * @ai-pattern template-library
 * @ai-note This is read-only aggregation - editing happens in per-function editors
 */

import { sql, withTenant } from '@cgk/db'

import { getAllDefaultTemplates } from './defaults.js'
import type { TemplateCategory } from './types.js'

/**
 * Template info for library display
 */
export interface TemplateLibraryItem {
  notificationType: string
  templateKey: string
  displayName: string
  description: string | null
  category: TemplateCategory
  isCustom: boolean
  lastEditedAt: Date | null
  lastEditedBy: string | null
  lastEditedByName: string | null
  sendCount30d: number
}

/**
 * Template category with editor path mapping
 */
export interface TemplateLibraryCategory {
  name: string
  slug: string
  editorPath: string
  description: string
  templates: TemplateLibraryItem[]
}

/**
 * Template library response
 */
export interface TemplateLibraryResponse {
  categories: TemplateLibraryCategory[]
  totals: {
    total: number
    custom: number
    default: number
  }
}

/**
 * Template analytics for a single template
 */
export interface TemplateAnalyticsItem {
  notificationType: string
  templateKey: string
  displayName: string
  sends: number
  openRate: number
  clickRate: number
  bounceRate: number
}

/**
 * Trend data point for analytics
 */
export interface TrendDataPoint {
  date: string
  sends: number
  opens: number
  clicks: number
}

/**
 * Template analytics response
 */
export interface TemplateAnalyticsResponse {
  period: '7d' | '30d' | '90d'
  summary: {
    totalSends: number
    avgOpenRate: number
    avgClickRate: number
    avgBounceRate: number
  }
  byTemplate: TemplateAnalyticsItem[]
  trends: TrendDataPoint[]
}

/**
 * Category to editor path mapping
 */
const CATEGORY_MAPPINGS: Record<
  string,
  { name: string; editorPath: string; description: string }
> = {
  review: {
    name: 'Reviews',
    editorPath: '/admin/commerce/reviews/settings',
    description: 'Review request and thank you emails',
  },
  creator: {
    name: 'Creators',
    editorPath: '/admin/creators/communications/templates',
    description: 'Creator onboarding, projects, and payments',
  },
  esign: {
    name: 'E-Sign',
    editorPath: '/admin/settings/esign/templates',
    description: 'Document signing notifications',
  },
  subscription: {
    name: 'Subscriptions',
    editorPath: '/admin/commerce/subscriptions/emails',
    description: 'Subscription lifecycle emails',
  },
  treasury: {
    name: 'Treasury',
    editorPath: '/admin/treasury/settings',
    description: 'Treasury approval requests',
  },
  team: {
    name: 'Team',
    editorPath: '/admin/settings/team',
    description: 'Team invitations',
  },
  auth: {
    name: 'Authentication',
    editorPath: '/admin/settings/notifications',
    description: 'Password reset and magic links',
  },
}

/**
 * Get notification type prefix to category mapping
 */
function getCategoryForNotificationType(notificationType: string): string {
  if (notificationType.startsWith('review_')) return 'review'
  if (notificationType.startsWith('creator_')) return 'creator'
  if (notificationType.startsWith('esign_')) return 'esign'
  if (notificationType.startsWith('subscription_')) return 'subscription'
  if (notificationType.startsWith('treasury_')) return 'treasury'
  if (notificationType.startsWith('team_')) return 'team'
  if (
    notificationType === 'password_reset' ||
    notificationType === 'magic_link'
  ) {
    return 'auth'
  }
  return 'other'
}

/**
 * Get all templates aggregated by category for the library view
 */
export async function getTemplateLibrary(
  tenantSlug: string
): Promise<TemplateLibraryResponse> {
  // Get all default templates
  const defaults = getAllDefaultTemplates()

  // Get tenant's custom templates
  const customTemplates = await withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        t.notification_type,
        t.template_key,
        t.name,
        t.description,
        t.category,
        t.is_default,
        t.last_edited_at,
        t.last_edited_by,
        u.name as last_edited_by_name
      FROM email_templates t
      LEFT JOIN users u ON t.last_edited_by = u.id
      ORDER BY t.notification_type, t.template_key
    `
    return result.rows
  })

  // Create a map of custom templates for quick lookup
  const customMap = new Map<string, (typeof customTemplates)[0]>()
  for (const template of customTemplates) {
    const key = `${template.notification_type}:${template.template_key}`
    customMap.set(key, template)
  }

  // Get send counts from email queues (last 30 days)
  const sendCounts = await getTemplateSendCounts(tenantSlug, 30)

  // Build the library items
  const categoryMap = new Map<string, TemplateLibraryItem[]>()
  let totalCustom = 0
  let totalDefault = 0

  for (const defaultTemplate of defaults) {
    const categorySlug = getCategoryForNotificationType(
      defaultTemplate.notificationType
    )
    const key = `${defaultTemplate.notificationType}:${defaultTemplate.templateKey}`
    const customTemplate = customMap.get(key)

    const isCustom = customTemplate ? !customTemplate.is_default : false
    if (isCustom) {
      totalCustom++
    } else {
      totalDefault++
    }

    const item: TemplateLibraryItem = {
      notificationType: defaultTemplate.notificationType,
      templateKey: defaultTemplate.templateKey,
      displayName: customTemplate
        ? (customTemplate.name as string)
        : defaultTemplate.name,
      description: customTemplate
        ? (customTemplate.description as string | null)
        : defaultTemplate.description,
      category: defaultTemplate.category,
      isCustom,
      lastEditedAt: customTemplate?.last_edited_at
        ? new Date(customTemplate.last_edited_at as string)
        : null,
      lastEditedBy: customTemplate
        ? (customTemplate.last_edited_by as string | null)
        : null,
      lastEditedByName: customTemplate
        ? (customTemplate.last_edited_by_name as string | null)
        : null,
      sendCount30d: sendCounts.get(key) || 0,
    }

    if (!categoryMap.has(categorySlug)) {
      categoryMap.set(categorySlug, [])
    }
    categoryMap.get(categorySlug)!.push(item)
  }

  // Build categories array
  const categories: TemplateLibraryCategory[] = []
  const categoryEntries = Array.from(categoryMap.entries())
  for (const [slug, templates] of categoryEntries) {
    const mapping = CATEGORY_MAPPINGS[slug] || {
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      editorPath: '/admin/settings/notifications',
      description: 'System notifications',
    }

    categories.push({
      name: mapping.name,
      slug,
      editorPath: mapping.editorPath,
      description: mapping.description,
      templates: templates.sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      ),
    })
  }

  // Sort categories by name
  categories.sort((a, b) => a.name.localeCompare(b.name))

  return {
    categories,
    totals: {
      total: totalCustom + totalDefault,
      custom: totalCustom,
      default: totalDefault,
    },
  }
}

/**
 * Get send counts per template from all email queues
 */
async function getTemplateSendCounts(
  tenantSlug: string,
  days: number
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()

  await withTenant(tenantSlug, async () => {
    // Review queue
    try {
      const reviewResult = await sql`
        SELECT
          COALESCE(template_type, 'review_request') as notification_type,
          'review_request' as template_key,
          COUNT(*) FILTER (WHERE status = 'sent') as send_count
        FROM review_email_queue
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * ${days}
        GROUP BY template_type
      `
      for (const row of reviewResult.rows) {
        const key = `${row.notification_type}:${row.template_key}`
        counts.set(key, Number(row.send_count) || 0)
      }
    } catch {
      // Table might not exist
    }

    // Creator queue
    try {
      const creatorResult = await sql`
        SELECT
          notification_type,
          COUNT(*) FILTER (WHERE status = 'sent') as send_count
        FROM creator_email_queue
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * ${days}
        GROUP BY notification_type
      `
      for (const row of creatorResult.rows) {
        const key = `${row.notification_type}:${row.notification_type}`
        counts.set(key, Number(row.send_count) || 0)
      }
    } catch {
      // Table might not exist
    }

    // Subscription queue
    try {
      const subResult = await sql`
        SELECT
          notification_type,
          COUNT(*) FILTER (WHERE status = 'sent') as send_count
        FROM subscription_email_queue
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * ${days}
        GROUP BY notification_type
      `
      for (const row of subResult.rows) {
        const key = `${row.notification_type}:${row.notification_type}`
        counts.set(key, Number(row.send_count) || 0)
      }
    } catch {
      // Table might not exist
    }
  })

  return counts
}

/**
 * Get template analytics for the analytics page
 */
export async function getTemplateAnalytics(
  tenantSlug: string,
  period: '7d' | '30d' | '90d'
): Promise<TemplateAnalyticsResponse> {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90

  // Get send counts and stats
  const stats = await getTemplateStatsForPeriod(tenantSlug, days)
  const trends = await getTemplateTrends(tenantSlug, days)

  // Calculate summary
  const totalSends = stats.reduce((sum, s) => sum + s.sends, 0)
  const avgOpenRate =
    stats.length > 0
      ? stats.reduce((sum, s) => sum + s.openRate, 0) / stats.length
      : 0
  const avgClickRate =
    stats.length > 0
      ? stats.reduce((sum, s) => sum + s.clickRate, 0) / stats.length
      : 0
  const avgBounceRate =
    stats.length > 0
      ? stats.reduce((sum, s) => sum + s.bounceRate, 0) / stats.length
      : 0

  return {
    period,
    summary: {
      totalSends,
      avgOpenRate: Math.round(avgOpenRate * 100) / 100,
      avgClickRate: Math.round(avgClickRate * 100) / 100,
      avgBounceRate: Math.round(avgBounceRate * 100) / 100,
    },
    byTemplate: stats,
    trends,
  }
}

/**
 * Get template stats for a period
 */
async function getTemplateStatsForPeriod(
  tenantSlug: string,
  days: number
): Promise<TemplateAnalyticsItem[]> {
  const defaults = getAllDefaultTemplates()
  const sendCounts = await getTemplateSendCounts(tenantSlug, days)

  // For now, we return send counts. Open/click/bounce rates would come from
  // Resend webhook events if tracking is enabled.
  const items: TemplateAnalyticsItem[] = []

  for (const template of defaults) {
    const key = `${template.notificationType}:${template.templateKey}`
    const sends = sendCounts.get(key) || 0

    if (sends > 0) {
      items.push({
        notificationType: template.notificationType,
        templateKey: template.templateKey,
        displayName: template.name,
        sends,
        // These would be populated from Resend webhook data if available
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
      })
    }
  }

  // Sort by sends descending
  items.sort((a, b) => b.sends - a.sends)

  return items
}

/**
 * Get trend data for analytics charts
 */
async function getTemplateTrends(
  tenantSlug: string,
  days: number
): Promise<TrendDataPoint[]> {
  const trends: TrendDataPoint[] = []

  await withTenant(tenantSlug, async () => {
    try {
      // Get daily sends from review queue as example
      const result = await sql`
        SELECT
          DATE(sent_at) as date,
          COUNT(*) as sends
        FROM review_email_queue
        WHERE status = 'sent'
          AND sent_at >= CURRENT_DATE - INTERVAL '1 day' * ${days}
        GROUP BY DATE(sent_at)
        ORDER BY date ASC
      `

      for (const row of result.rows) {
        trends.push({
          date: String(row.date),
          sends: Number(row.sends) || 0,
          // Opens and clicks would come from Resend webhooks
          opens: 0,
          clicks: 0,
        })
      }
    } catch {
      // Table might not exist
    }
  })

  return trends
}

/**
 * Get editor path for a specific template
 */
export function getTemplateEditorPath(notificationType: string): string {
  const categorySlug = getCategoryForNotificationType(notificationType)
  const mapping = CATEGORY_MAPPINGS[categorySlug]
  return mapping?.editorPath || '/admin/settings/notifications'
}

/**
 * Search templates across all categories
 */
export async function searchTemplates(
  tenantSlug: string,
  query: string
): Promise<TemplateLibraryItem[]> {
  const library = await getTemplateLibrary(tenantSlug)
  const queryLower = query.toLowerCase()

  const results: TemplateLibraryItem[] = []

  for (const category of library.categories) {
    for (const template of category.templates) {
      if (
        template.displayName.toLowerCase().includes(queryLower) ||
        template.notificationType.toLowerCase().includes(queryLower) ||
        template.templateKey.toLowerCase().includes(queryLower) ||
        (template.description &&
          template.description.toLowerCase().includes(queryLower))
      ) {
        results.push(template)
      }
    }
  }

  return results
}

/**
 * Filter templates by custom/default status
 */
export async function filterTemplatesByStatus(
  tenantSlug: string,
  status: 'all' | 'custom' | 'default'
): Promise<TemplateLibraryCategory[]> {
  const library = await getTemplateLibrary(tenantSlug)

  if (status === 'all') {
    return library.categories
  }

  const isCustom = status === 'custom'

  return library.categories
    .map((category) => ({
      ...category,
      templates: category.templates.filter((t) => t.isCustom === isCustom),
    }))
    .filter((category) => category.templates.length > 0)
}
