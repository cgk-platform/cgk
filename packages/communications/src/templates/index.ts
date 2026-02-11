/**
 * Email Template Management
 *
 * Provides per-tenant customizable email templates with version history,
 * variable substitution, and preview capabilities.
 *
 * @ai-pattern email-templates
 * @ai-required All operations use tenant context
 */

// Types
export type {
  CreateTemplateInput,
  DefaultTemplate,
  EmailTemplate,
  EmailTemplateVersion,
  NotificationType,
  PreviewInput,
  RenderOptions,
  RenderedEmail,
  TemplateCategory,
  TemplateFilters,
  TemplateVariable,
  TestSendInput,
  UpdateTemplateInput,
  VariableType,
} from './types.js'

// Variables
export {
  COMMON_VARIABLES,
  NOTIFICATION_VARIABLES,
  getSampleDataForType,
  getVariablesForType,
  validateRequiredVariables,
} from './variables.js'

// Defaults
export {
  DEFAULT_TEMPLATES,
  getAllDefaultTemplates,
  getDefaultTemplate,
  getDefaultTemplatesForType,
} from './defaults.js'

// Database operations
export {
  createTemplate,
  deleteTemplate,
  getTemplate,
  getTemplateById,
  getTemplateForTenant,
  getTemplates,
  getTemplateVersion,
  getTemplateVersions,
  resetToDefault,
  restoreVersion,
  seedDefaultTemplates,
  updateTemplate,
} from './db.js'

// Rendering
export {
  extractTemplateVariables,
  formatCurrency,
  formatDate,
  htmlToPlainText,
  previewTemplate,
  previewTemplateWithSampleData,
  renderEmailTemplate,
  substituteVariables,
  validateTemplateContent,
} from './render.js'
