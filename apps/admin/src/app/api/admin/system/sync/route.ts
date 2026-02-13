/**
 * System Sync API Routes
 * GET: Get sync operation preview
 * POST: Execute sync operation
 */

import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import { withTenant, sql } from '@cgk-platform/db'
import { NextResponse } from 'next/server'

import {
  createSyncOperation,
  logChange,
  updateSyncOperation,
} from '@/lib/admin-utilities/db'
import type { SyncOperationType } from '@/lib/admin-utilities/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SyncPreview {
  operationType: SyncOperationType
  itemsToProcess: number
  details: Record<string, unknown>
}

// Get preview data for a sync operation
async function getOperationPreview(
  tenantSlug: string,
  operationType: SyncOperationType
): Promise<SyncPreview> {
  return withTenant(tenantSlug, async () => {
    switch (operationType) {
      case 'commission_balance_sync': {
        // Find commissions without corresponding balance transactions
        const result = await sql`
          SELECT COUNT(*) as count
          FROM orders o
          WHERE o.commission_amount > 0
          AND NOT EXISTS (
            SELECT 1 FROM balance_transactions bt
            WHERE bt.reference_id = o.id
            AND bt.type = 'commission'
          )
        `
        return {
          operationType,
          itemsToProcess: Number(result.rows[0]?.count || 0),
          details: { type: 'Missing commission balance entries' },
        }
      }

      case 'project_payment_sync': {
        // Find project payments without balance transactions
        const result = await sql`
          SELECT COUNT(*) as count
          FROM project_payments pp
          WHERE pp.status = 'paid'
          AND NOT EXISTS (
            SELECT 1 FROM balance_transactions bt
            WHERE bt.reference_id = pp.id
            AND bt.type = 'project_payment'
          )
        `
        return {
          operationType,
          itemsToProcess: Number(result.rows[0]?.count || 0),
          details: { type: 'Missing project payment balance entries' },
        }
      }

      case 'conversation_merge': {
        // Find duplicate conversations by email/phone
        const result = await sql`
          SELECT COUNT(DISTINCT email) as duplicate_emails
          FROM conversations
          WHERE email IS NOT NULL
          GROUP BY email
          HAVING COUNT(*) > 1
        `
        return {
          operationType,
          itemsToProcess: Number(result.rows[0]?.duplicate_emails || 0),
          details: { type: 'Duplicate conversation groups by email' },
        }
      }

      case 'mature_commissions': {
        // Find pending commissions past 30-day hold
        const result = await sql`
          SELECT COUNT(*) as count
          FROM balance_transactions
          WHERE type = 'commission'
          AND status = 'pending'
          AND created_at < NOW() - INTERVAL '30 days'
        `
        return {
          operationType,
          itemsToProcess: Number(result.rows[0]?.count || 0),
          details: { type: 'Pending commissions past 30-day hold period' },
        }
      }

      default:
        return {
          operationType,
          itemsToProcess: 0,
          details: { error: 'Unknown operation type' },
        }
    }
  })
}

