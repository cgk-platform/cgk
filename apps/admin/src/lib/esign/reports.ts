/**
 * E-Signature Reports & Analytics Data Layer
 *
 * Functions for generating e-signature reports and statistics.
 */

import { sql, withTenant } from '@cgk/db'
import type {
  EsignDashboardStats,
  EsignReportData,
  EsignDocumentWithSigners,
  EsignDocumentStatus,
} from './types'

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(
  tenantSlug: string,
  _adminEmail: string
): Promise<EsignDashboardStats> {
  return withTenant(tenantSlug, async () => {
    // Pending signatures (documents waiting for any signer)
    const pendingResult = await sql`
      SELECT COUNT(DISTINCT d.id) as count
      FROM esign_documents d
      WHERE d.status = 'pending'
    `
    const pendingSignatures = Number(pendingResult.rows[0]?.count || 0)

    // In progress (partially signed)
    const inProgressResult = await sql`
      SELECT COUNT(*) as count
      FROM esign_documents
      WHERE status = 'in_progress'
    `
    const inProgress = Number(inProgressResult.rows[0]?.count || 0)

    // Completed this month
    const completedResult = await sql`
      SELECT COUNT(*) as count
      FROM esign_documents
      WHERE status = 'completed'
        AND completed_at >= date_trunc('month', NOW())
    `
    const completedThisMonth = Number(completedResult.rows[0]?.count || 0)

    // Counter-sign queue (documents awaiting internal signature)
    const counterSignResult = await sql`
      SELECT COUNT(DISTINCT d.id) as count
      FROM esign_documents d
      JOIN esign_signers s ON s.document_id = d.id
      WHERE s.is_internal = true
        AND s.status = 'pending'
        AND d.status IN ('pending', 'in_progress')
        AND NOT EXISTS (
          SELECT 1 FROM esign_signers prev
          WHERE prev.document_id = d.id
            AND prev.signing_order < s.signing_order
            AND prev.status NOT IN ('signed')
        )
    `
    const counterSignQueue = Number(counterSignResult.rows[0]?.count || 0)

    // Documents by status
    const statusResult = await sql`
      SELECT status, COUNT(*) as count
      FROM esign_documents
      GROUP BY status
    `
    const documentsByStatus: Record<EsignDocumentStatus, number> = {
      draft: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      declined: 0,
      voided: 0,
      expired: 0,
    }
    for (const row of statusResult.rows) {
      documentsByStatus[row.status as EsignDocumentStatus] = Number(row.count)
    }

    // Completion rate (last 30 days)
    const rateResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status IN ('completed', 'declined', 'expired', 'voided')) as total
      FROM esign_documents
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `
    const completed = Number(rateResult.rows[0]?.completed || 0)
    const total = Number(rateResult.rows[0]?.total || 0)
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    // Average time to complete (in hours)
    const timeResult = await sql`
      SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) as avg_hours
      FROM esign_documents
      WHERE status = 'completed'
        AND completed_at IS NOT NULL
        AND created_at >= NOW() - INTERVAL '30 days'
    `
    const avgTimeToComplete = Math.round(Number(timeResult.rows[0]?.avg_hours || 0) * 10) / 10

    // Recent documents
    const recentResult = await sql`
      SELECT
        d.id,
        d.template_id as "templateId",
        d.creator_id as "creatorId",
        d.name,
        d.file_url as "fileUrl",
        d.signed_file_url as "signedFileUrl",
        d.status,
        d.expires_at as "expiresAt",
        d.created_by as "createdBy",
        d.created_at as "createdAt",
        d.updated_at as "updatedAt",
        d.completed_at as "completedAt",
        t.name as "templateName"
      FROM esign_documents d
      LEFT JOIN esign_templates t ON t.id = d.template_id
      ORDER BY d.created_at DESC
      LIMIT 5
    `

    const recentDocuments: EsignDocumentWithSigners[] = []
    for (const row of recentResult.rows) {
      const signerResult = await sql`
        SELECT id, name, email, status, signing_order as "signingOrder"
        FROM esign_signers
        WHERE document_id = ${row.id}
        ORDER BY signing_order ASC
      `
      recentDocuments.push({
        ...(row as unknown as EsignDocumentWithSigners),
        signers: signerResult.rows as unknown as EsignDocumentWithSigners['signers'],
      })
    }

    return {
      pendingSignatures,
      inProgress,
      completedThisMonth,
      counterSignQueue,
      documentsByStatus,
      completionRate,
      avgTimeToComplete,
      recentDocuments,
    }
  })
}

/**
 * Get detailed report data
 */
export async function getReportData(
  tenantSlug: string,
  options: {
    startDate: Date
    endDate: Date
    templateId?: string
  }
): Promise<EsignReportData> {
  return withTenant(tenantSlug, async (): Promise<EsignReportData> => {
    const startDateStr = options.startDate.toISOString()
    const endDateStr = options.endDate.toISOString()
    const templateId = options.templateId ?? null

    // Documents sent in period
    const sentResult = templateId
      ? await sql`
          SELECT COUNT(*) as count
          FROM esign_documents
          WHERE created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
            AND template_id = ${templateId}
        `
      : await sql`
          SELECT COUNT(*) as count
          FROM esign_documents
          WHERE created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
        `
    const documentsSent = Number(sentResult.rows[0]?.count || 0)

    // Completion rate
    const rateResult = templateId
      ? await sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status IN ('completed', 'declined', 'expired', 'voided')) as resolved
          FROM esign_documents
          WHERE created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
            AND template_id = ${templateId}
        `
      : await sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status IN ('completed', 'declined', 'expired', 'voided')) as resolved
          FROM esign_documents
          WHERE created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
        `
    const completedCount = Number(rateResult.rows[0]?.completed || 0)
    const resolvedCount = Number(rateResult.rows[0]?.resolved || 0)
    const completionRate = resolvedCount > 0 ? Math.round((completedCount / resolvedCount) * 100) : 0

    // Decline rate
    const declineResult = templateId
      ? await sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'declined') as declined,
            COUNT(*) as total
          FROM esign_documents
          WHERE created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
            AND template_id = ${templateId}
        `
      : await sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'declined') as declined,
            COUNT(*) as total
          FROM esign_documents
          WHERE created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
        `
    const declinedCount = Number(declineResult.rows[0]?.declined || 0)
    const totalCount = Number(declineResult.rows[0]?.total || 0)
    const declineRate = totalCount > 0 ? Math.round((declinedCount / totalCount) * 100) : 0

    // Expiration rate
    const expireResult = templateId
      ? await sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'expired') as expired,
            COUNT(*) as total
          FROM esign_documents
          WHERE created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
            AND template_id = ${templateId}
        `
      : await sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'expired') as expired,
            COUNT(*) as total
          FROM esign_documents
          WHERE created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
        `
    const expiredCount = Number(expireResult.rows[0]?.expired || 0)
    const expireTotal = Number(expireResult.rows[0]?.total || 0)
    const expirationRate = expireTotal > 0 ? Math.round((expiredCount / expireTotal) * 100) : 0

    // Average time to complete
    const timeResult = templateId
      ? await sql`
          SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) as avg_hours
          FROM esign_documents
          WHERE status = 'completed'
            AND completed_at IS NOT NULL
            AND created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
            AND template_id = ${templateId}
        `
      : await sql`
          SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) as avg_hours
          FROM esign_documents
          WHERE status = 'completed'
            AND completed_at IS NOT NULL
            AND created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
        `
    const avgTimeToComplete = Math.round(Number(timeResult.rows[0]?.avg_hours || 0) * 10) / 10

    // Top templates (not filtered by templateId since it shows top templates)
    const templatesResult = await sql`
      SELECT
        d.template_id as "templateId",
        t.name as "templateName",
        COUNT(*) as "documentCount"
      FROM esign_documents d
      LEFT JOIN esign_templates t ON t.id = d.template_id
      WHERE d.created_at >= ${startDateStr}
        AND d.created_at <= ${endDateStr}
        AND d.template_id IS NOT NULL
      GROUP BY d.template_id, t.name
      ORDER BY "documentCount" DESC
      LIMIT 5
    `

    // Documents by status
    const statusResult = templateId
      ? await sql`
          SELECT status, COUNT(*) as count
          FROM esign_documents
          WHERE created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
            AND template_id = ${templateId}
          GROUP BY status
        `
      : await sql`
          SELECT status, COUNT(*) as count
          FROM esign_documents
          WHERE created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
          GROUP BY status
        `
    const documentsByStatus: Record<EsignDocumentStatus, number> = {
      draft: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      declined: 0,
      voided: 0,
      expired: 0,
    }
    for (const row of statusResult.rows) {
      documentsByStatus[row.status as EsignDocumentStatus] = Number(row.count)
    }

    // Completion trend (daily)
    const trendResult = templateId
      ? await sql`
          SELECT
            DATE(created_at) as date,
            COUNT(*) as sent,
            COUNT(*) FILTER (WHERE status = 'completed') as completed
          FROM esign_documents
          WHERE created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
            AND template_id = ${templateId}
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `
      : await sql`
          SELECT
            DATE(created_at) as date,
            COUNT(*) as sent,
            COUNT(*) FILTER (WHERE status = 'completed') as completed
          FROM esign_documents
          WHERE created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `

    // Time to complete distribution
    const distributionResult = templateId
      ? await sql`
          SELECT
            CASE
              WHEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 < 1 THEN 'Under 1 hour'
              WHEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 < 4 THEN '1-4 hours'
              WHEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 < 24 THEN '4-24 hours'
              WHEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 < 72 THEN '1-3 days'
              WHEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 < 168 THEN '3-7 days'
              ELSE 'Over 7 days'
            END as bucket,
            COUNT(*) as count
          FROM esign_documents
          WHERE status = 'completed'
            AND completed_at IS NOT NULL
            AND created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
            AND template_id = ${templateId}
          GROUP BY bucket
          ORDER BY
            CASE bucket
              WHEN 'Under 1 hour' THEN 1
              WHEN '1-4 hours' THEN 2
              WHEN '4-24 hours' THEN 3
              WHEN '1-3 days' THEN 4
              WHEN '3-7 days' THEN 5
              ELSE 6
            END
        `
      : await sql`
          SELECT
            CASE
              WHEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 < 1 THEN 'Under 1 hour'
              WHEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 < 4 THEN '1-4 hours'
              WHEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 < 24 THEN '4-24 hours'
              WHEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 < 72 THEN '1-3 days'
              WHEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 < 168 THEN '3-7 days'
              ELSE 'Over 7 days'
            END as bucket,
            COUNT(*) as count
          FROM esign_documents
          WHERE status = 'completed'
            AND completed_at IS NOT NULL
            AND created_at >= ${startDateStr}
            AND created_at <= ${endDateStr}
          GROUP BY bucket
          ORDER BY
            CASE bucket
              WHEN 'Under 1 hour' THEN 1
              WHEN '1-4 hours' THEN 2
              WHEN '4-24 hours' THEN 3
              WHEN '1-3 days' THEN 4
              WHEN '3-7 days' THEN 5
              ELSE 6
            END
        `

    return {
      period: {
        start: options.startDate,
        end: options.endDate,
      },
      documentsSent,
      completionRate,
      avgTimeToComplete,
      declineRate,
      expirationRate,
      topTemplates: templatesResult.rows.map((r) => ({
        templateId: r.templateId as string,
        templateName: (r.templateName || 'Unknown') as string,
        documentCount: Number(r.documentCount),
      })),
      documentsByStatus,
      completionTrend: trendResult.rows.map((r) => ({
        date: (r.date as Date).toISOString().split('T')[0]!,
        sent: Number(r.sent),
        completed: Number(r.completed),
      })),
      timeToCompleteDistribution: distributionResult.rows.map((r) => ({
        bucket: r.bucket as string,
        count: Number(r.count),
      })),
    }
  })
}

/**
 * Export report data to CSV format
 */
export async function exportReportCsv(
  tenantSlug: string,
  options: {
    startDate: Date
    endDate: Date
    templateId?: string
  }
): Promise<string> {
  return withTenant(tenantSlug, async () => {
    const startDateStr = options.startDate.toISOString()
    const endDateStr = options.endDate.toISOString()
    const templateId = options.templateId ?? null

    const result = templateId
      ? await sql`
          SELECT
            d.id as "Document ID",
            d.name as "Document Name",
            t.name as "Template",
            d.status as "Status",
            d.created_at as "Sent Date",
            d.completed_at as "Completed Date",
            d.expires_at as "Expiration Date",
            (
              SELECT STRING_AGG(s.name || ' (' || s.email || ')', ', ')
              FROM esign_signers s
              WHERE s.document_id = d.id
            ) as "Signers",
            CASE
              WHEN d.status = 'completed' THEN
                ROUND(EXTRACT(EPOCH FROM (d.completed_at - d.created_at)) / 3600, 1)
              ELSE NULL
            END as "Hours to Complete"
          FROM esign_documents d
          LEFT JOIN esign_templates t ON t.id = d.template_id
          WHERE d.created_at >= ${startDateStr}
            AND d.created_at <= ${endDateStr}
            AND d.template_id = ${templateId}
          ORDER BY d.created_at DESC
        `
      : await sql`
          SELECT
            d.id as "Document ID",
            d.name as "Document Name",
            t.name as "Template",
            d.status as "Status",
            d.created_at as "Sent Date",
            d.completed_at as "Completed Date",
            d.expires_at as "Expiration Date",
            (
              SELECT STRING_AGG(s.name || ' (' || s.email || ')', ', ')
              FROM esign_signers s
              WHERE s.document_id = d.id
            ) as "Signers",
            CASE
              WHEN d.status = 'completed' THEN
                ROUND(EXTRACT(EPOCH FROM (d.completed_at - d.created_at)) / 3600, 1)
              ELSE NULL
            END as "Hours to Complete"
          FROM esign_documents d
          LEFT JOIN esign_templates t ON t.id = d.template_id
          WHERE d.created_at >= ${startDateStr}
            AND d.created_at <= ${endDateStr}
          ORDER BY d.created_at DESC
        `

    // Generate CSV
    if (result.rows.length === 0) {
      return 'No data found for the selected period'
    }

    const firstRow = result.rows[0]!
    const headers = Object.keys(firstRow)
    const csvRows = [headers.join(',')]

    for (const row of result.rows) {
      const values = headers.map((h) => {
        const val = row[h]
        if (val === null || val === undefined) return ''
        if (val instanceof Date) return val.toISOString()
        const str = String(val)
        // Escape quotes and wrap in quotes if contains comma
        if (str.includes(',') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      csvRows.push(values.join(','))
    }

    return csvRows.join('\n')
  })
}
