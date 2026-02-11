/**
 * Subscription Types
 *
 * Type definitions for the subscription management system
 */

// Subscription status values
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired' | 'pending'

// Subscription frequency values
export type SubscriptionFrequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'semiannually'
  | 'annually'

// Subscription provider values
export type SubscriptionProvider = 'loop' | 'custom' | 'recharge' | 'bold'

// Save flow type values
export type SaveFlowType = 'cancellation' | 'winback' | 'at_risk'

// Save attempt outcome values
export type SaveAttemptOutcome = 'saved' | 'cancelled' | 'pending' | 'expired'

// Validation severity values
export type ValidationSeverity = 'error' | 'warning' | 'info'

// Shipping address structure
export interface ShippingAddress {
  firstName: string
  lastName: string
  address1: string
  address2?: string
  city: string
  province: string
  provinceCode: string
  country: string
  countryCode: string
  zip: string
  phone?: string
}

// Main subscription type
export interface Subscription {
  id: string
  provider: SubscriptionProvider
  providerSubscriptionId: string | null
  shopifySubscriptionId: string | null

  // Customer
  customerId: string
  customerEmail: string
  customerName: string | null

  // Product
  productId: string
  variantId: string | null
  productTitle: string
  variantTitle: string | null
  quantity: number

  // Pricing
  priceCents: number
  discountCents: number
  discountType: string | null
  discountCode: string | null
  currency: string

  // Frequency
  frequency: SubscriptionFrequency
  frequencyInterval: number

  // Status
  status: SubscriptionStatus
  pauseReason: string | null
  cancelReason: string | null
  pausedAt: string | null
  cancelledAt: string | null
  autoResumeAt: string | null

  // Billing
  nextBillingDate: string | null
  lastBillingDate: string | null
  billingAnchorDay: number | null

  // Payment
  paymentMethodId: string | null
  paymentMethodLast4: string | null
  paymentMethodBrand: string | null
  paymentMethodExpMonth: number | null
  paymentMethodExpYear: number | null

  // Shipping
  shippingAddress: ShippingAddress | null

  // Stats
  totalOrders: number
  totalSpentCents: number
  skippedOrders: number

  // Selling plan
  sellingPlanId: string | null
  sellingPlanName: string | null

  // Metadata
  metadata: Record<string, unknown>
  notes: string | null
  tags: string[]

  // Sync
  lastSyncedAt: string | null
  syncError: string | null

  // Timestamps
  startedAt: string
  createdAt: string
  updatedAt: string
}

// Subscription list item (subset for list views)
export interface SubscriptionListItem {
  id: string
  customerEmail: string
  customerName: string | null
  productTitle: string
  variantTitle: string | null
  quantity: number
  priceCents: number
  currency: string
  frequency: SubscriptionFrequency
  status: SubscriptionStatus
  nextBillingDate: string | null
  totalOrders: number
  totalSpentCents: number
  createdAt: string
}

// Subscription order/charge
export interface SubscriptionOrder {
  id: string
  subscriptionId: string
  orderId: string | null
  scheduledAt: string
  billedAt: string | null
  amountCents: number
  currency: string
  status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'skipped'
  failureReason: string | null
  retryCount: number
  createdAt: string
  updatedAt: string
}

// Subscription activity entry
export interface SubscriptionActivity {
  id: string
  subscriptionId: string
  activityType: string
  description: string | null
  metadata: Record<string, unknown>
  actorType: 'customer' | 'admin' | 'system'
  actorId: string | null
  actorName: string | null
  createdAt: string
}

// Save flow configuration
export interface SaveFlow {
  id: string
  name: string
  description: string | null
  flowType: SaveFlowType
  triggerConditions: SaveFlowTrigger
  steps: SaveFlowStep[]
  offers: SaveFlowOffer[]
  isEnabled: boolean
  priority: number
  totalTriggered: number
  totalSaved: number
  revenueSavedCents: number
  createdAt: string
  updatedAt: string
}

export interface SaveFlowTrigger {
  event: 'cancel_initiated' | 'days_after_cancel' | 'payment_failed' | 'no_engagement'
  conditions?: Record<string, unknown>
}

export interface SaveFlowStep {
  id: string
  type: 'show_reasons' | 'present_offer' | 'confirm_action' | 'send_email' | 'delay'
  config: Record<string, unknown>
}

export interface SaveFlowOffer {
  id: string
  name: string
  type: 'discount' | 'pause' | 'skip' | 'frequency_change' | 'free_shipping' | 'gift'
  value?: number
  description: string
}

// Save attempt record
export interface SaveAttempt {
  id: string
  subscriptionId: string
  flowId: string
  outcome: SaveAttemptOutcome
  stepsCompleted: string[]
  offerPresented: string | null
  offerAccepted: string | null
  cancelReason: string | null
  revenueSavedCents: number | null
  startedAt: string
  completedAt: string | null
  createdAt: string
}

// Selling plan
export interface SellingPlan {
  id: string
  shopifySellingPlanId: string | null
  shopifySellingPlanGroupId: string | null
  name: string
  description: string | null
  billingFrequency: SubscriptionFrequency
  billingInterval: number
  deliveryFrequency: SubscriptionFrequency
  deliveryInterval: number
  discountType: 'percentage' | 'fixed' | 'price' | null
  discountValue: number | null
  trialDays: number | null
  minCycles: number | null
  maxCycles: number | null
  productIds: string[]
  isActive: boolean
  lastSyncedAt: string | null
  syncError: string | null
  createdAt: string
  updatedAt: string
}

