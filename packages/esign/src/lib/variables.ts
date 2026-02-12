/**
 * E-Sign Template Variables
 * Handles dynamic placeholder replacement in templates
 *
 * Supported variables:
 * - {{signer_name}} - Signer's full name
 * - {{signer_email}} - Signer's email address
 * - {{creator_name}} - Creator's name (if linked)
 * - {{creator_email}} - Creator's email (if linked)
 * - {{commission_percent}} - Creator's commission % (if linked)
 * - {{current_date}} - Today's date (formatted)
 * - {{expiry_date}} - Document expiry date (formatted)
 * - {{document_name}} - Document name
 * - {{company_name}} - Company name from tenant config
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SignerContext {
  name: string
  email: string
}

export interface CreatorContext {
  name: string
  email?: string
  commission_percent?: number
}

export interface DocumentContext {
  name: string
  expires_at?: Date | string | null
}

export interface TenantConfig {
  company_name?: string
}

export interface VariableContext {
  signer?: SignerContext
  creator?: CreatorContext
  document?: DocumentContext
  tenant?: TenantConfig
}

export interface VariableDefinition {
  name: string
  key: string
  description: string
  example: string
  category: 'signer' | 'creator' | 'document' | 'system'
}

// ============================================================================
// VARIABLE DEFINITIONS
// ============================================================================

export const AVAILABLE_VARIABLES: VariableDefinition[] = [
  // Signer variables
  {
    name: 'Signer Name',
    key: '{{signer_name}}',
    description: "The signer's full name",
    example: 'John Doe',
    category: 'signer',
  },
  {
    name: 'Signer Email',
    key: '{{signer_email}}',
    description: "The signer's email address",
    example: 'john@example.com',
    category: 'signer',
  },
  // Creator variables
  {
    name: 'Creator Name',
    key: '{{creator_name}}',
    description: "The creator's name (if document is linked to a creator)",
    example: 'Jane Creator',
    category: 'creator',
  },
  {
    name: 'Creator Email',
    key: '{{creator_email}}',
    description: "The creator's email address",
    example: 'jane@example.com',
    category: 'creator',
  },
  {
    name: 'Commission Percent',
    key: '{{commission_percent}}',
    description: "The creator's commission percentage",
    example: '15%',
    category: 'creator',
  },
  // Document variables
  {
    name: 'Document Name',
    key: '{{document_name}}',
    description: 'The name of the document',
    example: 'Creator Agreement - John Doe',
    category: 'document',
  },
  {
    name: 'Expiry Date',
    key: '{{expiry_date}}',
    description: 'The document expiration date',
    example: 'January 15, 2026',
    category: 'document',
  },
  // System variables
  {
    name: 'Current Date',
    key: '{{current_date}}',
    description: "Today's date",
    example: 'February 11, 2026',
    category: 'system',
  },
  {
    name: 'Company Name',
    key: '{{company_name}}',
    description: 'Company name from tenant configuration',
    example: 'Acme Inc.',
    category: 'system',
  },
]

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format a date for display
 */
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ''

  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) return ''

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format commission percentage
 */
function formatCommission(percent: number | undefined): string {
  if (percent === undefined || percent === null) return ''
  return `${percent}%`
}

// ============================================================================
// VARIABLE REPLACEMENT
// ============================================================================

/**
 * Replace all variables in a text string with their values
 *
 * @param text - The text containing variables to replace
 * @param context - The context object with signer, creator, document, and tenant data
 * @returns The text with all variables replaced
 */
export function replaceVariables(text: string, context: VariableContext): string {
  if (!text) return text

  let result = text

  // Signer variables
  if (context.signer) {
    result = result.replace(/\{\{signer_name\}\}/gi, context.signer.name || '')
    result = result.replace(/\{\{signer_email\}\}/gi, context.signer.email || '')
  } else {
    result = result.replace(/\{\{signer_name\}\}/gi, '')
    result = result.replace(/\{\{signer_email\}\}/gi, '')
  }

  // Creator variables
  if (context.creator) {
    result = result.replace(/\{\{creator_name\}\}/gi, context.creator.name || '')
    result = result.replace(/\{\{creator_email\}\}/gi, context.creator.email || '')
    result = result.replace(
      /\{\{commission_percent\}\}/gi,
      formatCommission(context.creator.commission_percent)
    )
  } else {
    result = result.replace(/\{\{creator_name\}\}/gi, '')
    result = result.replace(/\{\{creator_email\}\}/gi, '')
    result = result.replace(/\{\{commission_percent\}\}/gi, '')
  }

  // Document variables
  if (context.document) {
    result = result.replace(/\{\{document_name\}\}/gi, context.document.name || '')
    result = result.replace(/\{\{expiry_date\}\}/gi, formatDate(context.document.expires_at))
  } else {
    result = result.replace(/\{\{document_name\}\}/gi, '')
    result = result.replace(/\{\{expiry_date\}\}/gi, '')
  }

  // System variables
  result = result.replace(/\{\{current_date\}\}/gi, formatDate(new Date()))
  result = result.replace(
    /\{\{company_name\}\}/gi,
    context.tenant?.company_name || ''
  )

  return result
}

/**
 * Check if text contains any variables
 */
export function hasVariables(text: string): boolean {
  if (!text) return false
  return /\{\{[a-z_]+\}\}/i.test(text)
}

/**
 * Extract all variables from text
 */
export function extractVariables(text: string): string[] {
  if (!text) return []
  const matches = text.match(/\{\{[a-z_]+\}\}/gi)
  return matches ? [...new Set(matches)] : []
}

/**
 * Validate that all variables in text are supported
 */
export function validateVariables(text: string): { valid: boolean; unsupported: string[] } {
  const variables = extractVariables(text)
  const supportedKeys = AVAILABLE_VARIABLES.map((v) => v.key.toLowerCase())
  const unsupported = variables.filter((v) => !supportedKeys.includes(v.toLowerCase()))

  return {
    valid: unsupported.length === 0,
    unsupported,
  }
}

/**
 * Get variables grouped by category for UI display
 */
export function getVariablesByCategory(): Record<string, VariableDefinition[]> {
  const result: Record<string, VariableDefinition[]> = {}

  for (const variable of AVAILABLE_VARIABLES) {
    const category = variable.category
    if (!result[category]) {
      result[category] = []
    }
    result[category].push(variable)
  }

  return result
}

/**
 * Get list of all variable keys
 */
export function getAllVariableKeys(): string[] {
  return AVAILABLE_VARIABLES.map((v) => v.key)
}

/**
 * Check if a specific variable key is supported
 */
export function isValidVariableKey(key: string): boolean {
  const supportedKeys = AVAILABLE_VARIABLES.map((v) => v.key.toLowerCase())
  return supportedKeys.includes(key.toLowerCase())
}
