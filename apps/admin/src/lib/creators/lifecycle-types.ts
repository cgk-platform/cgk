/**
 * Types for Creator Lifecycle Automation
 * - Slack notifications
 * - Product shipments
 * - Reminder chains
 */

// ============================================================
// SLACK NOTIFICATION TYPES
// ============================================================

export type CreatorNotificationType =
  | 'application_received'
  | 'application_approved'
  | 'welcome_call_booked'
  | 'escalation'
  | 'product_shipped'
  | 'product_received'
  | 'contract_sent'
  | 'contract_signed'
  | 'content_submitted'
  | 'content_revisions_requested'

export interface CreatorNotificationTypeInfo {
  type: CreatorNotificationType
  emoji: string
  label: string
  description: string
}

export const CREATOR_NOTIFICATION_TYPES: CreatorNotificationTypeInfo[] = [
  {
    type: 'application_received',
    emoji: '\u{1F4E5}', // inbox
    label: 'Application Received',
    description: 'New application submitted',
  },
  {
    type: 'application_approved',
    emoji: '\u{1F389}', // party
    label: 'Application Approved',
    description: 'Creator approved',
  },
  {
    type: 'welcome_call_booked',
    emoji: '\u{1F4C5}', // calendar
    label: 'Welcome Call Booked',
    description: 'Welcome call scheduled',
  },
  {
    type: 'escalation',
    emoji: '\u{26A0}\u{FE0F}', // warning
    label: 'Escalation',
    description: 'Follow-up needed after max reminders',
  },
  {
    type: 'product_shipped',
    emoji: '\u{1F4E6}', // package
    label: 'Product Shipped',
    description: 'Product fulfillment created',
  },
  {
    type: 'product_received',
    emoji: '\u{2705}', // check
    label: 'Product Received',
    description: 'Delivery confirmed',
  },
  {
    type: 'contract_sent',
    emoji: '\u{1F4C4}', // document
    label: 'Contract Sent',
    description: 'E-sign document sent',
  },
  {
    type: 'contract_signed',
    emoji: '\u{270D}\u{FE0F}', // writing
    label: 'Contract Signed',
    description: 'Contract signed by creator',
  },
  {
    type: 'content_submitted',
    emoji: '\u{1F3AC}', // clapper
    label: 'Content Submitted',
    description: 'Project work submitted',
  },
  {
    type: 'content_revisions_requested',
    emoji: '\u{1F504}', // arrows
    label: 'Revisions Requested',
    description: 'Admin requests changes',
  },
]

export interface CreatorSlackNotificationConfig {
  type: CreatorNotificationType
  enabled: boolean
  channelId: string
  channelName: string
  messageTemplate: string
  includeActionButtons: boolean
  customEmoji?: string
}

export interface SlackChannel {
  id: string
  name: string
  isPrivate: boolean
}

// Default message templates for each notification type
export const DEFAULT_NOTIFICATION_TEMPLATES: Record<CreatorNotificationType, string> = {
  application_received:
    '*New Creator Application*\n{{creatorName}} ({{creatorEmail}}) has submitted an application.',
  application_approved:
    '*Creator Approved*\n{{creatorName}} has been approved and is ready for onboarding.',
  welcome_call_booked:
    '*Welcome Call Scheduled*\n{{creatorName}} has booked their welcome call.',
  escalation:
    '*Escalation Required*\n{{creatorName}} has not responded after multiple reminders. Manual follow-up needed.',
  product_shipped:
    '*Product Shipped*\nProducts have been shipped to {{creatorName}}.\n{{#trackingNumber}}Tracking: {{carrier}} {{trackingNumber}}{{/trackingNumber}}',
  product_received:
    '*Product Delivered*\n{{creatorName}} has received their products.',
  contract_sent:
    '*Contract Sent*\n{{documentName}} has been sent to {{creatorName}} for signature.',
  contract_signed:
    '*Contract Signed*\n{{creatorName}} has signed {{documentName}}.',
  content_submitted:
    '*Content Submitted*\n{{creatorName}} has submitted work for {{projectTitle}}.',
  content_revisions_requested:
    '*Revisions Requested*\nRevisions have been requested from {{creatorName}} for {{projectTitle}}.',
}

// ============================================================
// PRODUCT SHIPMENT TYPES
// ============================================================

export type ShipmentStatus = 'pending' | 'ordered' | 'shipped' | 'delivered' | 'failed'

export const SHIPMENT_STATUS_CONFIG: Record<
  ShipmentStatus,
  { label: string; color: string; icon: string }
