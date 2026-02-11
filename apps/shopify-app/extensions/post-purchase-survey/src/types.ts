/**
 * Post-Purchase Survey Types
 *
 * Defines the structure for survey configuration, questions, and responses
 * used by the checkout UI extension.
 */

/**
 * Survey question option for choice-based questions
 */
export interface SurveyOption {
  value: string
  label: string
}

/**
 * Survey question definition
 */
export interface SurveyQuestion {
  /** Unique identifier for the question */
  id: string
  /** Question text displayed to the customer */
  question: string
  /** Type of question determining UI component */
  type: 'single_choice' | 'multi_choice' | 'text'
  /** Options for choice-based questions */
  options?: SurveyOption[]
  /** Whether the question must be answered */
  required: boolean
  /** Placeholder text for text inputs */
  placeholder?: string
}

/**
 * Survey configuration returned from the platform API
 */
export interface SurveyConfig {
  /** List of questions to display */
  questions: SurveyQuestion[]
  /** Text for the submit button */
  submitButtonText: string
  /** Message shown after successful submission */
  thankYouMessage: string
  /** Title shown above the survey */
  title?: string
}

/**
 * Survey response payload sent to the platform
 */
export interface SurveySubmission {
  /** Shopify order ID */
  orderId: string
  /** Order name/number (e.g., #1001) */
  orderNumber?: string
  /** Shop domain */
  shop: string
  /** Customer's answers keyed by question ID */
  answers: Record<string, string | string[]>
  /** Timestamp of submission */
  submittedAt: string
  /** Customer email if available */
  email?: string
}

/**
 * Extension settings from Shopify admin configuration
 */
export interface SurveySettings {
  survey_config_url?: string
  api_key?: string
  survey_title?: string
  submit_button_text?: string
  thank_you_message?: string
}
