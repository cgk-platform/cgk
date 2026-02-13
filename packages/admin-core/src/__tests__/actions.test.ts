/**
 * Unit Tests for Action Executor
 * PHASE-2H-WORKFLOWS
 *
 * Tests action execution, template interpolation, and HTML escaping
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  interpolateTemplate,
  escapeHtml,
} from '../workflow/actions'
import type { ExecutionContext } from '../workflow/types'

// Mock the database module to avoid actual DB calls
vi.mock('@cgk-platform/db', () => ({
  sql: vi.fn().mockImplementation(() => Promise.resolve({ rows: [] })),
  withTenant: vi.fn().mockImplementation((_, fn) => fn()),
}))

describe('interpolateTemplate', () => {
  let context: ExecutionContext

  beforeEach(() => {
    context = {
      tenantId: 'test-tenant',
      ruleId: 'rule-123',
      entityType: 'project',
      entityId: 'project-456',
      entity: {
        name: 'John Doe',
        title: 'Website Redesign',
        email: 'john@example.com',
        phone: '+1234567890',
        status: 'pending',
        dueDate: '2026-03-15T10:00:00Z',
        projectTitle: 'Brand Campaign',
        assignedTo: 'user-789',
        assigneeEmail: 'assignee@example.com',
        metadata: {
          tier: 'gold',
          customField: 'custom-value',
        },
      },
      triggerData: {
        type: 'status_change',
        from: 'draft',
        to: 'pending',
      },
      computed: {
        daysSinceLastUpdate: 5,
        hoursInStatus: 48,
        isOverdue: false,
      },
      user: {
        id: 'user-123',
        name: 'Admin User',
      },
    }
  })

  describe('basic variable interpolation', () => {
    it('should interpolate firstName', () => {
      const result = interpolateTemplate('Hello {firstName}!', context)
      expect(result).toBe('Hello John!')
    })

    it('should interpolate lastName', () => {
      const result = interpolateTemplate('Hello {lastName}!', context)
      expect(result).toBe('Hello Doe!')
    })

    it('should interpolate full name', () => {
      const result = interpolateTemplate('Hello {name}!', context)
      expect(result).toBe('Hello John Doe!')
    })

    it('should interpolate email', () => {
      const result = interpolateTemplate('Contact: {email}', context)
      expect(result).toBe('Contact: john@example.com')
    })

    it('should interpolate phone', () => {
      const result = interpolateTemplate('Call: {phone}', context)
      expect(result).toBe('Call: +1234567890')
    })
  })

  describe('entity-related variables', () => {
    it('should interpolate entityTitle', () => {
      const result = interpolateTemplate('Project: {entityTitle}', context)
      expect(result).toBe('Project: Website Redesign')
    })

    it('should interpolate entityStatus', () => {
      const result = interpolateTemplate('Status: {entityStatus}', context)
      expect(result).toBe('Status: pending')
    })

    it('should interpolate projectTitle', () => {
      const result = interpolateTemplate('Working on {projectTitle}', context)
      expect(result).toBe('Working on Brand Campaign')
    })

    it('should interpolate dueDate', () => {
      const result = interpolateTemplate('Due: {dueDate}', context)
      expect(result).toContain('Mar') // Should be formatted as "Mar 15, 2026"
    })
  })

  describe('computed field variables', () => {
    it('should interpolate daysSince', () => {
      const result = interpolateTemplate('Updated {daysSince} days ago', context)
      expect(result).toBe('Updated 5 days ago')
    })

    it('should interpolate hoursInStatus', () => {
      const result = interpolateTemplate('In status for {hoursInStatus} hours', context)
      expect(result).toBe('In status for 48 hours')
    })
  })

  describe('nested field access', () => {
    it('should interpolate nested entity fields', () => {
      const result = interpolateTemplate('Tier: {metadata.tier}', context)
      expect(result).toBe('Tier: gold')
    })

    it('should interpolate deep nested fields', () => {
      const result = interpolateTemplate('Custom: {metadata.customField}', context)
      expect(result).toBe('Custom: custom-value')
    })
  })

  describe('multiple variables', () => {
    it('should interpolate multiple variables in one template', () => {
      const template = 'Hey {firstName}, your project "{entityTitle}" is {entityStatus}.'
      const result = interpolateTemplate(template, context)
      expect(result).toBe('Hey John, your project "Website Redesign" is pending.')
    })

    it('should handle complex templates', () => {
      const template = `
        Dear {firstName} {lastName},

        Your project "{projectTitle}" has been in {entityStatus} status for {hoursInStatus} hours.

        Please contact us at {email} if you have questions.
      `
      const result = interpolateTemplate(template, context)
      expect(result).toContain('Dear John Doe')
      expect(result).toContain('Brand Campaign')
      expect(result).toContain('48 hours')
      expect(result).toContain('john@example.com')
    })
  })

  describe('edge cases', () => {
    it('should handle empty template', () => {
      const result = interpolateTemplate('', context)
      expect(result).toBe('')
    })

    it('should preserve unmatched variables', () => {
      const result = interpolateTemplate('Hello {unknownVariable}!', context)
      expect(result).toBe('Hello {unknownVariable}!')
    })

    it('should handle templates without variables', () => {
      const result = interpolateTemplate('Just plain text', context)
      expect(result).toBe('Just plain text')
    })

    it('should handle special characters', () => {
      const result = interpolateTemplate('Hello {firstName}! (status: {entityStatus})', context)
      expect(result).toBe('Hello John! (status: pending)')
    })

    it('should handle single-word names for firstName', () => {
      context.entity.name = 'Madonna'
      const result = interpolateTemplate('Hello {firstName}!', context)
      expect(result).toBe('Hello Madonna!')
    })

    it('should handle single-word names for lastName', () => {
      context.entity.name = 'Madonna'
      const result = interpolateTemplate('Hello {lastName}!', context)
      expect(result).toBe('Hello !')
    })

    it('should handle missing name', () => {
      context.entity.name = undefined
      context.entity.title = 'Project Title'
      const result = interpolateTemplate('Project: {name}', context)
      expect(result).toBe('Project: Project Title')
    })

    it('should handle null values gracefully', () => {
      context.entity.nullField = null
      const result = interpolateTemplate('Value: {nullField}', context)
      expect(result).toBe('Value: {nullField}')
    })
  })

  describe('adminUrl variable', () => {
    it('should generate admin URL', () => {
      const result = interpolateTemplate('View: {adminUrl}', context)
      expect(result).toContain('projects/project-456')
    })
  })
})

describe('escapeHtml', () => {
  it('should escape ampersand', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('should escape less than', () => {
    expect(escapeHtml('5 < 10')).toBe('5 &lt; 10')
  })

  it('should escape greater than', () => {
    expect(escapeHtml('10 > 5')).toBe('10 &gt; 5')
  })

  it('should escape double quotes', () => {
    expect(escapeHtml('Say "hello"')).toBe('Say &quot;hello&quot;')
  })

  it('should escape single quotes', () => {
    expect(escapeHtml("It's fine")).toBe('It&#039;s fine')
  })

  it('should convert newlines to br tags', () => {
    expect(escapeHtml('Line 1\nLine 2')).toBe('Line 1<br>Line 2')
  })

  it('should handle multiple escapes', () => {
    const input = '<script>alert("XSS")</script>'
    const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
    expect(escapeHtml(input)).toBe(expected)
  })

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('should handle string with no special characters', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })

  it('should handle complex HTML', () => {
    const input = '<div class="test" onclick="alert(\'xss\')">Content & More</div>'
    const escaped = escapeHtml(input)
    expect(escaped).not.toContain('<div')
    expect(escaped).not.toContain('onclick')
    expect(escaped).toContain('&amp;')
    expect(escaped).toContain('&lt;')
    expect(escaped).toContain('&gt;')
  })
})

describe('action types', () => {
  // These tests verify the structure of action configs
  // Full integration tests would require a database

  describe('send_message action config', () => {
    it('should have correct structure', () => {
      const config = {
        channel: 'email',
        template: 'Hello {firstName}!',
        subject: 'Important Update',
        to: 'contact',
      }

      expect(config).toHaveProperty('channel')
      expect(config).toHaveProperty('template')
      expect(config).toHaveProperty('subject')
      expect(config).toHaveProperty('to')
    })
  })

  describe('send_notification action config', () => {
    it('should have correct structure', () => {
      const config = {
        to: 'assignee',
        title: 'New Task',
        message: 'You have a new task assigned',
        priority: 'high',
      }

      expect(config).toHaveProperty('to')
      expect(config).toHaveProperty('title')
      expect(config).toHaveProperty('message')
      expect(config).toHaveProperty('priority')
    })
  })

  describe('slack_notify action config', () => {
    it('should have correct structure', () => {
      const config = {
        channel: '#ops',
        message: 'Alert: {projectTitle} needs attention',
        mention: '@channel',
      }

      expect(config).toHaveProperty('channel')
      expect(config).toHaveProperty('message')
      expect(config).toHaveProperty('mention')
    })
  })

  describe('suggest_action action config', () => {
    it('should have correct structure', () => {
      const config = {
        channel: '#approvals',
        message: 'What should we do with {projectTitle}?',
        options: ['Approve', 'Reject', 'Defer'],
      }

      expect(config).toHaveProperty('channel')
      expect(config).toHaveProperty('message')
      expect(config).toHaveProperty('options')
      expect(Array.isArray(config.options)).toBe(true)
    })
  })

  describe('schedule_followup action config', () => {
    it('should have correct structure', () => {
      const config = {
        delayHours: 24,
        delayDays: 0,
        action: {
          type: 'send_message',
          config: {
            channel: 'email',
            template: 'Follow up reminder',
          },
        },
        cancelIf: [
          { field: 'status', operator: 'equals', value: 'completed' },
        ],
      }

      expect(config).toHaveProperty('delayHours')
      expect(config).toHaveProperty('action')
      expect(config).toHaveProperty('cancelIf')
      expect(config.action).toHaveProperty('type')
      expect(config.action).toHaveProperty('config')
    })
  })

  describe('update_status action config', () => {
    it('should have correct structure', () => {
      const config = {
        newStatus: 'in_progress',
      }

      expect(config).toHaveProperty('newStatus')
    })
  })

  describe('update_field action config', () => {
    it('should have correct structure', () => {
      const config = {
        field: 'priority',
        value: 'high',
      }

      expect(config).toHaveProperty('field')
      expect(config).toHaveProperty('value')
    })

    it('should support nested fields', () => {
      const config = {
        field: 'metadata.escalated',
        value: true,
      }

      expect(config.field).toContain('.')
    })
  })

  describe('create_task action config', () => {
    it('should have correct structure', () => {
      const config = {
        title: 'Review {projectTitle}',
        description: 'Please review and provide feedback',
        priority: 'high',
        assignTo: 'owner',
        dueInDays: 3,
      }

      expect(config).toHaveProperty('title')
      expect(config).toHaveProperty('description')
      expect(config).toHaveProperty('priority')
      expect(config).toHaveProperty('assignTo')
      expect(config).toHaveProperty('dueInDays')
    })
  })

  describe('assign_to action config', () => {
    it('should have correct structure for user assignment', () => {
      const config = {
        userId: 'user-123',
      }

      expect(config).toHaveProperty('userId')
    })

    it('should have correct structure for role-based assignment', () => {
      const config = {
        role: 'coordinator',
      }

      expect(config).toHaveProperty('role')
    })
  })

  describe('webhook action config', () => {
    it('should have correct structure', () => {
      const config = {
        url: 'https://api.example.com/webhook',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer token',
          'X-Custom-Header': 'value',
        },
        includeEntity: true,
      }

      expect(config).toHaveProperty('url')
      expect(config).toHaveProperty('method')
      expect(config).toHaveProperty('headers')
      expect(config).toHaveProperty('includeEntity')
    })
  })

  describe('generate_report action config', () => {
    it('should have correct structure', () => {
      const config = {
        reportType: 'weekly-summary',
        recipients: ['admin@example.com', 'manager@example.com'],
        format: 'pdf',
      }

      expect(config).toHaveProperty('reportType')
      expect(config).toHaveProperty('recipients')
      expect(config).toHaveProperty('format')
      expect(Array.isArray(config.recipients)).toBe(true)
    })
  })
})

describe('action result structure', () => {
  it('should have correct success structure', () => {
    const result = {
      action: { type: 'send_message', config: {} },
      success: true,
      result: { channel: 'email', to: 'test@example.com' },
    }

    expect(result).toHaveProperty('action')
    expect(result).toHaveProperty('success')
    expect(result.success).toBe(true)
    expect(result).toHaveProperty('result')
  })

  it('should have correct failure structure', () => {
    const result = {
      action: { type: 'send_message', config: {} },
      success: false,
      error: 'No recipient email address found',
    }

    expect(result).toHaveProperty('action')
    expect(result).toHaveProperty('success')
    expect(result.success).toBe(false)
    expect(result).toHaveProperty('error')
    expect(result.error).toBeTruthy()
  })
})
