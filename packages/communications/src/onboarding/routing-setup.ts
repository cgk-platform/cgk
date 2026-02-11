/**
 * Notification Routing Setup
 *
 * Helpers for configuring notification routing during onboarding.
 *
 * @ai-pattern onboarding
 * @ai-note Step 5e of tenant onboarding
 */

import {
  getAllNotificationRoutingStatus,
  listNotificationRouting,
  seedDefaultNotificationRouting,
  upsertNotificationRouting,
} from '../sender/routing.js'
import { listSenderAddresses } from '../sender/addresses.js'
import {
  DEFAULT_NOTIFICATION_ROUTING,
  NOTIFICATION_TYPES,
  type NotificationType,
  type SenderPurpose,
} from '../types.js'
import type { ConfigureRoutingInput, NotificationTypeInfo } from './types.js'

/**
 * Notification type display info for UI
 */
const NOTIFICATION_TYPE_INFO: Record<
  NotificationType,
  { label: string; category: string; description: string }
> = {
  // Review System
  [NOTIFICATION_TYPES.REVIEW_REQUEST]: {
    label: 'Review Request',
    category: 'Reviews',
    description: 'Initial request for customer to leave a review',
  },
  [NOTIFICATION_TYPES.REVIEW_REMINDER]: {
    label: 'Review Reminder',
    category: 'Reviews',
    description: 'Follow-up reminder if no review submitted',
  },
  [NOTIFICATION_TYPES.REVIEW_THANK_YOU]: {
    label: 'Review Thank You',
    category: 'Reviews',
    description: 'Thank you message after review is submitted',
  },
  [NOTIFICATION_TYPES.REVIEW_VERIFICATION]: {
    label: 'Review Verification',
    category: 'Reviews',
    description: 'Email to verify reviewer identity',
  },
  [NOTIFICATION_TYPES.INCENTIVE_REQUEST]: {
    label: 'Incentive Request',
    category: 'Reviews',
    description: 'Request for additional feedback with incentive',
  },
  [NOTIFICATION_TYPES.INCENTIVE_REMINDER]: {
    label: 'Incentive Reminder',
    category: 'Reviews',
    description: 'Reminder about pending incentive offer',
  },

  // Subscriptions
  [NOTIFICATION_TYPES.SUBSCRIPTION_CREATED]: {
    label: 'Subscription Created',
    category: 'Subscriptions',
    description: 'Confirmation of new subscription',
  },
  [NOTIFICATION_TYPES.SUBSCRIPTION_UPCOMING_ORDER]: {
    label: 'Upcoming Order',
    category: 'Subscriptions',
    description: 'Reminder about upcoming subscription order',
  },
  [NOTIFICATION_TYPES.SUBSCRIPTION_ORDER_PROCESSED]: {
    label: 'Order Processed',
    category: 'Subscriptions',
    description: 'Confirmation that subscription order was processed',
  },
  [NOTIFICATION_TYPES.SUBSCRIPTION_PAYMENT_FAILED]: {
    label: 'Payment Failed',
    category: 'Subscriptions',
    description: 'Notice that subscription payment failed',
  },
  [NOTIFICATION_TYPES.SUBSCRIPTION_PAUSED]: {
    label: 'Subscription Paused',
    category: 'Subscriptions',
    description: 'Confirmation that subscription was paused',
  },
  [NOTIFICATION_TYPES.SUBSCRIPTION_RESUMED]: {
    label: 'Subscription Resumed',
    category: 'Subscriptions',
    description: 'Confirmation that subscription was resumed',
  },
  [NOTIFICATION_TYPES.SUBSCRIPTION_CANCELLED]: {
    label: 'Subscription Cancelled',
    category: 'Subscriptions',
    description: 'Confirmation that subscription was cancelled',
  },

  // Creators
  [NOTIFICATION_TYPES.CREATOR_APPLICATION_APPROVED]: {
    label: 'Application Approved',
    category: 'Creators',
    description: 'Notice that creator application was approved',
  },
  [NOTIFICATION_TYPES.CREATOR_REMINDER]: {
    label: 'Creator Reminder',
    category: 'Creators',
    description: 'General reminder to creator',
  },
  [NOTIFICATION_TYPES.CREATOR_PROJECT_ASSIGNED]: {
    label: 'Project Assigned',
    category: 'Creators',
    description: 'Notice that a new project was assigned',
  },
  [NOTIFICATION_TYPES.CREATOR_PROJECT_COMPLETED]: {
    label: 'Project Completed',
    category: 'Creators',
    description: 'Confirmation that project was marked complete',
  },
  [NOTIFICATION_TYPES.CREATOR_REVISION_REQUESTED]: {
    label: 'Revision Requested',
    category: 'Creators',
    description: 'Notice that revisions were requested',
  },
  [NOTIFICATION_TYPES.CREATOR_PAYMENT_AVAILABLE]: {
    label: 'Payment Available',
    category: 'Creators',
    description: 'Notice that payment is ready for withdrawal',
  },
  [NOTIFICATION_TYPES.CREATOR_PAYOUT_INITIATED]: {
    label: 'Payout Initiated',
    category: 'Creators',
    description: 'Confirmation that payout was started',
  },
  [NOTIFICATION_TYPES.CREATOR_MONTHLY_SUMMARY]: {
    label: 'Monthly Summary',
    category: 'Creators',
    description: 'Monthly earnings and activity summary',
  },

  // E-Sign
  [NOTIFICATION_TYPES.ESIGN_SIGNING_REQUEST]: {
    label: 'Signing Request',
    category: 'E-Signatures',
    description: 'Request for someone to sign a document',
  },
  [NOTIFICATION_TYPES.ESIGN_SIGNING_COMPLETE]: {
    label: 'Signing Complete',
    category: 'E-Signatures',
    description: 'Confirmation that document was signed',
  },
  [NOTIFICATION_TYPES.ESIGN_REMINDER]: {
    label: 'Signing Reminder',
    category: 'E-Signatures',
    description: 'Reminder about pending signature',
  },
  [NOTIFICATION_TYPES.ESIGN_VOID_NOTIFICATION]: {
    label: 'Document Voided',
    category: 'E-Signatures',
    description: 'Notice that document was voided',
  },

  // Treasury
  [NOTIFICATION_TYPES.TREASURY_APPROVAL_REQUEST]: {
    label: 'Approval Request',
    category: 'Treasury',
    description: 'Request for approval of a treasury item',
  },
  [NOTIFICATION_TYPES.TREASURY_APPROVAL_REMINDER]: {
    label: 'Approval Reminder',
    category: 'Treasury',
    description: 'Reminder about pending approval',
  },
  [NOTIFICATION_TYPES.TREASURY_APPROVED_NOTIFICATION]: {
    label: 'Approved',
    category: 'Treasury',
    description: 'Confirmation that item was approved',
  },
  [NOTIFICATION_TYPES.TREASURY_REJECTED_NOTIFICATION]: {
    label: 'Rejected',
    category: 'Treasury',
    description: 'Notice that item was rejected',
  },

  // Contractors
  [NOTIFICATION_TYPES.CONTRACTOR_PORTAL_INVITE]: {
    label: 'Portal Invite',
    category: 'Contractors',
    description: 'Invitation to join contractor portal',
  },
  [NOTIFICATION_TYPES.CONTRACTOR_PAYMENT_AVAILABLE]: {
    label: 'Payment Available',
    category: 'Contractors',
    description: 'Notice that payment is ready',
  },
  [NOTIFICATION_TYPES.CONTRACTOR_TAX_DOCUMENT_REQUIRED]: {
    label: 'Tax Document Required',
    category: 'Contractors',
    description: 'Request for tax documentation',
  },

  // Team
  [NOTIFICATION_TYPES.TEAM_INVITATION]: {
    label: 'Team Invitation',
    category: 'Team',
    description: 'Invitation to join the team',
  },

  // System
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: {
    label: 'System Alert',
    category: 'System',
    description: 'Important system notification',
  },
}

