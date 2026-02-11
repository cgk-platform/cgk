/**
 * SMS Template Management
 *
 * Template storage, variable substitution, and character counting.
 * SMS templates are plain text with a 160 character limit for single segments.
 *
 * @ai-pattern templates
 * @ai-critical Enforce 160 char limit for single-segment messages
 */

import { sql, withTenant } from '@cgk/db'

import { calculateSegmentCount } from './compliance.js'
import type {
  CreateSmsTemplateInput,
  SmsTemplate,
  UpdateSmsTemplateInput,
} from './types.js'

// ============================================================================
// Template Operations
// ============================================================================

/**
 * Create an SMS template
 */
export async function createSmsTemplate(
  input: CreateSmsTemplateInput
): Promise<SmsTemplate> {
  const { characterCount, segmentCount } = calculateSegmentCount(input.content)

  const result = await withTenant(input.tenantId, async () => {
    return sql`
      INSERT INTO sms_templates (
        tenant_id,
        notification_type,
        content,
        character_count,
        segment_count,
        available_variables,
        shorten_links,
        is_default
      ) VALUES (
        ${input.tenantId},
        ${input.notificationType},
        ${input.content},
        ${characterCount},
        ${segmentCount},
        ${JSON.stringify(input.availableVariables || [])},
        ${input.shortenLinks ?? true},
        ${input.isDefault ?? false}
      )
      ON CONFLICT (tenant_id, notification_type) DO UPDATE
      SET
        content = EXCLUDED.content,
        character_count = EXCLUDED.character_count,
        segment_count = EXCLUDED.segment_count,
        available_variables = EXCLUDED.available_variables,
        shorten_links = EXCLUDED.shorten_links,
        is_default = EXCLUDED.is_default,
        updated_at = NOW()
      RETURNING
        id,
        tenant_id as "tenantId",
        notification_type as "notificationType",
        content,
        character_count as "characterCount",
        segment_count as "segmentCount",
        available_variables as "availableVariables",
        shorten_links as "shortenLinks",
        is_default as "isDefault",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
  })

  return result.rows[0] as SmsTemplate
}

/**
 * Update an SMS template
 */
export async function updateSmsTemplate(
  tenantId: string,
  templateId: string,
  input: UpdateSmsTemplateInput
): Promise<SmsTemplate | null> {
  const updates: string[] = []
  const values: unknown[] = []

  if (input.content !== undefined) {
    const { characterCount, segmentCount } = calculateSegmentCount(input.content)
    updates.push('content = $1', 'character_count = $2', 'segment_count = $3')
    values.push(input.content, characterCount, segmentCount)
  }

  if (updates.length === 0 && input.availableVariables === undefined && input.shortenLinks === undefined && input.isDefault === undefined) {
    // No updates provided
    return getSmsTemplateById(tenantId, templateId)
  }

  const result = await withTenant(tenantId, async () => {
    return sql`
      UPDATE sms_templates
      SET
        content = COALESCE(${input.content ?? null}, content),
        character_count = CASE
          WHEN ${input.content ?? null} IS NOT NULL
          THEN ${input.content ? calculateSegmentCount(input.content).characterCount : 0}
          ELSE character_count
        END,
        segment_count = CASE
          WHEN ${input.content ?? null} IS NOT NULL
          THEN ${input.content ? calculateSegmentCount(input.content).segmentCount : 0}
          ELSE segment_count
        END,
        available_variables = COALESCE(${input.availableVariables ? JSON.stringify(input.availableVariables) : null}, available_variables),
        shorten_links = COALESCE(${input.shortenLinks ?? null}, shorten_links),
        is_default = COALESCE(${input.isDefault ?? null}, is_default),
        updated_at = NOW()
      WHERE id = ${templateId}
        AND tenant_id = ${tenantId}
      RETURNING
        id,
        tenant_id as "tenantId",
        notification_type as "notificationType",
        content,
        character_count as "characterCount",
        segment_count as "segmentCount",
        available_variables as "availableVariables",
        shorten_links as "shortenLinks",
        is_default as "isDefault",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `
  })

  return (result.rows[0] as SmsTemplate) || null
}

/**
 * Get SMS template by ID
 */
export async function getSmsTemplateById(
  tenantId: string,
  templateId: string
): Promise<SmsTemplate | null> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        id,
        tenant_id as "tenantId",
        notification_type as "notificationType",
        content,
        character_count as "characterCount",
        segment_count as "segmentCount",
        available_variables as "availableVariables",
        shorten_links as "shortenLinks",
        is_default as "isDefault",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM sms_templates
      WHERE id = ${templateId}
        AND tenant_id = ${tenantId}
    `
  })

  return (result.rows[0] as SmsTemplate) || null
}