> = {
  pending: { label: 'Pending', color: 'gray', icon: '\u{25CB}' },
  ordered: { label: 'Ordered', color: 'blue', icon: '\u{25D0}' },
  shipped: { label: 'Shipped', color: 'amber', icon: '\u{1F4E6}' },
  delivered: { label: 'Delivered', color: 'green', icon: '\u{2705}' },
  failed: { label: 'Failed', color: 'red', icon: '\u{2717}' },
}

export interface ShipmentProduct {
  variantId: string
  title: string
  quantity: number
  sku?: string
  imageUrl?: string
}

export interface ShippingAddress {
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface ProductShipment {
  id: string
  creatorId: string
  shopifyOrderId?: string
  shopifyOrderNumber?: string
  shopifyDraftOrderId?: string
  products: ShipmentProduct[]
  status: ShipmentStatus
  trackingNumber?: string
  carrier?: string
  shippingAddress?: ShippingAddress
  orderedAt?: string
  shippedAt?: string
  deliveredAt?: string
  notes?: string
  createdBy?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export interface CreateShipmentParams {
  creatorId: string
  products: ShipmentProduct[]
  shippingAddress: ShippingAddress
  notes?: string
}

export type ShipmentCarrier = 'ups' | 'fedex' | 'usps' | 'dhl'

export const CARRIER_TRACKING_URLS: Record<ShipmentCarrier, string> = {
  ups: 'https://www.ups.com/track?tracknum=',
  fedex: 'https://www.fedex.com/fedextrack/?trknbr=',
  usps: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
  dhl: 'https://www.dhl.com/us-en/home/tracking.html?tracking-id=',
}

export function getTrackingUrl(carrier: string, trackingNumber: string): string {
  const normalizedCarrier = carrier.toLowerCase() as ShipmentCarrier
  const baseUrl = CARRIER_TRACKING_URLS[normalizedCarrier]
  return baseUrl ? `${baseUrl}${trackingNumber}` : '#'
}

// ============================================================
// REMINDER CHAIN TYPES
// ============================================================

export type ReminderChainType = 'approval' | 'welcome_call'

export type ReminderChannel = 'email' | 'sms'

export interface ReminderStep {
  id: string
  order: number
  daysAfterTrigger: number
  channels: ReminderChannel[]
  templateId: string
  templateName: string
}

export interface ReminderEscalationConfig {
  enabled: boolean
  daysAfterFinal: number
  slackNotification: boolean
}

export interface ReminderChainConfig {
  type: ReminderChainType
  enabled: boolean
  scheduleTime: string // "09:00" UTC
  steps: ReminderStep[]
  escalation?: ReminderEscalationConfig
  maxOnePerDay: boolean
}

export interface CreatorReminderConfig {
  id: string
  // Approval reminders
  approvalEnabled: boolean
  approvalScheduleTime: string
  approvalSteps: ReminderStep[]
  approvalEscalationEnabled: boolean
  approvalEscalationDays: number
  approvalEscalationSlack: boolean
  // Welcome call reminders
  welcomeCallEnabled: boolean
  welcomeCallScheduleTime: string
  welcomeCallSteps: ReminderStep[]
  welcomeCallEventTypeId?: string
  // Global settings
  maxOnePerDay: boolean
  createdAt: string
  updatedAt: string
}

// Default reminder steps
export const DEFAULT_APPROVAL_STEPS: ReminderStep[] = [
  {
    id: 'approval-1',
    order: 1,
    daysAfterTrigger: 3,
    channels: ['email'],
    templateId: 'first_reminder',
    templateName: 'First Reminder',
  },
  {
    id: 'approval-2',
    order: 2,
    daysAfterTrigger: 7,
    channels: ['email', 'sms'],
    templateId: 'second_reminder',
    templateName: 'Second Reminder',
  },
  {
    id: 'approval-3',
    order: 3,
    daysAfterTrigger: 14,
    channels: ['email', 'sms'],
    templateId: 'final_reminder',
    templateName: 'Final Reminder',
  },
]

export const DEFAULT_WELCOME_CALL_STEPS: ReminderStep[] = [
  {
    id: 'welcome-1',
    order: 1,
    daysAfterTrigger: 2,
    channels: ['email'],
    templateId: 'welcome_call_reminder',
    templateName: 'Welcome Call Reminder',
  },
  {
    id: 'welcome-2',
    order: 2,
    daysAfterTrigger: 5,
    channels: ['email', 'sms'],
    templateId: 'welcome_call_urgent',
    templateName: 'Welcome Call Urgent',
  },
]

// ============================================================
// CREATOR EXTENDED FIELDS FOR REMINDERS
// ============================================================

export interface CreatorReminderFields {
  reminderCount: number
  lastReminderAt?: string
  escalatedAt?: string
  welcomeCallReminderCount: number
  welcomeCallScheduledAt?: string
  welcomeCallDismissed: boolean
  firstLoginAt?: string
}
