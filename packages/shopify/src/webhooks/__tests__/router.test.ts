/**
 * Webhook Router Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { routeToHandler, hasHandler, getRegisteredTopics, registerHandler } from '../router'

// Mock the handlers
vi.mock('../handlers/orders', () => ({
  handleOrderCreate: vi.fn(),
  handleOrderUpdate: vi.fn(),
  handleOrderPaid: vi.fn(),
  handleOrderCancelled: vi.fn(),
}))

vi.mock('../handlers/fulfillments', () => ({
  handleFulfillmentCreate: vi.fn(),
  handleFulfillmentUpdate: vi.fn(),
}))

vi.mock('../handlers/refunds', () => ({
  handleRefundCreate: vi.fn(),
}))

vi.mock('../handlers/customers', () => ({
  handleCustomerCreate: vi.fn(),
  handleCustomerUpdate: vi.fn(),
}))

vi.mock('../handlers/app', () => ({
  handleAppUninstalled: vi.fn(),
}))

describe('Webhook Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hasHandler', () => {
    it('should return true for registered topics', () => {
      expect(hasHandler('orders/create')).toBe(true)
      expect(hasHandler('orders/updated')).toBe(true)
      expect(hasHandler('customers/create')).toBe(true)
      expect(hasHandler('app/uninstalled')).toBe(true)
    })

    it('should return false for unregistered topics', () => {
      expect(hasHandler('unknown/topic')).toBe(false)
      expect(hasHandler('products/create')).toBe(false)
    })
  })

  describe('getRegisteredTopics', () => {
    it('should return all registered topics', () => {
      const topics = getRegisteredTopics()

      expect(topics).toContain('orders/create')
      expect(topics).toContain('orders/updated')
      expect(topics).toContain('orders/paid')
      expect(topics).toContain('orders/cancelled')
      expect(topics).toContain('orders/fulfilled')
      expect(topics).toContain('refunds/create')
      expect(topics).toContain('fulfillments/create')
      expect(topics).toContain('fulfillments/update')
      expect(topics).toContain('customers/create')
      expect(topics).toContain('customers/update')
      expect(topics).toContain('app/uninstalled')
    })
  })

  describe('routeToHandler', () => {
    it('should route orders/create to handleOrderCreate', async () => {
      const { handleOrderCreate } = await import('../handlers/orders')

      await routeToHandler('tenant123', 'orders/create', { id: 1 }, 'event123')

      expect(handleOrderCreate).toHaveBeenCalledWith(
        'tenant123',
        { id: 1 },
        'event123'
      )
    })

    it('should route customers/update to handleCustomerUpdate', async () => {
      const { handleCustomerUpdate } = await import('../handlers/customers')

      await routeToHandler('tenant456', 'customers/update', { id: 2 }, 'event456')

      expect(handleCustomerUpdate).toHaveBeenCalledWith(
        'tenant456',
        { id: 2 },
        'event456'
      )
    })

    it('should not throw for unregistered topics', async () => {
      await expect(
        routeToHandler('tenant789', 'unknown/topic', {}, 'event789')
      ).resolves.toBeUndefined()
    })
  })

  describe('registerHandler', () => {
    it('should allow registering custom handlers', async () => {
      const customHandler = vi.fn()

      registerHandler('products/create', customHandler)

      expect(hasHandler('products/create')).toBe(true)

      await routeToHandler('tenant', 'products/create', { id: 1 }, 'event')

      expect(customHandler).toHaveBeenCalledWith('tenant', { id: 1 }, 'event')
    })
  })
})