/**
 * Get SMS template by notification type
 */
export async function getSmsTemplateByType(
  tenantId: string,
  notificationType: string
): Promise<SmsTemplate | null> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        id,
        tenant_id as "tenantId",
        notification_type as "notificationType",
        content,
        character_count as "characterCount",
        segment_count as "segmentCount",
        available_variables as "availableVariables",
        shorten_links as "shortenLinks",
        is_default as "isDefault",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM sms_templates
      WHERE tenant_id = ${tenantId}
        AND notification_type = ${notificationType}
    `
  })

  return (result.rows[0] as SmsTemplate) || null
}

/**
 * List all SMS templates for a tenant
 */
export async function listSmsTemplates(
  tenantId: string
): Promise<SmsTemplate[]> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      SELECT
        id,
        tenant_id as "tenantId",
        notification_type as "notificationType",
        content,
        character_count as "characterCount",
        segment_count as "segmentCount",
        available_variables as "availableVariables",
        shorten_links as "shortenLinks",
        is_default as "isDefault",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM sms_templates
      WHERE tenant_id = ${tenantId}
      ORDER BY notification_type ASC
    `
  })

  return result.rows as SmsTemplate[]
}

/**
 * Delete an SMS template
 */
export async function deleteSmsTemplate(
  tenantId: string,
  templateId: string
): Promise<boolean> {
  const result = await withTenant(tenantId, async () => {
    return sql`
      DELETE FROM sms_templates
      WHERE id = ${templateId}
        AND tenant_id = ${tenantId}
    `
  })

  return (result.rowCount ?? 0) > 0
}

// ============================================================================
// Template Rendering
// ============================================================================

/**
 * Substitute variables in SMS content
 * Variables are in {{variableName}} format
 */
export function substituteVariables(
  content: string,
  variables: Record<string, string | number | undefined>
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key]

    if (value === undefined || value === null) {
      return match // Keep placeholder if no value
    }

    return String(value)
  })
}

/**
 * Extract variable names from template content
 */
export function extractVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g
  const variables: string[] = []
  let match

  while ((match = regex.exec(content)) !== null) {
    const varName = match[1]
    if (varName && !variables.includes(varName)) {
      variables.push(varName)
    }
  }

  return variables
}

/**
 * Validate that all required variables are provided
 */
export function validateVariables(
  content: string,
  variables: Record<string, unknown>
): { valid: boolean; missingVariables: string[] } {
  const required = extractVariables(content)
  const missing = required.filter((v) => variables[v] === undefined || variables[v] === null)

  return {
    valid: missing.length === 0,
    missingVariables: missing,
  }
}

/**
 * Render an SMS template with variables
 */
export async function renderSmsTemplate(
  tenantId: string,
  notificationType: string,
  variables: Record<string, string | number | undefined>
): Promise<{ content: string; characterCount: number; segmentCount: number } | null> {
  const template = await getSmsTemplateByType(tenantId, notificationType)

  if (!template) {
    return null
  }

  const content = substituteVariables(template.content, variables)
  const { characterCount, segmentCount } = calculateSegmentCount(content)

  return {
    content,
    characterCount,
    segmentCount,
  }
}

// ============================================================================
// Default Templates
// ============================================================================

/**
 * Default SMS templates for common notification types
 */
export const DEFAULT_SMS_TEMPLATES: Record<
  string,
  { content: string; availableVariables: string[] }
