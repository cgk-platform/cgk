/**
 * Email Queue Types
 *
 * @ai-pattern email-queue
 * @ai-note All queue entries must include tenantId for isolation
 */

/**
 * Queue entry status values
 *
 * Flow:
 * pending -> awaiting_delivery (if trigger is 'delivered')
 *        -> scheduled (if ready to send)
 *
 * scheduled -> processing (claimed by worker)
 * processing -> sent | failed | skipped
 * failed -> scheduled (retry) | failed (max attempts)
 */
export type QueueStatus =
  | 'pending'
  | 'awaiting_delivery'
  | 'scheduled'
  | 'processing'
  | 'sent'
  | 'skipped'
  | 'failed'

/**
 * Trigger events for scheduling emails
 */
export type TriggerEvent = 'fulfilled' | 'delivered' | 'immediate' | 'manual'

/**
 * Queue types supported by the system
 */
export type QueueType =
  | 'review'
  | 'creator'
  | 'subscription'
  | 'esign'
  | 'treasury'
  | 'team_invitation'

/**
 * Base queue entry interface shared across all queue types
 */
export interface BaseQueueEntry {
  id: string
  tenantId: string

  // Status tracking
  status: QueueStatus

  // Scheduling
  triggerEvent: TriggerEvent
  scheduledAt: Date | null
  delayDays: number

  // Sequence tracking
  sequenceNumber: number
  sequenceId: string | null

  // Execution tracking
  triggerRunId: string | null
  attempts: number
  maxAttempts: number
  lastAttemptAt: Date | null
  sentAt: Date | null
  resendMessageId: string | null

  // Skip tracking
  skipReason: string | null
  skippedBy: string | null
  skippedAt: Date | null

  // Template tracking
  templateType: string | null

  // Metadata
  metadata: Record<string, unknown>
  errorMessage: string | null

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

/**
 * Review email queue entry
 */
export interface ReviewQueueEntry extends BaseQueueEntry {
  queueType: 'review'

  // Order/customer context
  orderId: string
  orderNumber: string
  customerEmail: string
  customerName: string | null
  productTitle: string | null

  // Fulfillment tracking
  fulfilledAt: Date | null
  deliveredAt: Date | null
  trackingNumber: string | null

  // Incentive tracking
  incentiveOffered: boolean
  forceIncentive: boolean
  incentiveCode: string | null
}

/**
 * Creator email queue entry
 */
export interface CreatorQueueEntry extends BaseQueueEntry {
  queueType: 'creator'

  // Creator context
  creatorId: string
  creatorEmail: string
  creatorName: string | null

  // Project context
  projectId: string | null
  projectTitle: string | null

  // Communication type
  communicationType:
    | 'approval'
    | 'onboarding'
    | 'reminder'
    | 'project_update'
    | 'payout_notification'
}

/**
 * Subscription email queue entry
 */
export interface SubscriptionQueueEntry extends BaseQueueEntry {
  queueType: 'subscription'

  // Customer context
  customerId: string
  customerEmail: string
  customerName: string | null

  // Subscription context
  subscriptionId: string
  subscriptionStatus: string

  // Communication type
  communicationType:
    | 'welcome'
    | 'renewal_reminder'
    | 'payment_failed'
    | 'cancelled'
    | 'reactivated'
}

/**
 * E-sign email queue entry
 */
export interface EsignQueueEntry extends BaseQueueEntry {
  queueType: 'esign'

  // Recipient context
  recipientEmail: string
  recipientName: string | null

  // Document context
  documentId: string
  documentTitle: string

  // Communication type
  communicationType: 'signing_request' | 'reminder' | 'completed' | 'expired'
}

/**
 * Treasury approval email queue entry
 */
export interface TreasuryQueueEntry extends BaseQueueEntry {
  queueType: 'treasury'

  // Requester context
  requesterId: string
  requesterEmail: string
  requesterName: string | null

  // Approver context
  approverEmail: string
  approverName: string | null

  // Request context
  requestId: string
  requestAmount: number
  requestCurrency: string
  requestDescription: string | null

  // Communication type
  communicationType: 'approval_request' | 'reminder' | 'approved' | 'rejected'
}

/**
 * Team invitation queue entry
 */
export interface TeamInvitationQueueEntry extends BaseQueueEntry {
  queueType: 'team_invitation'

  // Invitee context
  inviteeEmail: string
  inviteeName: string | null

  // Inviter context
  inviterId: string
  inviterName: string | null

  // Invitation context
  invitationId: string
  invitedRole: string

  // Communication type
  communicationType: 'invite' | 'reminder'
}

/**
 * Union type for all queue entries
 */
export type QueueEntry =
  | ReviewQueueEntry
  | CreatorQueueEntry
  | SubscriptionQueueEntry
  | EsignQueueEntry
  | TreasuryQueueEntry
  | TeamInvitationQueueEntry

/**
 * Queue statistics
 */
export interface QueueStats {
  pending: number
  awaitingDelivery: number
  scheduled: number
  processing: number
  sent: number
  skipped: number
  failed: number
  total: number
  sentToday: number
  failedToday: number
}

/**
 * Queue filter options
 */
export interface QueueFilters {
  status?: QueueStatus | QueueStatus[]
  startDate?: Date
  endDate?: Date
  email?: string
  orderNumber?: string
  sequenceId?: string
  templateType?: string
  limit?: number
  offset?: number
}

/**
 * Bulk action types
 */
export type BulkAction = 'skip' | 'retry' | 'reschedule'

/**
 * Bulk action result
 */
export interface BulkActionResult {
  success: boolean
  affectedCount: number
  errors: Array<{ id: string; error: string }>
}

/**
 * Create queue entry input
 */
export interface CreateQueueEntryInput {
  tenantId: string
  orderId?: string
  orderNumber?: string
  customerEmail?: string
  customerName?: string
  productTitle?: string
  fulfilledAt?: Date
  deliveredAt?: Date
  trackingNumber?: string
  triggerEvent?: TriggerEvent
  delayDays?: number
  sequenceNumber?: number
  sequenceId?: string
  templateType?: string
  incentiveOffered?: boolean
  forceIncentive?: boolean
  incentiveCode?: string
  metadata?: Record<string, unknown>
  maxAttempts?: number
}

/**
 * Send result from email provider
 */
export interface SendResult {
  success: boolean
  messageId?: string
  error?: string
}
