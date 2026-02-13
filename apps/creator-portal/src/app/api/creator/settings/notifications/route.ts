/**
 * Creator Notification Settings API Route
 *
 * GET /api/creator/settings/notifications - Fetch preferences
 * PATCH /api/creator/settings/notifications - Update preferences
 */

import { sql } from '@cgk-platform/db'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'
import type { NotificationSettings } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Fetch notification preferences
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
    // Try to get existing settings
    const result = await sql`
      SELECT * FROM creator_notification_settings
      WHERE creator_id = ${context.creatorId}
    `

    let settings: NotificationSettings

    if (result.rows[0]) {
      const row = result.rows[0]
      settings = {
        emailProjectAssigned: row.email_project_assigned as boolean,
        emailProjectUpdated: row.email_project_updated as boolean,
        emailMessageReceived: row.email_message_received as boolean,
        emailPaymentReceived: row.email_payment_received as boolean,
        emailDeadlineReminder: row.email_deadline_reminder as boolean,
        emailRevisionRequested: row.email_revision_requested as boolean,
        smsProjectAssigned: row.sms_project_assigned as boolean,
        smsProjectUpdated: row.sms_project_updated as boolean,
        smsMessageReceived: row.sms_message_received as boolean,
        smsPaymentReceived: row.sms_payment_received as boolean,
        smsDeadlineReminder: row.sms_deadline_reminder as boolean,
        smsRevisionRequested: row.sms_revision_requested as boolean,
      }
    } else {
      // Create default settings
      await sql`
        INSERT INTO creator_notification_settings (creator_id)
        VALUES (${context.creatorId})
      `

      // Return defaults
      settings = {
        emailProjectAssigned: true,
        emailProjectUpdated: true,
        emailMessageReceived: true,
        emailPaymentReceived: true,
        emailDeadlineReminder: true,
        emailRevisionRequested: true,
        smsProjectAssigned: false,
        smsProjectUpdated: false,
        smsMessageReceived: false,
        smsPaymentReceived: true,
        smsDeadlineReminder: true,
        smsRevisionRequested: false,
      }
    }

    return Response.json({ settings })
  } catch (error) {
    console.error('Error fetching notification settings:', error)
    return Response.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

/**
 * Update notification preferences
 */
export async function PATCH(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  let body: Partial<NotificationSettings>

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    // Upsert notification settings
    await sql`
      INSERT INTO creator_notification_settings (
        creator_id,
        email_project_assigned, email_project_updated, email_message_received,
        email_payment_received, email_deadline_reminder, email_revision_requested,
        sms_project_assigned, sms_project_updated, sms_message_received,
        sms_payment_received, sms_deadline_reminder, sms_revision_requested
      )
      VALUES (
        ${context.creatorId},
        ${body.emailProjectAssigned ?? true},
        ${body.emailProjectUpdated ?? true},
        ${body.emailMessageReceived ?? true},
        ${body.emailPaymentReceived ?? true},
        ${body.emailDeadlineReminder ?? true},
        ${body.emailRevisionRequested ?? true},
        ${body.smsProjectAssigned ?? false},
        ${body.smsProjectUpdated ?? false},
        ${body.smsMessageReceived ?? false},
        ${body.smsPaymentReceived ?? true},
        ${body.smsDeadlineReminder ?? true},
        ${body.smsRevisionRequested ?? false}
      )
      ON CONFLICT (creator_id)
      DO UPDATE SET
        email_project_assigned = EXCLUDED.email_project_assigned,
        email_project_updated = EXCLUDED.email_project_updated,
        email_message_received = EXCLUDED.email_message_received,
        email_payment_received = EXCLUDED.email_payment_received,
        email_deadline_reminder = EXCLUDED.email_deadline_reminder,
        email_revision_requested = EXCLUDED.email_revision_requested,
        sms_project_assigned = EXCLUDED.sms_project_assigned,
        sms_project_updated = EXCLUDED.sms_project_updated,
        sms_message_received = EXCLUDED.sms_message_received,
        sms_payment_received = EXCLUDED.sms_payment_received,
        sms_deadline_reminder = EXCLUDED.sms_deadline_reminder,
        sms_revision_requested = EXCLUDED.sms_revision_requested,
        updated_at = NOW()
    `

    return Response.json({
      success: true,
      message: 'Notification preferences saved',
    })
  } catch (error) {
    console.error('Error updating notification settings:', error)
    return Response.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
