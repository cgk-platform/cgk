/**
 * Survey system types for the admin portal
 * PHASE-2SV: Surveys & Post-Purchase Attribution
 */

// Survey status
export type SurveyStatus = 'draft' | 'active' | 'paused' | 'archived'

// Survey type
export type SurveyType = 'post_purchase' | 'post_delivery' | 'nps' | 'custom'

// Question types
export type QuestionType =
  | 'single_select'
  | 'multi_select'
  | 'text'
  | 'textarea'
  | 'rating'
  | 'nps'
  | 'email'
  | 'phone'

// Attribution categories
export type AttributionCategory = 'social' | 'search' | 'ads' | 'referral' | 'offline' | 'other'

// Conditional operators
export type ConditionalOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains'

// Survey interface
export interface Survey {
  id: string
  name: string
  description: string | null
  slug: string
  survey_type: SurveyType
  trigger_config: TriggerConfig
  title: string
  subtitle: string | null
  thank_you_message: string | null
  redirect_url: string | null
  branding_config: BrandingConfig
  status: SurveyStatus
  target_config: TargetConfig
  response_limit: number | null
  expires_at: string | null
  locale: string
  translations: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
  // Computed fields
  response_count?: number
  completion_rate?: number
}

// Survey with questions
export interface SurveyWithQuestions extends Survey {
  questions: SurveyQuestion[]
}

// Trigger configuration
export interface TriggerConfig {
  timing: 'immediate' | 'delay_hours'
  delay_hours?: number
}

// Branding configuration
export interface BrandingConfig {
  primaryColor?: string
  backgroundColor?: string
  textColor?: string
  fontFamily?: string
  logoUrl?: string
  customCss?: string
}

// Target configuration
export interface TargetConfig {
  minOrderValue?: number
  maxOrderValue?: number
  productTags?: string[]
  customerTags?: string[]
  firstTimeOnly?: boolean
  excludeDiscounted?: boolean
}

// Question option
export interface QuestionOption {
  id: string
  label: string
  value: string
  isOther?: boolean
}

// Conditional logic
export interface ConditionalLogic {
  questionId: string
  operator: ConditionalOperator
  value: string | string[]
}

// Validation configuration
export interface ValidationConfig {
  minLength?: number
  maxLength?: number
  pattern?: string
  min?: number
  max?: number
}

// Survey question
export interface SurveyQuestion {
  id: string
  survey_id: string
  question_text: string
  help_text: string | null
  question_type: QuestionType
  options: QuestionOption[]
  required: boolean
  validation_config: ValidationConfig
  show_when: ConditionalLogic | null
  is_attribution_question: boolean
  display_order: number
  translations: Record<string, unknown>
  created_at: string
}

// Attribution option
export interface AttributionOption {
  id: string
  label: string
  value: string
  icon: string | null
  category: AttributionCategory | null
  is_active: boolean
  is_system: boolean
  display_order: number
  created_at: string
}

// Survey response
export interface SurveyResponse {
  id: string
  survey_id: string
  order_id: string | null
  customer_id: string | null
  customer_email: string | null
  started_at: string
  completed_at: string | null
  is_complete: boolean
  user_agent: string | null
  ip_address: string | null
  locale: string | null
  nps_score: number | null
  attribution_source: string | null
  created_at: string
  // Joined fields
  survey_name?: string
  answers?: SurveyAnswer[]
}

// Survey answer
export interface SurveyAnswer {
  id: string
  response_id: string
  question_id: string
  answer_value: string | null
  answer_values: string[] | null
  answer_numeric: number | null
  answer_json: unknown | null
  created_at: string
  // Joined fields
  question_text?: string
  question_type?: QuestionType
}

