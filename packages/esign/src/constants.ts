/**
 * E-Sign System Constants & Configuration
 */

import type { FieldType } from './types.js'

// ============================================================================
// FILE STORAGE PATHS (Vercel Blob)
// ============================================================================

export const STORAGE_PATHS = {
  /** Original template PDFs */
  TEMPLATES: 'esign/templates',
  /** Template thumbnails */
  THUMBNAILS: 'esign/templates',
  /** Working document copies */
  DOCUMENTS: 'esign/documents',
  /** Signed final PDFs */
  SIGNED: 'esign/documents',
  /** Signature images */
  SIGNATURES: 'esign/signatures',
  /** Preview PDFs (temporary) */
  PREVIEWS: 'esign/previews',
} as const

// ============================================================================
// FILE SIZE LIMITS
// ============================================================================

export const FILE_LIMITS = {
  /** Maximum PDF file size for upload (20MB) */
  MAX_PDF_SIZE: 20 * 1024 * 1024,
  /** Maximum signature image size (2MB) */
  MAX_SIGNATURE_SIZE: 2 * 1024 * 1024,
  /** Maximum attachment size (10MB) */
  MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024,
  /** Allowed PDF MIME types */
  PDF_MIME_TYPES: ['application/pdf'],
  /** Allowed image MIME types for signatures */
  SIGNATURE_MIME_TYPES: ['image/png', 'image/jpeg', 'image/webp'],
} as const

// ============================================================================
// DOCUMENT DEFAULTS
// ============================================================================

export const DOCUMENT_DEFAULTS = {
  /** Default days until document expires (null = no expiry) */
  EXPIRY_DAYS: null as number | null,
  /** Days between automatic reminders */
  REMINDER_DAYS: 3,
  /** Maximum reminders to send */
  MAX_REMINDERS: 5,
  /** Access token length (characters) */
  TOKEN_LENGTH: 21,
} as const

// ============================================================================
// FIELD CONFIGURATION
// ============================================================================

export const FIELD_CONFIG = {
  /** Minimum field width (percentage) */
  MIN_WIDTH: 1,
  /** Minimum field height (percentage) */
  MIN_HEIGHT: 1,
  /** Default field dimensions by type */
  DEFAULT_SIZES: {
    signature: { width: 20, height: 5 },
    initial: { width: 8, height: 4 },
    date_signed: { width: 15, height: 3 },
    text: { width: 25, height: 3 },
    textarea: { width: 30, height: 10 },
    number: { width: 15, height: 3 },
    date: { width: 15, height: 3 },
    checkbox: { width: 3, height: 3 },
    checkbox_group: { width: 20, height: 6 },
    radio_group: { width: 20, height: 6 },
    dropdown: { width: 25, height: 3 },
    name: { width: 25, height: 3 },
    email: { width: 30, height: 3 },
    company: { width: 25, height: 3 },
    title: { width: 20, height: 3 },
    attachment: { width: 30, height: 5 },
    formula: { width: 20, height: 3 },
    note: { width: 40, height: 5 },
  } as Record<FieldType, { width: number; height: number }>,
  /** Grid snap size for field alignment (percentage) */
  GRID_SNAP_SIZE: 0.5,
} as const

// ============================================================================
// SIGNATURE CONFIGURATION
// ============================================================================

export const SIGNATURE_CONFIG = {
  /** Signature canvas width (pixels) */
  CANVAS_WIDTH: 500,
  /** Signature canvas height (pixels) */
  CANVAS_HEIGHT: 200,
  /** Signature pen color */
  PEN_COLOR: '#000000',
  /** Signature pen width */
  PEN_WIDTH: 2,
  /** Available signature fonts for typed signatures */
  SIGNATURE_FONTS: [
    { name: 'Dancing Script', family: "'Dancing Script', cursive" },
    { name: 'Great Vibes', family: "'Great Vibes', cursive" },
    { name: 'Alex Brush', family: "'Alex Brush', cursive" },
    { name: 'Pacifico', family: "'Pacifico', cursive" },
  ],
} as const

