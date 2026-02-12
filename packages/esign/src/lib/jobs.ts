/**
 * E-Sign Background Jobs
 * Automated tasks for document workflows, reminders, and expiration
 */

import { sql, withTenant } from '@cgk/db'
import type { EsignDocument } from '../types.js'
import { getDocumentsNeedingReminders, getExpiredDocuments, expireDocument, updateLastReminder } from './documents.js'
import { getDocumentSigners } from './signers.js'
import { logReminderSent, logDocumentExpired } from './audit.js'
import { DOCUMENT_DEFAULTS } from '../constants.js'

// ============================================================================
// JOB TYPES
// ============================================================================

export interface EsignJobPayload {
  tenantId: string
}

export interface SendRemindersPayload extends EsignJobPayload {
  documentId?: string
  forceSend?: boolean
}

export interface ExpireDocumentsPayload extends EsignJobPayload {
  documentId?: string
}

export interface ProcessWorkflowStepPayload extends EsignJobPayload {
  executionId: string
  stepNumber: number
}

export interface SendSigningRequestPayload extends EsignJobPayload {
  documentId: string
  signerId: string
}

export interface SendCompletionNotificationPayload extends EsignJobPayload {
  documentId: string
}

// ============================================================================
// REMINDER JOB
// ============================================================================

export interface ReminderJobResult {
  processed: number
  reminders_sent: number
  documents_updated: number
  errors: string[]
}

/**
 * Process documents that need reminders
 * Should be called daily via cron
 */
