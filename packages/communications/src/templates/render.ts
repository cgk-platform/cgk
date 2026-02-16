/**
 * Email Template Rendering
 *
 * Variable substitution and HTML to plain text conversion.
 *
 * @ai-pattern email-templates
 */

import { getTemplateForTenant } from './db.js'
import type { PreviewInput, RenderOptions, RenderedEmail } from './types.js'
import { getSampleDataForType } from './variables.js'

/**
 * Format a date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Substitute variables in a template string
 *
 * Variables are in the format {{variableName}}
 */
export function substituteVariables(
  template: string,
  variables: Record<string, string | number | Date | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key]

    if (value === undefined || value === null) {
      // Keep original placeholder if no value provided
      return match
    }

    if (value instanceof Date) {
      return formatDate(value)
    }

    return String(value)
  })
}

/**
 * Convert HTML to plain text for multipart emails
 */
export function htmlToPlainText(html: string): string {
  return (
    html
      // Convert links to text format: "text (url)"
      .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
      // Convert headers to text with newlines
      .replace(/<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi, '\n$1\n\n')
      // Convert line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      // Convert paragraphs
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      // Convert list items
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<\/li>/gi, '\n')
      // Convert divs to newlines
      .replace(/<\/div>/gi, '\n')
      .replace(/<div[^>]*>/gi, '')
      // Convert horizontal rules
      .replace(/<hr\s*\/?>/gi, '\n---\n')
      // Strip remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&mdash;/g, '--')
      .replace(/&ndash;/g, '-')
      .replace(/&copy;/g, '(c)')
      .replace(/&reg;/g, '(R)')
      .replace(/&trade;/g, '(TM)')
      // Clean up multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim()
  )
}

/**
 * Get default brand variables for a tenant
 */
async function getTenantBrandVariables(
  tenantSlug: string
): Promise<Record<string, string>> {
  // In a real implementation, fetch from tenant settings
  // For now, return placeholder values
  return {
    brandName: tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1),
    supportEmail: `support@${tenantSlug}.com`,
    websiteUrl: `https://${tenantSlug}.com`,
    unsubscribeUrl: `https://${tenantSlug}.com/unsubscribe`,
    currentYear: new Date().getFullYear().toString(),
  }
}

/**
 * Render an email template with variables
 */
export async function renderEmailTemplate(
  options: RenderOptions
): Promise<RenderedEmail> {
  const template = await getTemplateForTenant(
    options.tenantId,
    options.notificationType,
    options.templateKey
  )

  if (!template) {
    throw new Error(
      `Template not found: ${options.notificationType}/${options.templateKey || 'default'}`
    )
  }

  // Get brand variables
  const brandVariables = await getTenantBrandVariables(options.tenantId)

  // Merge all variables (provided variables override brand variables)
  const allVariables: Record<string, string | number | Date | undefined> = {
    ...brandVariables,
    ...options.variables,
  }

  // Render subject and body
  const subject = substituteVariables(template.subject, allVariables)
  const bodyHtml = substituteVariables(template.bodyHtml, allVariables)
  const bodyText = template.bodyText
    ? substituteVariables(template.bodyText, allVariables)
    : htmlToPlainText(bodyHtml)

  // Get sender info
  const senderAddress = template.senderEmail || brandVariables.supportEmail
  if (!senderAddress) {
    throw new Error('Sender email address is required (template.senderEmail or brandVariables.supportEmail)')
  }
  const senderName = template.senderName || brandVariables.brandName || 'Support'
  const replyTo = template.replyToEmail || undefined

  return {
    subject,
    bodyHtml,
    bodyText,
    senderAddress,
    senderName,
    replyTo,
  }
}

/**
 * Preview a template with sample or custom data
 */
export function previewTemplate(
  input: PreviewInput
): { subject: string; bodyHtml: string; bodyText: string } {
  const subject = substituteVariables(input.subject, input.variables)
  const bodyHtml = substituteVariables(input.bodyHtml, input.variables)
  const bodyText = htmlToPlainText(bodyHtml)

  return {
    subject,
    bodyHtml,
    bodyText,
  }
}

/**
 * Preview a template with sample data for a notification type
 */
export async function previewTemplateWithSampleData(
  tenantSlug: string,
  notificationType: string,
  templateKey?: string
): Promise<{ subject: string; bodyHtml: string; bodyText: string }> {
  const template = await getTemplateForTenant(tenantSlug, notificationType, templateKey)

  if (!template) {
    throw new Error(
      `Template not found: ${notificationType}/${templateKey || 'default'}`
    )
  }

  // Get brand variables
  const brandVariables = await getTenantBrandVariables(tenantSlug)

  // Get sample data for this notification type
  const sampleData = getSampleDataForType(notificationType)

  // Merge variables
  const allVariables = {
    ...brandVariables,
    ...sampleData,
  }

  return previewTemplate({
    subject: template.subject,
    bodyHtml: template.bodyHtml,
    variables: allVariables,
  })
}

/**
 * Extract variables used in a template
 */
export function extractTemplateVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g
  const variables: string[] = []
  let match

  while ((match = regex.exec(template)) !== null) {
    const varName = match[1]
    if (varName && !variables.includes(varName)) {
      variables.push(varName)
    }
  }

  return variables
}

/**
 * Validate that a template has all required variables filled
 */
export function validateTemplateContent(
  template: { subject: string; bodyHtml: string },
  variables: Record<string, unknown>
): { valid: boolean; missingVariables: string[] } {
  const usedVariables = [
    ...extractTemplateVariables(template.subject),
    ...extractTemplateVariables(template.bodyHtml),
  ]

  const uniqueVariables = Array.from(new Set(usedVariables))
  const missingVariables = uniqueVariables.filter(
    (v) => variables[v] === undefined || variables[v] === null || variables[v] === ''
  )

  return {
    valid: missingVariables.length === 0,
    missingVariables,
  }
}
