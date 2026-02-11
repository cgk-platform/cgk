/**
 * Review system types for the admin portal
 */

// Review status enum
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'spam'

// Review email status enum
export type ReviewEmailStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'

// Bulk campaign status enum
export type BulkCampaignStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

// Incentive code status enum
export type IncentiveCodeStatus = 'active' | 'redeemed' | 'expired'

// Question status enum
export type QuestionStatus = 'pending' | 'answered' | 'rejected'

// Review provider type
export type ReviewProvider = 'internal' | 'yotpo'

// Discount type
export type DiscountType = 'percentage' | 'fixed'

// Email template type
export type EmailTemplateType = 'request' | 'reminder_1' | 'reminder_2' | 'photo_request' | 'thank_you' | 'incentive'

// Base review interface
export interface Review {
  id: string
  product_id: string
  product_title?: string | null
  order_id: string | null
  author_name: string
  author_email: string
  is_verified_purchase: boolean
  rating: number
  title: string | null
  body: string | null
  status: ReviewStatus
  verification_token: string | null
  verified_at: string | null
  helpful_votes: number
  unhelpful_votes: number
  imported_from: string | null
  original_id: string | null
  response_body: string | null
  response_author: string | null
  responded_at: string | null
  created_at: string
  updated_at: string
}

// Review with media
export interface ReviewWithMedia extends Review {
  media: ReviewMedia[]
}

// Review media
export interface ReviewMedia {
  id: string
  review_id: string
  media_type: 'image' | 'video'
  url: string
  thumbnail_url: string | null
  mux_asset_id: string | null
  mux_playback_id: string | null
  duration_seconds: number | null
  width: number | null
  height: number | null
  file_size_bytes: number | null
  sort_order: number
  created_at: string
}

// Email template
export interface ReviewEmailTemplate {
  id: string
  type: EmailTemplateType
  name: string
  subject: string
  body_html: string
  body_text: string | null
  is_enabled: boolean
  delay_days: number
  created_at: string
  updated_at: string
}

// Email queue item
export interface ReviewEmailQueueItem {
  id: string
  customer_email: string
  customer_name: string | null
  order_id: string
  product_id: string
  product_title?: string | null
  template_id: string | null
  status: ReviewEmailStatus
  scheduled_at: string
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  error_message: string | null
  provider_message_id: string | null
  created_at: string
}

// Email log entry
export interface ReviewEmailLog {
  id: string
  queue_id: string
  event_type: string
  event_data: Record<string, unknown> | null
  created_at: string
}

// Email stats
export interface ReviewEmailStats {
  total_sent: number
  total_delivered: number
  total_opened: number
  total_clicked: number
  total_reviewed: number
  delivery_rate: number
  open_rate: number
  click_rate: number
  review_rate: number
}

// Bulk send template
export interface ReviewBulkSendTemplate {
  id: string
  name: string
  description: string | null
  subject: string
  body_html: string
  body_text: string | null
  include_incentive: boolean
  times_used: number
  total_sent: number
  total_reviewed: number
  is_archived: boolean
  created_at: string
  updated_at: string
}