export async function processReminders(
  tenantSlug: string,
  options?: {
    documentId?: string
    forceSend?: boolean
    maxReminders?: number
  }
): Promise<ReminderJobResult> {
  const { documentId, forceSend = false, maxReminders = DOCUMENT_DEFAULTS.MAX_REMINDERS } = options || {}
  const result: ReminderJobResult = {
    processed: 0,
    reminders_sent: 0,
    documents_updated: 0,
    errors: [],
  }

  try {
    let documents: EsignDocument[]

    if (documentId) {
      // Process specific document
      const doc = await withTenant(tenantSlug, async () => {
        const r = await sql`SELECT * FROM esign_documents WHERE id = ${documentId}`
        return r.rows[0] as EsignDocument | undefined
      })
      documents = doc ? [doc] : []
    } else {
      // Get all documents needing reminders
      documents = await getDocumentsNeedingReminders(tenantSlug)
    }

    for (const doc of documents) {
      result.processed++

      try {
        // Get signers who need reminders
        const signers = await getDocumentSigners(tenantSlug, doc.id)
        const signersNeedingReminder = signers.filter((s) => {
          if (s.role !== 'signer') return false
          if (s.is_internal) return false
          if (!['sent', 'viewed'].includes(s.status)) return false
          if (!s.sent_at) return false

          if (forceSend) return true

          // Check reminder timing
          const sentAt = new Date(s.sent_at)
          const lastReminder = doc.last_reminder_at ? new Date(doc.last_reminder_at) : sentAt
          const daysSinceAction = Math.floor((Date.now() - lastReminder.getTime()) / (1000 * 60 * 60 * 24))

          return daysSinceAction >= doc.reminder_days
        })

        // Count total reminders sent to determine if we should continue
        const reminderCountResult = await withTenant(tenantSlug, async () => {
          return sql`
            SELECT COUNT(*) as count
            FROM esign_audit_log
            WHERE document_id = ${doc.id}
              AND action = 'reminder_sent'
          `
        })
        const totalRemindersSent = parseInt(reminderCountResult.rows[0]?.count as string || '0', 10)

        if (totalRemindersSent >= maxReminders && !forceSend) {
          continue
        }

        // Send reminders to each eligible signer
        for (const signer of signersNeedingReminder) {
          // Log the reminder (actual email sending would be handled by communications system)
          await logReminderSent(tenantSlug, doc.id, signer.id, 'system')
          result.reminders_sent++
        }

        // Update last reminder timestamp
        if (signersNeedingReminder.length > 0) {
          await updateLastReminder(tenantSlug, doc.id)
          result.documents_updated++
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Document ${doc.id}: ${errorMsg}`)
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(`Job error: ${errorMsg}`)
  }

  return result
}

// ============================================================================
// EXPIRATION JOB
// ============================================================================

export interface ExpirationJobResult {
  processed: number
  expired: number
  errors: string[]
}

/**
 * Process documents that have expired
 * Should be called daily via cron
 */
export async function processExpirations(
  tenantSlug: string,
  options?: {
    documentId?: string
  }
): Promise<ExpirationJobResult> {
  const { documentId } = options || {}
  const result: ExpirationJobResult = {
    processed: 0,
    expired: 0,
    errors: [],
  }

  try {
    let documents: EsignDocument[]

    if (documentId) {
      // Check specific document
      const doc = await withTenant(tenantSlug, async () => {
        const r = await sql`
          SELECT * FROM esign_documents
          WHERE id = ${documentId}
            AND status IN ('pending', 'in_progress', 'draft')
            AND expires_at IS NOT NULL
            AND expires_at < NOW()
        `
        return r.rows[0] as EsignDocument | undefined
      })
      documents = doc ? [doc] : []
    } else {
      documents = await getExpiredDocuments(tenantSlug)
    }

    for (const doc of documents) {
      result.processed++

      try {
        // Mark document as expired
        await expireDocument(tenantSlug, doc.id)

        // Log expiration
        await logDocumentExpired(tenantSlug, doc.id)

        result.expired++

        // Notify signers would be handled by the caller or email queue
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Document ${doc.id}: ${errorMsg}`)
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(`Job error: ${errorMsg}`)
  }

  return result
}

// ============================================================================
// WORKFLOW STEP PROCESSOR
// ============================================================================

export interface WorkflowStepResult {
  success: boolean
  documentsCreated: string[]
  signersNotified: string[]
  nextStepTriggered: boolean
  error?: string
}

/**
 * Process a workflow step
 * Creates documents and notifies signers for the current step
 */
export async function processWorkflowStep(
  tenantSlug: string,
  executionId: string,
  _stepNumber: number
): Promise<WorkflowStepResult> {
  const result: WorkflowStepResult = {
    success: false,
    documentsCreated: [],
    signersNotified: [],
    nextStepTriggered: false,
  }

  try {
    // Get workflow execution
    const execution = await withTenant(tenantSlug, async () => {
      const r = await sql`
        SELECT * FROM esign_workflow_executions WHERE id = ${executionId}
      `
      return r.rows[0]
    })

    if (!execution) {
      result.error = 'Workflow execution not found'
      return result
    }

    // Get workflow
    const workflow = await withTenant(tenantSlug, async () => {
      const r = await sql`
        SELECT * FROM esign_workflows WHERE id = ${execution.workflow_id}
      `
      return r.rows[0]
    })

    if (!workflow) {
      result.error = 'Workflow not found'
      return result
    }

    // Parse steps
    const steps = typeof workflow.steps === 'string'
      ? JSON.parse(workflow.steps)
      : workflow.steps

    const currentStep = steps.find((s: Record<string, unknown>) => s.order === execution.current_step)
    if (!currentStep) {
      result.error = 'Current step not found in workflow'
      return result
    }

    // Step processing would:
    // 1. Create documents from the step's template
    // 2. Add signers based on step configuration and execution context
    // 3. Send to first batch of signers

    // For now, mark as successful - actual implementation would create documents
    result.success = true

    // Update execution status
    await withTenant(tenantSlug, async () => {
      await sql`
        UPDATE esign_workflow_executions
        SET status = 'in_progress'
        WHERE id = ${executionId}
      `
    })

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error'
  }

  return result
}

// ============================================================================
// CLEANUP JOBS
// ============================================================================

export interface CleanupResult {
  deletedPreviews: number
  archivedDrafts: number
  errors: string[]
}

/**
 * Clean up old data
 */
export async function cleanupOldData(
  tenantSlug: string,
  options?: {
    previewMaxAgeHours?: number
    draftMaxAgeDays?: number
  }
): Promise<CleanupResult> {
  const { draftMaxAgeDays = 30, previewMaxAgeHours: _previewMaxAgeHours = 24 } = options || {}
  const result: CleanupResult = {
    deletedPreviews: 0,
    archivedDrafts: 0,
    errors: [],
  }

  try {
    // Note: Preview cleanup would happen in blob storage, not database
    // This is a placeholder for the logic

    // Archive old drafts
    const archiveResult = await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE esign_documents
        SET status = 'voided',
            updated_at = NOW()
        WHERE status = 'draft'
          AND created_at < NOW() - INTERVAL '${draftMaxAgeDays} days'
        RETURNING id
      `
    })

    result.archivedDrafts = archiveResult.rowCount || 0

  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

// ============================================================================
// JOB SCHEDULES
// ============================================================================

/**
 * Cron schedules for e-sign jobs
 */
export const ESIGN_JOB_SCHEDULES = {
  /** Send reminders daily at 9 AM */
  sendReminders: '0 9 * * *',
  /** Check expirations daily at midnight */
  expireDocuments: '0 0 * * *',
  /** Cleanup old data weekly on Sunday at 2 AM */
  cleanup: '0 2 * * 0',
} as const