// Execute a sync operation
async function executeOperation(
  tenantSlug: string,
  operationType: SyncOperationType
): Promise<{ processed: number; errors: number; details: Record<string, unknown> }> {
  return withTenant(tenantSlug, async () => {
    switch (operationType) {
      case 'commission_balance_sync': {
        // Create balance transactions for missing commissions
        const result = await sql`
          INSERT INTO balance_transactions (
            creator_id, type, amount, status, reference_id, reference_type, description
          )
          SELECT
            o.creator_id,
            'commission',
            o.commission_amount,
            'pending',
            o.id,
            'order',
            'Commission from order #' || o.order_number
          FROM orders o
          WHERE o.commission_amount > 0
          AND o.creator_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM balance_transactions bt
            WHERE bt.reference_id = o.id
            AND bt.type = 'commission'
          )
          RETURNING id
        `
        return {
          processed: result.rowCount || 0,
          errors: 0,
          details: { created: result.rowCount },
        }
      }

      case 'project_payment_sync': {
        const result = await sql`
          INSERT INTO balance_transactions (
            creator_id, type, amount, status, reference_id, reference_type, description
          )
          SELECT
            pp.creator_id,
            'project_payment',
            pp.amount,
            'available',
            pp.id,
            'project_payment',
            'Payment for project'
          FROM project_payments pp
          WHERE pp.status = 'paid'
          AND pp.creator_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM balance_transactions bt
            WHERE bt.reference_id = pp.id
            AND bt.type = 'project_payment'
          )
          RETURNING id
        `
        return {
          processed: result.rowCount || 0,
          errors: 0,
          details: { created: result.rowCount },
        }
      }

      case 'conversation_merge': {
        // This would be a more complex operation in reality
        // For now, just return a simulated result
        return {
          processed: 0,
          errors: 0,
          details: { message: 'Conversation merge not implemented in this version' },
        }
      }

      case 'mature_commissions': {
        const result = await sql`
          UPDATE balance_transactions
          SET status = 'available', updated_at = NOW()
          WHERE type = 'commission'
          AND status = 'pending'
          AND created_at < NOW() - INTERVAL '30 days'
          RETURNING id
        `
        return {
          processed: result.rowCount || 0,
          errors: 0,
          details: { matured: result.rowCount },
        }
      }

      default:
        return {
          processed: 0,
          errors: 1,
          details: { error: 'Unknown operation type' },
        }
    }
  })
}

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const operationType = searchParams.get('operation') as SyncOperationType | null

  if (!operationType) {
    // Return previews for all operations
    const operations: SyncOperationType[] = [
      'commission_balance_sync',
      'project_payment_sync',
      'conversation_merge',
      'mature_commissions',
    ]

    try {
      const previews = await Promise.all(
        operations.map((op) => getOperationPreview(tenantId, op))
      )

      return NextResponse.json({ previews })
    } catch (error) {
      console.error('Failed to get sync previews:', error)
      return NextResponse.json({ error: 'Failed to get previews' }, { status: 500 })
    }
  }

  try {
    const preview = await getOperationPreview(tenantId, operationType)
    return NextResponse.json({ preview })
  } catch (error) {
    console.error('Failed to get sync preview:', error)
    return NextResponse.json({ error: 'Failed to get preview' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { tenantId, userId, email } = await requireAuth(req)

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { operation, runAll } = body as {
      operation?: SyncOperationType
      runAll?: boolean
    }

    const operations: SyncOperationType[] = runAll
      ? ['commission_balance_sync', 'project_payment_sync', 'conversation_merge', 'mature_commissions']
      : operation
        ? [operation]
        : []

    if (operations.length === 0) {
      return NextResponse.json(
        { error: 'No operation specified' },
        { status: 400 }
      )
    }

    const results = []

    for (const op of operations) {
      // Create sync operation record
      const syncOp = await createSyncOperation(tenantId, {
        operationType: op,
        status: 'running',
        runBy: email || userId,
      })

      try {
        // Execute the operation
        const result = await executeOperation(tenantId, op)

        // Update with success
        await updateSyncOperation(tenantId, syncOp.id, {
          status: 'success',
          resultData: result,
        })

        // Log the change
        await logChange(tenantId, {
          source: 'admin',
          action: 'sync',
          entityType: 'sync_operation',
          entityId: syncOp.id,
          summary: `Ran ${op}: processed ${result.processed} items`,
          details: result,
          userId,
          userEmail: email,
        })

        results.push({
          operation: op,
          status: 'success',
          ...result,
        })
      } catch (error) {
        // Update with error
        await updateSyncOperation(tenantId, syncOp.id, {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })

        results.push({
          operation: op,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Failed to run sync operation:', error)
    return NextResponse.json({ error: 'Failed to run sync' }, { status: 500 })
  }
}