// Bulk campaign
export interface ReviewBulkCampaign {
  id: string
  name: string
  template_id: string | null
  template_name?: string | null
  filters: BulkCampaignFilters
  status: BulkCampaignStatus
  total_recipients: number | null
  sent_count: number
  error_count: number
  send_rate: number | null
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

// Bulk campaign filters
export interface BulkCampaignFilters {
  dateFrom?: string
  dateTo?: string
  productIds?: string[]
  minOrderValue?: number
  excludeReviewed?: boolean
  excludeRequested?: boolean
}

// Bulk campaign recipient
export interface BulkCampaignRecipient {
  id: string
  campaign_id: string
  customer_email: string
  customer_name: string | null
  order_id: string
  product_id: string
  status: ReviewEmailStatus
  sent_at: string | null
  error_message: string | null
  created_at: string
}

// Bulk send preview
export interface BulkSendPreview {
  total_count: number
  sample_recipients: Array<{
    customer_email: string
    customer_name: string | null
    order_id: string
    product_id: string
    product_title: string | null
  }>
  estimated_completion_minutes: number
}

// Incentive code
export interface ReviewIncentiveCode {
  id: string
  code: string
  review_id: string | null
  customer_email: string | null
  discount_type: DiscountType
  discount_value: number
  status: IncentiveCodeStatus
  expires_at: string | null
  redeemed_at: string | null
  redeemed_order_id: string | null
  created_at: string
}

// Incentive stats
export interface IncentiveStats {
  total_issued: number
  total_redeemed: number
  total_expired: number
  redemption_rate: number
  total_discount_given: number
  total_revenue_from_redemptions: number
}

// Product question
export interface ProductQuestion {
  id: string
  product_id: string
  product_title?: string | null
  customer_email: string | null
  customer_name: string | null
  question: string
  status: QuestionStatus
  answer?: ProductAnswer | null
  created_at: string
}

// Product answer
export interface ProductAnswer {
  id: string
  question_id: string
  answer: string
  answered_by: string | null
  created_at: string
}

// Q&A answer template
export interface QAAnswerTemplate {
  id: string
  name: string
  answer_text: string
  times_used: number
  created_at: string
  updated_at: string
}

// Review settings
export interface ReviewSettings {
  id: string
  provider: ReviewProvider
  provider_credentials: Record<string, string> | null
  request_delay_days: number
  reminder_count: number
  reminder_interval_days: number
  order_status_trigger: 'delivered' | 'fulfilled'
  auto_approve: boolean
  auto_approve_min_rating: number | null
  auto_approve_verified_only: boolean
  profanity_filter: boolean
  spam_detection: boolean
  show_verified_badge: boolean
  allow_media: boolean
  max_media_count: number
  allow_rating_only: boolean
  min_review_length: number
  incentive_enabled: boolean
  incentive_discount_type: DiscountType | null
  incentive_discount_value: number | null
  incentive_expiry_days: number
  incentive_min_rating: number | null
  incentive_min_word_count: number | null
  incentive_require_photo: boolean
  shopify_sync_enabled: boolean
  klaviyo_sync_enabled: boolean
  updated_at: string
}

// Review migration
export interface ReviewMigration {
  id: string
  migration_type: 'import' | 'export' | 'provider_switch'
  source: string | null
  destination: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  total_records: number | null
  processed_records: number
  success_records: number
  error_records: number
  error_log: Array<{ record: string; error: string }> | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

// Review analytics
export interface ReviewAnalytics {
  total_reviews: number
  reviews_this_month: number
  reviews_last_month: number
  average_rating: number
  rating_distribution: Record<number, number>
  reviews_by_status: Record<ReviewStatus, number>
  reviews_with_media: number
  response_rate: number
  average_response_time_hours: number
}

// Product review stats
export interface ProductReviewStats {
  product_id: string
  product_title: string | null
  review_count: number
  average_rating: number
  rating_distribution: Record<number, number>
}

// Review trend data point
export interface ReviewTrendDataPoint {
  date: string
  count: number
  average_rating: number
}

// Filter interfaces
export interface ReviewFilters {
  page: number
  limit: number
  offset: number
  status: string
  rating: string
  verified: string
  product_id?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface EmailQueueFilters {
  page: number
  limit: number
  offset: number
  status: string
  dateFrom?: string
  dateTo?: string
  product_id?: string
}

export interface QuestionFilters {
  page: number
  limit: number
  offset: number
  status: string
  product_id?: string
  search?: string
}

export interface IncentiveCodeFilters {
  page: number
  limit: number
  offset: number
  status: string
  search?: string
}

// Input types for creating/updating
export interface CreateReviewInput {
  product_id: string
  order_id?: string
  author_name: string
  author_email: string
  is_verified_purchase?: boolean
  rating: number
  title?: string
  body?: string
}

export interface UpdateEmailTemplateInput {
  name?: string
  subject?: string
  body_html?: string
  body_text?: string
  is_enabled?: boolean
  delay_days?: number
}

export interface CreateBulkSendTemplateInput {
  name: string
  description?: string
  subject: string
  body_html: string
  body_text?: string
  include_incentive?: boolean
}

export interface CreateBulkCampaignInput {
  name: string
  template_id: string
  filters: BulkCampaignFilters
  send_rate?: number
  scheduled_at?: string
}

export interface AnswerQuestionInput {
  answer: string
  answered_by?: string
}

export interface UpdateSettingsInput {
  provider?: ReviewProvider
  provider_credentials?: Record<string, string>
  request_delay_days?: number
  reminder_count?: number
  reminder_interval_days?: number
  order_status_trigger?: 'delivered' | 'fulfilled'
  auto_approve?: boolean
  auto_approve_min_rating?: number
  auto_approve_verified_only?: boolean
  profanity_filter?: boolean
  spam_detection?: boolean
  show_verified_badge?: boolean
  allow_media?: boolean
  max_media_count?: number
  allow_rating_only?: boolean
  min_review_length?: number
  incentive_enabled?: boolean
  incentive_discount_type?: DiscountType
  incentive_discount_value?: number
  incentive_expiry_days?: number
  incentive_min_rating?: number
  incentive_min_word_count?: number
  incentive_require_photo?: boolean
  shopify_sync_enabled?: boolean
  klaviyo_sync_enabled?: boolean
}

// Provider abstraction interface
export interface ReviewProviderInterface {
  // Reviews
  getReviews(filters: ReviewFilters): Promise<{ rows: Review[]; totalCount: number }>
  getReview(id: string): Promise<Review | null>
  createReview(data: CreateReviewInput): Promise<Review>
  moderateReview(id: string, action: 'approve' | 'reject' | 'spam'): Promise<void>
  respondToReview(reviewId: string, response: string, author: string): Promise<void>
  deleteResponse(reviewId: string): Promise<void>

  // Q&A
  getQuestions(filters: QuestionFilters): Promise<{ rows: ProductQuestion[]; totalCount: number }>
  answerQuestion(questionId: string, answer: string, answeredBy: string): Promise<void>

  // Sync
  syncFromProvider?(): Promise<{ imported: number; updated: number; errors: number }>
  pushToProvider?(review: Review): Promise<void>
}

// Constants
export const REVIEW_STATUSES: ReviewStatus[] = ['pending', 'approved', 'rejected', 'spam']
export const EMAIL_STATUSES: ReviewEmailStatus[] = ['pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed']
export const CAMPAIGN_STATUSES: BulkCampaignStatus[] = ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled']
export const QUESTION_STATUSES: QuestionStatus[] = ['pending', 'answered', 'rejected']
export const EMAIL_TEMPLATE_TYPES: EmailTemplateType[] = ['request', 'reminder_1', 'reminder_2', 'photo_request', 'thank_you', 'incentive']

// Template variables
export const EMAIL_TEMPLATE_VARIABLES = [
  '{{customer_name}}',
  '{{product_name}}',
  '{{order_number}}',
  '{{review_link}}',
  '{{incentive_code}}',
  '{{brand_name}}',
] as const
