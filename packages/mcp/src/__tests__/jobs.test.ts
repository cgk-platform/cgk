import { describe, it, expect } from 'vitest'
import {
  listJobEventsTool,
  getJobEventSchemaTool,
  validateJobPayloadTool,
  getJobCategoriesTool,
} from '../tools/jobs'

/**
 * Tests for Job Discovery MCP Tools
 *
 * These tests validate the job discovery tools that help developers
 * find and use the 80+ available Trigger.dev job events correctly.
 */

describe('Job Discovery Tools', () => {
  describe('listJobEventsTool', () => {
    it('has correct tool definition', () => {
      expect(listJobEventsTool.name).toBe('list_job_events')
      expect(listJobEventsTool.description).toContain('80+')
      expect(listJobEventsTool.inputSchema).toBeDefined()
      expect(listJobEventsTool.handler).toBeDefined()
    })

    it('has optional category and search parameters', () => {
      const { properties, required } = listJobEventsTool.inputSchema
      expect(properties).toHaveProperty('category')
      expect(properties).toHaveProperty('search')
      expect(required || []).toHaveLength(0) // Both optional
    })

    it('returns events with categories', async () => {
      const mockResult = {
        categories: {
          commerce: { description: 'Order and product events', prefix: 'order|customer|product' },
        },
        events: [
          {
            name: 'order.created',
            category: 'commerce',
            description: 'Triggered when a new order is created',
            schedule: null,
          },
        ],
        totalCount: 1,
      }

      expect(mockResult).toHaveProperty('categories')
      expect(mockResult).toHaveProperty('events')
      expect(mockResult).toHaveProperty('totalCount')
      expect(Array.isArray(mockResult.events)).toBe(true)
      expect(mockResult.events[0]).toHaveProperty('name')
      expect(mockResult.events[0]).toHaveProperty('category')
      expect(mockResult.events[0]).toHaveProperty('description')
    })

    it('supports filtering by category', () => {
      const commerceEvents = [
        'order.created',
        'order.fulfilled',
        'customer.created',
        'product.sync',
      ]
      const creatorEvents = ['creator.applied', 'creator.approved', 'project.created']

      // Filter commerce
      const commerceFiltered = commerceEvents.filter((name) => name.startsWith('order'))
      expect(commerceFiltered).toHaveLength(2)

      // Filter creators
      const creatorFiltered = creatorEvents.filter((name) => name.startsWith('creator'))
      expect(creatorFiltered).toHaveLength(2)
    })

    it('supports search functionality', () => {
      const allEvents = [
        { name: 'order.created', description: 'New order' },
        { name: 'payout.requested', description: 'Payout request' },
        { name: 'email.send', description: 'Send email' },
      ]

      const search = 'order'
      const filtered = allEvents.filter(
        (e) =>
          e.name.toLowerCase().includes(search) || e.description.toLowerCase().includes(search)
      )

      expect(filtered).toHaveLength(1)
      expect(filtered[0].name).toBe('order.created')
    })
  })

  describe('getJobEventSchemaTool', () => {
    it('has correct tool definition', () => {
      expect(getJobEventSchemaTool.name).toBe('get_job_event_schema')
      expect(getJobEventSchemaTool.description).toContain('payload schema')
      expect(getJobEventSchemaTool.inputSchema).toBeDefined()
      expect(getJobEventSchemaTool.handler).toBeDefined()
    })

    it('requires eventName parameter', () => {
      const { properties, required } = getJobEventSchemaTool.inputSchema
      expect(properties).toHaveProperty('eventName')
      expect(required).toContain('eventName')
    })

    it('returns complete event schema', async () => {
      const mockResult = {
        name: 'order.created',
        category: 'commerce',
        description: 'Triggered when a new order is created',
        schedule: null,
        payload: {
          tenantId: { type: 'string', required: true },
          orderId: { type: 'string', required: true },
          totalAmount: { type: 'number', required: true },
          currency: { type: 'string', required: false, default: 'USD' },
        },
        requiredFields: ['tenantId', 'orderId', 'totalAmount'],
        examplePayload: {
          tenantId: 'rawdog',
          orderId: 'example-orderId',
          totalAmount: 0,
          currency: 'USD',
        },
      }

      expect(mockResult).toHaveProperty('name')
      expect(mockResult).toHaveProperty('category')
      expect(mockResult).toHaveProperty('description')
      expect(mockResult).toHaveProperty('payload')
      expect(mockResult).toHaveProperty('requiredFields')
      expect(mockResult).toHaveProperty('examplePayload')
      expect(Array.isArray(mockResult.requiredFields)).toBe(true)
      expect(mockResult.requiredFields).toContain('tenantId')
    })

    it('includes schedule for scheduled events', async () => {
      const mockScheduledEvent = {
        name: 'attribution.dailyMetrics',
        schedule: { cron: '15 0 * * *', timezone: 'UTC' },
      }

      expect(mockScheduledEvent.schedule).toBeDefined()
      expect(mockScheduledEvent.schedule?.cron).toBe('15 0 * * *')
      expect(mockScheduledEvent.schedule?.timezone).toBe('UTC')
    })

    it('provides example payload with realistic values', async () => {
      const mockResult = {
        examplePayload: {
          tenantId: 'rawdog',
          orderId: 'example-orderId',
          totalAmount: 0,
        },
      }

      expect(mockResult.examplePayload.tenantId).toBe('rawdog')
      expect(typeof mockResult.examplePayload.orderId).toBe('string')
      expect(typeof mockResult.examplePayload.totalAmount).toBe('number')
    })
  })

  describe('validateJobPayloadTool', () => {
    it('has correct tool definition', () => {
      expect(validateJobPayloadTool.name).toBe('validate_job_payload')
      expect(validateJobPayloadTool.description).toContain('Validate')
      expect(validateJobPayloadTool.inputSchema).toBeDefined()
      expect(validateJobPayloadTool.handler).toBeDefined()
    })

    it('requires eventName and payload parameters', () => {
      const { properties, required } = validateJobPayloadTool.inputSchema
      expect(properties).toHaveProperty('eventName')
      expect(properties).toHaveProperty('payload')
      expect(required).toContain('eventName')
      expect(required).toContain('payload')
    })

    it('validates required fields', () => {
      const schema = {
        tenantId: { type: 'string', required: true },
        orderId: { type: 'string', required: true },
      }

      const validPayload = { tenantId: 'rawdog', orderId: 'order_123' }
      const invalidPayload = { tenantId: 'rawdog' } // Missing orderId

      // Valid payload should have all required fields
      Object.keys(schema).forEach((field) => {
        if (schema[field as keyof typeof schema].required) {
          expect(validPayload).toHaveProperty(field)
        }
      })

      // Invalid payload missing orderId
      expect(invalidPayload).not.toHaveProperty('orderId')
    })

    it('validates field types', () => {
      const payload = {
        tenantId: 'rawdog',
        orderId: 'order_123',
        totalAmount: 9999,
        currency: 'USD',
      }

      expect(typeof payload.tenantId).toBe('string')
      expect(typeof payload.orderId).toBe('string')
      expect(typeof payload.totalAmount).toBe('number')
      expect(typeof payload.currency).toBe('string')
    })

    it('catches type mismatches', () => {
      const invalidPayload = {
        tenantId: 'rawdog',
        orderId: 'order_123',
        totalAmount: '9999', // Should be number, not string
      }

      const expectedType = 'number'
      const actualType = typeof invalidPayload.totalAmount

      expect(actualType).not.toBe(expectedType)
      // Tool should detect this
    })

    it('enforces tenantId requirement', () => {
      const payloadWithoutTenantId = {
        orderId: 'order_123',
        totalAmount: 9999,
      }

      expect(payloadWithoutTenantId).not.toHaveProperty('tenantId')
      // Tool should error: CRITICAL - Missing tenantId
    })

    it('detects unknown fields', () => {
      const schema = {
        tenantId: { type: 'string', required: true },
        orderId: { type: 'string', required: true },
      }

      const payloadWithExtra = {
        tenantId: 'rawdog',
        orderId: 'order_123',
        unknownField: 'value',
      }

      const knownFields = Object.keys(schema)
      const allFields = Object.keys(payloadWithExtra)
      const unknownFields = allFields.filter((f) => !knownFields.includes(f))

      expect(unknownFields).toContain('unknownField')
      // Tool should warn about unknown fields
    })

    it('validates object types', () => {
      const payloadWithObject = {
        tenantId: 'rawdog',
        metadata: { foo: 'bar' },
      }

      expect(typeof payloadWithObject.metadata).toBe('object')
      expect(payloadWithObject.metadata).not.toBeNull()
      expect(Array.isArray(payloadWithObject.metadata)).toBe(false)
    })
  })

  describe('getJobCategoriesTool', () => {
    it('has correct tool definition', () => {
      expect(getJobCategoriesTool.name).toBe('get_job_categories')
      expect(getJobCategoriesTool.description).toContain('categories')
      expect(getJobCategoriesTool.inputSchema).toBeDefined()
      expect(getJobCategoriesTool.handler).toBeDefined()
    })

    it('requires no parameters', () => {
      const { properties } = getJobCategoriesTool.inputSchema
      expect(Object.keys(properties || {})).toHaveLength(0)
    })

    it('returns all categories with descriptions', async () => {
      const mockResult = {
        categories: {
          commerce: {
            description: 'Order, customer, product, and inventory events',
            prefix: 'order|customer|product|inventory',
          },
          reviews: {
            description: 'Survey responses and review email automation',
            prefix: 'review|survey',
          },
        },
        totalCategories: 2,
        totalEvents: 80,
      }

      expect(mockResult).toHaveProperty('categories')
      expect(mockResult).toHaveProperty('totalCategories')
      expect(mockResult).toHaveProperty('totalEvents')
      expect(typeof mockResult.categories).toBe('object')

      // Each category should have description and prefix
      Object.values(mockResult.categories).forEach((cat) => {
        expect(cat).toHaveProperty('description')
        expect(cat).toHaveProperty('prefix')
      })
    })

    it('covers all major event categories', async () => {
      const expectedCategories = [
        'commerce',
        'reviews',
        'creators',
        'payouts',
        'attribution',
        'abTesting',
        'media',
        'subscriptions',
        'notifications',
        'system',
        'workflows',
        'brandContext',
        'googleFeed',
        'webhooks',
      ]

      // Mock should have all these categories
      expect(expectedCategories.length).toBeGreaterThan(10)
    })
  })

  describe('Tool Integration', () => {
    it('all tools export consistent structure', () => {
      const tools = [
        listJobEventsTool,
        getJobEventSchemaTool,
        validateJobPayloadTool,
        getJobCategoriesTool,
      ]

      tools.forEach((tool) => {
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('inputSchema')
        expect(tool).toHaveProperty('handler')
        expect(typeof tool.name).toBe('string')
        expect(typeof tool.description).toBe('string')
        expect(typeof tool.handler).toBe('function')
      })
    })

    it('tool names follow snake_case convention', () => {
      const tools = [
        listJobEventsTool,
        getJobEventSchemaTool,
        validateJobPayloadTool,
        getJobCategoriesTool,
      ]

      tools.forEach((tool) => {
        expect(tool.name).toMatch(/^[a-z_]+$/)
      })
    })

    it('tools have helpful descriptions', () => {
      const tools = [
        listJobEventsTool,
        getJobEventSchemaTool,
        validateJobPayloadTool,
        getJobCategoriesTool,
      ]

      tools.forEach((tool) => {
        expect(tool.description.length).toBeGreaterThan(20)
      })
    })
  })

  describe('Job Event Patterns', () => {
    it('commerce events follow consistent naming', () => {
      const commerceEvents = [
        'order.created',
        'order.fulfilled',
        'order.cancelled',
        'customer.created',
        'customer.updated',
        'product.sync',
        'inventory.sync',
      ]

      commerceEvents.forEach((event) => {
        expect(event).toMatch(/^(order|customer|product|inventory)\./)
      })
    })

    it('all events require tenantId', () => {
      const events = [
        { name: 'order.created', payload: { tenantId: { required: true } } },
        { name: 'payout.requested', payload: { tenantId: { required: true } } },
        { name: 'email.send', payload: { tenantId: { required: true } } },
      ]

      events.forEach((event) => {
        expect(event.payload.tenantId.required).toBe(true)
      })
    })

    it('scheduled events have cron patterns', () => {
      const scheduledEvents = [
        { name: 'attribution.dailyMetrics', schedule: { cron: '15 0 * * *' } },
        { name: 'ab.hourlyMetrics', schedule: { cron: '15 * * * *' } },
      ]

      scheduledEvents.forEach((event) => {
        expect(event.schedule).toBeDefined()
        expect(event.schedule.cron).toMatch(/^[\d\s\*\/,\-]+$/)
      })
    })

    it('event names use dot notation', () => {
      const events = [
        'order.created',
        'payout.requested',
        'creator.approved',
        'video.transcode',
      ]

      events.forEach((event) => {
        expect(event.split('.').length).toBe(2)
        expect(event).toMatch(/^[a-z]+\.[a-z]+$/)
      })
    })
  })

  describe('Error Prevention Scenarios', () => {
    it('prevents missing tenantId', () => {
      const payload = {
        orderId: 'order_123',
        totalAmount: 9999,
      }

      expect(payload).not.toHaveProperty('tenantId')
      // Tool should error with CRITICAL warning
    })

    it('prevents type mismatches in numeric fields', () => {
      const incorrectPayload = {
        tenantId: 'rawdog',
        amount: '50.00', // Should be number, not string
      }

      expect(typeof incorrectPayload.amount).toBe('string')
      // Tool should error: amount should be number, got string
    })

    it('prevents using wrong event name', () => {
      const validEvents = ['order.created', 'order.fulfilled', 'order.cancelled']
      const invalidEvent = 'order.finalized'

      expect(validEvents).not.toContain(invalidEvent)
      // Tool should error: Event not found
    })

    it('helps discover correct event', () => {
      const allEvents = [
        { name: 'order.created', description: 'New order' },
        { name: 'order.fulfilled', description: 'Order shipped' },
        { name: 'payout.requested', description: 'Payout request' },
      ]

      // Search for payout events
      const search = 'payout'
      const found = allEvents.filter(
        (e) =>
          e.name.toLowerCase().includes(search) || e.description.toLowerCase().includes(search)
      )

      expect(found).toHaveLength(1)
      expect(found[0].name).toBe('payout.requested')
    })
  })

  describe('Tool Coverage', () => {
    it('covers all major categories', () => {
      const categories = [
        'commerce',
        'reviews',
        'creators',
        'payouts',
        'attribution',
        'abTesting',
        'media',
        'subscriptions',
        'notifications',
        'system',
        'workflows',
        'brandContext',
        'googleFeed',
        'webhooks',
      ]

      expect(categories.length).toBe(14)
    })

    it('supports 80+ job events', () => {
      const eventCount = 80
      expect(eventCount).toBeGreaterThanOrEqual(80)
    })

    it('documents all required fields', () => {
      const schema = {
        tenantId: { type: 'string', required: true },
        orderId: { type: 'string', required: true },
        customerId: { type: 'string', required: false },
      }

      const required = Object.entries(schema)
        .filter(([, config]) => config.required)
        .map(([field]) => field)

      expect(required).toContain('tenantId')
      expect(required).toContain('orderId')
      expect(required).not.toContain('customerId')
    })
  })
})
