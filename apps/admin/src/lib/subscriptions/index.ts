/**
 * Subscription Services
 *
 * Exports all subscription-related services and types.
 */

// Types
export * from './types'

// Core service
export {
  getSubscription,
  listSubscriptions,
  getSubscriptionOrders,
  getSubscriptionActivity,
  logActivity,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  skipNextOrder,
  updateFrequency,
  updateQuantity,
  getSettings,
  updateSettings,
  getStatusCounts,
  getMRR,
} from './service'

// Analytics
export {
  getOverviewMetrics,
  getCohortAnalysis,
  getChurnAnalysis,
  getGrowthMetrics,
  getProductBreakdown,
  getAnalytics,
} from './analytics'

// Save flows (retention)
export {
  listSaveFlows,
  getSaveFlow,
  createSaveFlow,
  updateSaveFlow,
  deleteSaveFlow,
  toggleSaveFlow,
  createSaveAttempt,
  completeSaveAttempt,
  getSaveFlowAnalytics,
} from './save-flows'

// Selling plans
export {
  listSellingPlans,
  getSellingPlan,
  createSellingPlan,
  updateSellingPlan,
  deleteSellingPlan,
  toggleSellingPlan,
  associateProducts,
  getSellingPlansForProduct,
  syncWithShopify,
  calculateDiscountedPrice,
} from './selling-plans'

// Validation
export {
  runValidation,
  getValidationHistory,
  getValidationIssues,
  getOpenIssues,
  markIssueFixed,
  autoFixIssues,
  getValidationSummary,
} from './validation'

// Email templates
export {
  listEmailTemplates,
  getEmailTemplate,
  getEmailTemplateByKey,
  updateEmailTemplate,
  toggleEmailTemplate,
  resetTemplateToDefault,
  getTemplateVersionHistory,
  sendTestEmail,
  previewTemplate,
  getTemplateVariables,
} from './emails'