// Subscription settings
export interface SubscriptionSettings {
  id: string
  primaryProvider: SubscriptionProvider
  billingProvider: SubscriptionProvider
  loopApiKey: string | null
  loopWebhookSecret: string | null
  rechargeApiKey: string | null
  defaultPauseDays: number
  maxPauseDays: number
  autoResumeAfterPause: boolean
  maxSkipsPerYear: number
  cancellationGraceDays: number
  renewalReminderDays: number
  paymentRetryAttempts: number
  paymentRetryIntervalHours: number
  allowCustomerCancel: boolean
  allowCustomerPause: boolean
  allowFrequencyChanges: boolean
  allowQuantityChanges: boolean
  allowSkipOrders: boolean
  shopifySyncEnabled: boolean
  shopifyWebhookUrl: string | null
  updatedAt: string
}

// Validation run
export interface ValidationRun {
  id: string
  runAt: string
  runBy: string | null
  runType: 'manual' | 'scheduled'
  totalChecked: number
  issuesFound: number
  issuesFixed: number
  results: ValidationIssue[]
  status: 'running' | 'completed' | 'failed'
  createdAt: string
}

// Validation issue
export interface ValidationIssue {
  id: string
  validationId: string
  subscriptionId: string | null
  issueType: string
  severity: ValidationSeverity
  description: string
  suggestedFix: string | null
  isFixed: boolean
  fixedAt: string | null
  fixedBy: string | null
  createdAt: string
}

// Analytics types
export interface SubscriptionAnalytics {
  overview: SubscriptionOverviewMetrics
  cohorts: CohortData[]
  churnAnalysis: ChurnAnalysis
  growthMetrics: GrowthMetrics
  productBreakdown: ProductSubscriptionData[]
}

export interface SubscriptionOverviewMetrics {
  mrr: number
  arr: number
  netMrrChange: number
  activeCount: number
  pausedCount: number
  cancelledCount: number
  arpu: number
  churnRate: number
}

export interface CohortData {
  month: string
  subscribers: number
  retentionByMonth: number[]
  ltv: number
  churnRate: number
}

export interface ChurnAnalysis {
  trend: { date: string; rate: number }[]
  byReason: { reason: string; count: number; percentage: number }[]
  byProduct: { productId: string; productTitle: string; churnRate: number }[]
  atRisk: Subscription[]
}

export interface GrowthMetrics {
  newSubscribers: number
  churnedSubscribers: number
  netGrowth: number
  velocity: number
  trend: { date: string; new: number; churned: number; net: number }[]
}

export interface ProductSubscriptionData {
  productId: string
  productTitle: string
  activeSubscribers: number
  revenue: number
  churnRate: number
  conversionFromTrial: number
}

// Filter types
export interface SubscriptionFilters {
  page: number
  limit: number
  offset: number
  status: string
  product: string
  frequency: string
  search: string
  dateFrom: string
  dateTo: string
  sort: string
  dir: 'asc' | 'desc'
}

// Email template for subscriptions
export interface SubscriptionEmailTemplate {
  id: string
  notificationType: 'subscription'
  templateKey: string
  name: string
  description: string | null
  subject: string
  bodyHtml: string
  bodyText: string | null
  senderName: string | null
  senderEmail: string | null
  replyToEmail: string | null
  isActive: boolean
  version: number
  isDefault: boolean
  lastEditedBy: string | null
  lastEditedAt: string | null
  createdAt: string
  updatedAt: string
}

// API request/response types
export interface PauseSubscriptionRequest {
  reason?: string
  resumeDate?: string
}

export interface CancelSubscriptionRequest {
  reason: string
  feedback?: string
}

export interface SkipOrderRequest {
  reason?: string
}

export interface UpdateFrequencyRequest {
  frequency: SubscriptionFrequency
  interval?: number
}

export interface UpdateQuantityRequest {
  quantity: number
}

export interface ApplyDiscountRequest {
  discountType: 'percentage' | 'fixed'
  discountValue: number
  discountCode?: string
}

export interface CutoverRequest {
  source: SubscriptionProvider | 'csv'
  target: SubscriptionProvider
  fieldMapping: Record<string, string>
  statusMapping: Record<string, SubscriptionStatus>
  dryRun: boolean
  filters?: {
    status?: SubscriptionStatus[]
    dateFrom?: string
    dateTo?: string
  }
}

export interface CutoverResult {
  success: boolean
  processed: number
  succeeded: number
  failed: number
  errors: { subscriptionId: string; error: string }[]
  dryRun: boolean
}

export interface SyncResult {
  success: boolean
  synced: number
  created: number
  updated: number
  errors: { id: string; error: string }[]
  lastSyncedAt: string
}

// Provider abstraction interface
export interface SubscriptionProviderInterface {
  // Core CRUD
  getSubscription(id: string): Promise<Subscription>
  listSubscriptions(filters: SubscriptionFilters): Promise<{ subscriptions: Subscription[]; total: number }>

  // Lifecycle
  pauseSubscription(id: string, reason: string, resumeDate?: Date): Promise<void>
  resumeSubscription(id: string): Promise<void>
  cancelSubscription(id: string, reason: string): Promise<void>
  skipNextOrder(id: string): Promise<void>

  // Updates
  updateFrequency(id: string, frequency: SubscriptionFrequency, interval?: number): Promise<void>
  updateQuantity(id: string, quantity: number): Promise<void>
  updatePaymentMethod(id: string, paymentMethodId: string): Promise<void>

  // Sync
  syncFromProvider(): Promise<SyncResult>
  pushToProvider(subscription: Subscription): Promise<void>
}