/**
 * Get all notification types with display info
 */
export function getNotificationTypesInfo(): NotificationTypeInfo[] {
  return Object.entries(NOTIFICATION_TYPES).map(([_key, type]) => {
    const info = NOTIFICATION_TYPE_INFO[type] ?? {
      label: type,
      category: 'Other',
      description: '',
    }
    const defaults = DEFAULT_NOTIFICATION_ROUTING[type]

    return {
      type,
      label: info.label,
      category: info.category,
      description: info.description,
      defaultPurpose: defaults?.purpose ?? 'transactional',
    }
  })
}

/**
 * Get notification types grouped by category
 */
export function getNotificationTypesByCategory(): Record<
  string,
  NotificationTypeInfo[]
> {
  const types = getNotificationTypesInfo()
  const grouped: Record<string, NotificationTypeInfo[]> = {}

  for (const type of types) {
    if (!grouped[type.category]) {
      grouped[type.category] = []
    }
    grouped[type.category]!.push(type)
  }

  return grouped
}

/**
 * Initialize notification routing with defaults
 */
export async function initializeNotificationRouting(): Promise<void> {
  await seedDefaultNotificationRouting()
}

/**
 * Configure notification routing during onboarding
 */
export async function configureNotificationRouting(
  input: ConfigureRoutingInput
): Promise<{
  success: boolean
  updated: number
  errors: string[]
}> {
  const errors: string[] = []
  let updated = 0

  // If applying defaults, seed first
  if (input.applyDefaults) {
    await seedDefaultNotificationRouting()
  }

  // Apply specific routing configs
  for (const config of input.routing) {
    try {
      await upsertNotificationRouting(config.notificationType, {
        senderAddressId: config.senderAddressId,
        isEnabled: config.isEnabled,
      })
      updated++
    } catch (error) {
      errors.push(
        `Failed to update ${config.notificationType}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }

  return {
    success: errors.length === 0,
    updated,
    errors,
  }
}

/**
 * Auto-assign sender addresses to notification types based on purpose
 */
export async function autoAssignSenderAddresses(): Promise<{
  success: boolean
  assigned: number
  errors: string[]
}> {
  const addresses = await listSenderAddresses()
  const routing = await listNotificationRouting()
  const errors: string[] = []
  let assigned = 0

  // Build purpose -> address map (prefer defaults)
  const purposeAddresses: Record<SenderPurpose, string | null> = {
    transactional: null,
    creator: null,
    support: null,
    treasury: null,
    system: null,
  }

  for (const address of addresses) {
    // Only use verified domains
    if (address.verificationStatus !== 'verified') continue

    // Prefer default addresses
    if (!purposeAddresses[address.purpose] || address.isDefault) {
      purposeAddresses[address.purpose] = address.id
    }
  }

  // Update routing that doesn't have a sender assigned
  for (const route of routing) {
    if (route.senderAddressId) continue // Already assigned

    const defaults = DEFAULT_NOTIFICATION_ROUTING[route.notificationType]
    if (!defaults) continue

    const addressId = purposeAddresses[defaults.purpose]
    if (!addressId) continue

    try {
      await upsertNotificationRouting(route.notificationType, {
        senderAddressId: addressId,
      })
      assigned++
    } catch (error) {
      errors.push(
        `Failed to assign sender to ${route.notificationType}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }

  return {
    success: errors.length === 0,
    assigned,
    errors,
  }
}

/**
 * Get current routing status for display
 */
export async function getRoutingStatus(): Promise<
  Array<{
    notificationType: NotificationType
    label: string
    category: string
    isEnabled: boolean
    senderEmail: string | null
    senderDisplayName: string | null
    isConfigured: boolean
  }>
> {
  const status = await getAllNotificationRoutingStatus()
  const addresses = await listSenderAddresses()
  const addressMap = new Map(addresses.map((a) => [a.emailAddress, a]))

  return status.map((s) => {
    const info = NOTIFICATION_TYPE_INFO[s.notificationType]
    const address = s.senderEmail ? addressMap.get(s.senderEmail) : null

    return {
      notificationType: s.notificationType,
      label: info?.label ?? s.notificationType,
      category: info?.category ?? s.category,
      isEnabled: s.isEnabled,
      senderEmail: s.senderEmail,
      senderDisplayName: address?.displayName ?? null,
      isConfigured: s.isConfigured,
    }
  })
}

/**
 * Enable or disable all notifications in a category
 */
export async function setAllInCategoryEnabled(
  category: string,
  enabled: boolean
): Promise<{
  success: boolean
  updated: number
  errors: string[]
}> {
  const types = getNotificationTypesInfo().filter(
    (t) => t.category === category
  )

  const errors: string[] = []
  let updated = 0

  for (const type of types) {
    try {
      await upsertNotificationRouting(type.type, { isEnabled: enabled })
      updated++
    } catch (error) {
      errors.push(
        `Failed to update ${type.type}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }

  return {
    success: errors.length === 0,
    updated,
    errors,
  }
}
