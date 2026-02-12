/**
 * E-Signature Components Index
 */

// Dashboard
export {
  EsignDashboardStats,
  EsignDashboardStatsSkeleton,
  type EsignDashboardStatsData,
} from './dashboard-stats'

export { EsignQuickActions } from './quick-actions'

// Status Badges
export { DocumentStatusBadge, SignerStatusBadge } from './document-status-badge'

// Documents
export {
  RecentDocuments,
  RecentDocumentsSkeleton,
} from './recent-documents'

export { DocumentList } from './document-list'

export { DocumentDetail } from './document-detail'

export {
  CounterSignQueue,
  CounterSignQueueSkeleton,
} from './counter-sign-queue'

// Templates
export {
  TemplateList,
  TemplateListSkeleton,
  type TemplateListItem,
} from './template-list'

export {
  FieldPalette,
  FIELD_TYPES,
  getFieldTypeConfig,
  type FieldTypeConfig,
} from './field-palette'

// Signatures
export {
  SignatureCapture,
  type SignatureCaptureProps,
  type SignatureMethod,
} from './signature-capture'

// Forms
export {
  SendDocumentForm,
  type SendDocumentFormData,
  type SignerInput,
} from './send-document-form'
