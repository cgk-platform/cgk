/**
 * Reviews module exports
 */

// Types
export * from './types'

// Database operations
export * from './db'

// Provider abstraction
export {
  InternalReviewProvider,
  YotpoReviewProvider,
  getReviewProvider,
  getWidgetConfig,
  type YotpoCredentials,
  type ReviewProviderType,
  type WidgetConfig,
} from './providers'