> = {
  order_shipped: {
    content:
      '{{brandName}}: Your order #{{orderNumber}} has shipped! Track at: {{trackingUrl}} Reply STOP to opt out.',
    availableVariables: ['brandName', 'orderNumber', 'trackingUrl'],
  },
  delivery_notification: {
    content:
      '{{brandName}}: Your order #{{orderNumber}} was delivered! Thank you for your purchase. Reply STOP to opt out.',
    availableVariables: ['brandName', 'orderNumber'],
  },
  payment_available: {
    content:
      '{{brandName}}: {{amount}} is available for payout! Log in to claim: {{portalUrl}} Reply STOP to opt out.',
    availableVariables: ['brandName', 'amount', 'portalUrl'],
  },
  payout_sent: {
    content:
      '{{brandName}}: Your payout of {{amount}} has been sent! It should arrive in 2-3 business days. Reply STOP to opt out.',
    availableVariables: ['brandName', 'amount'],
  },
  action_required: {
    content:
      '{{brandName}}: Action required on your account. Log in: {{portalUrl}} Reply STOP to opt out.',
    availableVariables: ['brandName', 'portalUrl'],
  },
  verification_code: {
    content:
      '{{brandName}}: Your verification code is {{code}}. It expires in 10 minutes.',
    availableVariables: ['brandName', 'code'],
  },
  security_alert: {
    content:
      '{{brandName}}: Security alert - {{alertMessage}}. If this wasn\'t you, contact support immediately.',
    availableVariables: ['brandName', 'alertMessage'],
  },
}

/**
 * Seed default SMS templates for a tenant
 */
export async function seedDefaultSmsTemplates(tenantId: string): Promise<void> {
  for (const [notificationType, template] of Object.entries(DEFAULT_SMS_TEMPLATES)) {
    await createSmsTemplate({
      tenantId,
      notificationType,
      content: template.content,
      availableVariables: template.availableVariables,
      isDefault: true,
    })
  }
}

/**
 * Get or create default template for a notification type
 */
export async function getOrCreateDefaultTemplate(
  tenantId: string,
  notificationType: string
): Promise<SmsTemplate | null> {
  // Check if template exists
  const existing = await getSmsTemplateByType(tenantId, notificationType)
  if (existing) {
    return existing
  }

  // Check if we have a default for this type
  const defaultTemplate = DEFAULT_SMS_TEMPLATES[notificationType]
  if (!defaultTemplate) {
    return null
  }

  // Create from default
  return createSmsTemplate({
    tenantId,
    notificationType,
    content: defaultTemplate.content,
    availableVariables: defaultTemplate.availableVariables,
    isDefault: true,
  })
}

// ============================================================================
// Template Preview
// ============================================================================

/**
 * Sample data for template preview
 */
export const SAMPLE_DATA: Record<string, Record<string, string>> = {
  order_shipped: {
    brandName: 'RAWDOG',
    orderNumber: '#12345',
    trackingUrl: 'https://track.example.com/abc123',
  },
  delivery_notification: {
    brandName: 'RAWDOG',
    orderNumber: '#12345',
  },
  payment_available: {
    brandName: 'RAWDOG',
    amount: '$150.00',
    portalUrl: 'https://portal.example.com',
  },
  payout_sent: {
    brandName: 'RAWDOG',
    amount: '$150.00',
  },
  action_required: {
    brandName: 'RAWDOG',
    portalUrl: 'https://portal.example.com',
  },
  verification_code: {
    brandName: 'RAWDOG',
    code: '123456',
  },
  security_alert: {
    brandName: 'RAWDOG',
    alertMessage: 'New login from unknown device',
  },
}

/**
 * Preview a template with sample data
 */
export function previewTemplate(
  content: string,
  notificationType: string,
  customVariables?: Record<string, string>
): {
  preview: string
  characterCount: number
  segmentCount: number
  encoding: 'GSM-7' | 'UCS-2'
} {
  const sampleData = {
    ...SAMPLE_DATA[notificationType],
    ...customVariables,
  }

  const preview = substituteVariables(content, sampleData)
  const stats = calculateSegmentCount(preview)

  return {
    preview,
    ...stats,
  }
}
