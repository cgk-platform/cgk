import { describe, expect, it } from 'vitest'

import {
  extractTemplateVariables,
  formatCurrency,
  formatDate,
  getVariablesForType,
  htmlToPlainText,
  previewTemplate,
  substituteVariables,
  validateTemplateContent,
} from '../templates/index.js'

describe('substituteVariables', () => {
  it('replaces single variable', () => {
    const template = 'Hello {{name}}!'
    const variables = { name: 'John' }
    expect(substituteVariables(template, variables)).toBe('Hello John!')
  })

  it('replaces multiple variables', () => {
    const template = '{{greeting}} {{name}}, your order {{orderNumber}} is ready.'
    const variables = {
      greeting: 'Hello',
      name: 'John',
      orderNumber: 'ORD-123',
    }
    expect(substituteVariables(template, variables)).toBe(
      'Hello John, your order ORD-123 is ready.'
    )
  })

  it('keeps original placeholder if variable not provided', () => {
    const template = 'Hello {{name}}, your code is {{code}}'
    const variables = { name: 'John' }
    expect(substituteVariables(template, variables)).toBe(
      'Hello John, your code is {{code}}'
    )
  })

  it('handles Date objects', () => {
    const template = 'Event on {{date}}'
    // Use UTC date to avoid timezone issues
    const date = new Date(Date.UTC(2026, 2, 15)) // March 15, 2026
    const variables = { date }
    const result = substituteVariables(template, variables)
    expect(result).toContain('March')
    expect(result).toContain('2026')
    // Don't check exact day due to timezone variations
  })

  it('handles numbers', () => {
    const template = 'You have {{count}} items'
    const variables = { count: 5 }
    expect(substituteVariables(template, variables)).toBe('You have 5 items')
  })

  it('handles undefined values', () => {
    const template = 'Value: {{value}}'
    const variables = { value: undefined }
    expect(substituteVariables(template, variables)).toBe('Value: {{value}}')
  })
})

describe('htmlToPlainText', () => {
  it('converts links to text format', () => {
    const html = '<a href="https://example.com">Click here</a>'
    expect(htmlToPlainText(html)).toBe('Click here (https://example.com)')
  })

  it('converts paragraphs to newlines', () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p>'
    expect(htmlToPlainText(html)).toContain('First paragraph')
    expect(htmlToPlainText(html)).toContain('Second paragraph')
  })

  it('converts line breaks', () => {
    const html = 'Line 1<br>Line 2<br/>Line 3'
    const result = htmlToPlainText(html)
    expect(result).toBe('Line 1\nLine 2\nLine 3')
  })

  it('strips HTML tags', () => {
    const html = '<div><strong>Bold</strong> and <em>italic</em></div>'
    expect(htmlToPlainText(html)).toBe('Bold and italic')
  })

  it('decodes HTML entities', () => {
    const html = '&amp; &lt; &gt; &quot; &copy;'
    expect(htmlToPlainText(html)).toBe('& < > " (c)')
  })

  it('handles list items', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
    const result = htmlToPlainText(html)
    expect(result).toContain('- Item 1')
    expect(result).toContain('- Item 2')
  })
})

describe('formatDate', () => {
  it('formats date in long format', () => {
    // Use UTC date to avoid timezone issues
    const date = new Date(Date.UTC(2026, 2, 15)) // March 15, 2026
    const result = formatDate(date)
    expect(result).toContain('March')
    expect(result).toContain('2026')
    // Don't check exact day due to timezone variations
  })
})

describe('formatCurrency', () => {
  it('formats USD by default', () => {
    expect(formatCurrency(100)).toBe('$100.00')
    expect(formatCurrency(99.99)).toBe('$99.99')
  })

  it('formats other currencies', () => {
    expect(formatCurrency(100, 'EUR')).toContain('100')
  })
})

describe('extractTemplateVariables', () => {
  it('extracts single variable', () => {
    const template = 'Hello {{name}}'
    expect(extractTemplateVariables(template)).toEqual(['name'])
  })

  it('extracts multiple variables', () => {
    const template = '{{greeting}} {{name}}, your order {{orderNumber}}'
    expect(extractTemplateVariables(template)).toEqual(['greeting', 'name', 'orderNumber'])
  })

  it('returns unique variables', () => {
    const template = '{{name}} and {{name}} again'
    expect(extractTemplateVariables(template)).toEqual(['name'])
  })

  it('returns empty array for no variables', () => {
    const template = 'No variables here'
    expect(extractTemplateVariables(template)).toEqual([])
  })
})

describe('validateTemplateContent', () => {
  it('returns valid when all variables filled', () => {
    const template = { subject: '{{name}}', bodyHtml: '{{orderNumber}}' }
    const variables = { name: 'John', orderNumber: 'ORD-123' }
    const result = validateTemplateContent(template, variables)
    expect(result.valid).toBe(true)
    expect(result.missingVariables).toEqual([])
  })

  it('returns missing variables when some are empty', () => {
    const template = { subject: '{{name}}', bodyHtml: '{{code}}' }
    const variables = { name: 'John' }
    const result = validateTemplateContent(template, variables)
    expect(result.valid).toBe(false)
    expect(result.missingVariables).toEqual(['code'])
  })
})

describe('previewTemplate', () => {
  it('renders subject and body with variables', () => {
    const input = {
      subject: 'Hello {{name}}',
      bodyHtml: '<p>Your order {{orderNumber}} is ready.</p>',
      variables: { name: 'John', orderNumber: 'ORD-123' },
    }
    const result = previewTemplate(input)
    expect(result.subject).toBe('Hello John')
    expect(result.bodyHtml).toContain('Your order ORD-123 is ready.')
    expect(result.bodyText).toContain('Your order ORD-123 is ready.')
  })
})

describe('getVariablesForType', () => {
  it('returns common variables plus type-specific variables', () => {
    const variables = getVariablesForType('review_request')
    const keys = variables.map((v) => v.key)
    // Should have common variables
    expect(keys).toContain('brandName')
    expect(keys).toContain('websiteUrl')
    // Should have review-specific variables
    expect(keys).toContain('customerName')
    expect(keys).toContain('orderNumber')
    expect(keys).toContain('reviewUrl')
  })

  it('returns only common variables for unknown type', () => {
    const variables = getVariablesForType('unknown_type')
    const keys = variables.map((v) => v.key)
    expect(keys).toContain('brandName')
    expect(keys).not.toContain('customerName')
  })
})