// ============================================================================
// RATE LIMITING (Redis)
// ============================================================================

export const RATE_LIMITS = {
  /** Max signing attempts per IP per hour */
  SIGNING_ATTEMPTS: 10,
  /** Max reminder sends per document per day */
  REMINDERS_PER_DAY: 3,
  /** Max document views per token per hour */
  DOCUMENT_VIEWS: 100,
  /** Rate limit window in seconds */
  WINDOW_SECONDS: 3600,
} as const

// ============================================================================
// SESSION CONFIGURATION (Redis)
// ============================================================================

export const SESSION_CONFIG = {
  /** Signing session TTL in seconds (24 hours) */
  SESSION_TTL: 24 * 60 * 60,
  /** Preview URL TTL in seconds (15 minutes) */
  PREVIEW_TTL: 15 * 60,
  /** Redis key prefixes */
  KEYS: {
    SESSION: 'esign:session:',
    RATE_LIMIT: 'esign:ratelimit:',
    PREVIEW: 'esign:preview:',
  },
} as const

// ============================================================================
// UI CONFIGURATION
// ============================================================================

export const UI_CONFIG = {
  /** Number of templates per page in list view */
  TEMPLATES_PER_PAGE: 20,
  /** Number of documents per page in list view */
  DOCUMENTS_PER_PAGE: 25,
  /** PDF thumbnail width (pixels) */
  THUMBNAIL_WIDTH: 300,
  /** PDF preview max width (pixels) */
  PREVIEW_MAX_WIDTH: 800,
  /** Field colors by signer (for multi-signer) */
  SIGNER_COLORS: [
    '#374d42', // Brand green (primary signer)
    '#3b82f6', // Blue
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
  ],
} as const

// ============================================================================
// STATUS LABELS
// ============================================================================

export const STATUS_LABELS = {
  TEMPLATE: {
    draft: 'Draft',
    active: 'Active',
    archived: 'Archived',
  },
  DOCUMENT: {
    draft: 'Draft',
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    declined: 'Declined',
    voided: 'Voided',
    expired: 'Expired',
  },
  SIGNER: {
    pending: 'Pending',
    sent: 'Sent',
    viewed: 'Viewed',
    signed: 'Signed',
    declined: 'Declined',
  },
} as const

// ============================================================================
// FIELD TYPE LABELS
// ============================================================================

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  signature: 'Signature',
  initial: 'Initials',
  date_signed: 'Date Signed',
  text: 'Text',
  textarea: 'Text Area',
  number: 'Number',
  date: 'Date',
  checkbox: 'Checkbox',
  checkbox_group: 'Checkbox Group',
  radio_group: 'Radio Group',
  dropdown: 'Dropdown',
  name: 'Full Name',
  email: 'Email',
  company: 'Company',
  title: 'Title',
  attachment: 'Attachment',
  formula: 'Formula',
  note: 'Note/Label',
}

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  TEMPLATE_NOT_FOUND: 'Template not found',
  TEMPLATE_NOT_ACTIVE: 'Template is not active',
  DOCUMENT_NOT_FOUND: 'Document not found',
  DOCUMENT_EXPIRED: 'This document has expired',
  DOCUMENT_ALREADY_SIGNED: 'This document has already been signed',
  DOCUMENT_VOIDED: 'This document has been voided',
  SIGNER_NOT_FOUND: 'Signer not found',
  INVALID_TOKEN: 'Invalid or expired signing link',
  REQUIRED_FIELD_MISSING: 'Please fill in all required fields',
  SIGNATURE_REQUIRED: 'Signature is required',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
  UPLOAD_FAILED: 'Failed to upload file',
  PDF_PROCESSING_FAILED: 'Failed to process PDF',
  TENANT_REQUIRED: 'Tenant context required',
} as const