// Slack configuration
export interface SurveySlackConfig {
  id: string
  survey_id: string | null
  webhook_url: string
  channel_name: string | null
  notify_on_complete: boolean
  notify_on_nps_low: boolean
  nps_low_threshold: number
  daily_digest: boolean
  weekly_digest: boolean
  digest_day: number
  digest_hour: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Analytics types
export interface SurveyStats {
  surveyId: string
  totalResponses: number
  completedResponses: number
  completionRate: number
  avgCompletionTime: number
  responsesByDay: Array<{
    date: string
    count: number
  }>
  questionStats: Array<{
    questionId: string
    questionText: string
    answerCounts: Record<string, number>
  }>
}

export interface QuestionStats {
  questionId: string
  questionText: string
  questionType: QuestionType
  totalAnswers: number
  optionBreakdown?: Array<{
    optionId: string
    optionLabel: string
    count: number
    percentage: number
  }>
  averageScore?: number
  scoreDistribution?: Record<number, number>
  commonKeywords?: Array<{
    keyword: string
    count: number
  }>
}

export interface AttributionBreakdown {
  source: string
  category: AttributionCategory | null
  count: number
  percentage: number
  revenue: number
  avgOrderValue: number
}

export interface NpsTrendData {
  period: string
  promoters: number
  passives: number
  detractors: number
  npsScore: number
  responseCount: number
}

// Filter interfaces
export interface SurveyFilters {
  page: number
  limit: number
  offset: number
  status?: SurveyStatus | 'all'
  type?: SurveyType
  search?: string
}

export interface ResponseFilters {
  page: number
  limit: number
  offset: number
  surveyId?: string
  isComplete?: boolean
  dateFrom?: string
  dateTo?: string
  attributionSource?: string
}

// Input types
export interface CreateSurveyInput {
  name: string
  description?: string
  slug: string
  survey_type?: SurveyType
  trigger_config?: TriggerConfig
  title: string
  subtitle?: string
  thank_you_message?: string
  redirect_url?: string
  branding_config?: BrandingConfig
  target_config?: TargetConfig
  response_limit?: number
  expires_at?: string
  locale?: string
}

export interface UpdateSurveyInput {
  name?: string
  description?: string
  slug?: string
  survey_type?: SurveyType
  trigger_config?: TriggerConfig
  title?: string
  subtitle?: string
  thank_you_message?: string
  redirect_url?: string
  branding_config?: BrandingConfig
  status?: SurveyStatus
  target_config?: TargetConfig
  response_limit?: number
  expires_at?: string
  locale?: string
  translations?: Record<string, unknown>
}

export interface CreateQuestionInput {
  question_text: string
  help_text?: string
  question_type: QuestionType
  options?: QuestionOption[]
  required?: boolean
  validation_config?: ValidationConfig
  show_when?: ConditionalLogic
  is_attribution_question?: boolean
  display_order?: number
}

export interface UpdateQuestionInput {
  question_text?: string
  help_text?: string
  question_type?: QuestionType
  options?: QuestionOption[]
  required?: boolean
  validation_config?: ValidationConfig
  show_when?: ConditionalLogic | null
  is_attribution_question?: boolean
  display_order?: number
}

export interface SubmitResponseInput {
  surveyId: string
  orderId?: string
  customerId?: string
  customerEmail?: string
  userAgent?: string
  ipAddress?: string
  locale?: string
  answers: Array<{
    questionId: string
    value?: string
    values?: string[]
    numeric?: number
  }>
}

export interface CreateAttributionOptionInput {
  label: string
  value: string
  icon?: string
  category?: AttributionCategory
  display_order?: number
}

export interface UpdateSlackConfigInput {
  webhook_url?: string
  channel_name?: string
  notify_on_complete?: boolean
  notify_on_nps_low?: boolean
  nps_low_threshold?: number
  daily_digest?: boolean
  weekly_digest?: boolean
  digest_day?: number
  digest_hour?: number
  is_active?: boolean
}

// Constants
export const SURVEY_STATUSES: SurveyStatus[] = ['draft', 'active', 'paused', 'archived']
export const SURVEY_TYPES: SurveyType[] = ['post_purchase', 'post_delivery', 'nps', 'custom']
export const QUESTION_TYPES: QuestionType[] = [
  'single_select',
  'multi_select',
  'text',
  'textarea',
  'rating',
  'nps',
  'email',
  'phone',
]
export const ATTRIBUTION_CATEGORIES: AttributionCategory[] = [
  'social',
  'search',
  'ads',
  'referral',
  'offline',
  'other',
]

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_select: 'Single Choice',
  multi_select: 'Multiple Choice',
  text: 'Short Text',
  textarea: 'Long Text',
  rating: 'Star Rating',
  nps: 'NPS Score',
  email: 'Email',
  phone: 'Phone Number',
}

export const QUESTION_TYPE_ICONS: Record<QuestionType, string> = {
  single_select: 'CircleDot',
  multi_select: 'CheckSquare',
  text: 'Type',
  textarea: 'AlignLeft',
  rating: 'Star',
  nps: 'Gauge',
  email: 'Mail',
  phone: 'Phone',
}

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
}

export const SURVEY_TYPE_LABELS: Record<SurveyType, string> = {
  post_purchase: 'Post-Purchase',
  post_delivery: 'Post-Delivery',
  nps: 'NPS Survey',
  custom: 'Custom',
}

export const ATTRIBUTION_CATEGORY_LABELS: Record<AttributionCategory, string> = {
  social: 'Social Media',
  search: 'Search',
  ads: 'Paid Ads',
  referral: 'Referral',
  offline: 'Offline',
  other: 'Other',
}
