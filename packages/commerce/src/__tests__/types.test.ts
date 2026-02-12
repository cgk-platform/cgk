import { describe, it, expect } from 'vitest'
import type {
  CommerceProvider,
  ProductOperations,
  CartOperations,
  CheckoutOperations,
  OrderOperations,
  CustomerOperations,
  DiscountOperations,
  WebhookHandler,
  Product,
  Order,
  Cart,
  Customer,
  Discount,
  ListParams,
  PaginatedResult,
} from '../types'

/**
 * Type-level tests to ensure interfaces are correctly defined.
 * These verify the shape of the interfaces at compile time.
 */

describe('CommerceProvider interface', () => {
  it('has all required operation groups', () => {
    // This test validates the shape at compile time
    const mockProvider: CommerceProvider = {
      name: 'shopify',
      products: {} as ProductOperations,
      cart: {} as CartOperations,
      checkout: {} as CheckoutOperations,
      orders: {} as OrderOperations,
      customers: {} as CustomerOperations,
      discounts: {} as DiscountOperations,
      webhooks: {} as WebhookHandler,
    }

    expect(mockProvider.name).toBe('shopify')
    expect(mockProvider.products).toBeDefined()
    expect(mockProvider.cart).toBeDefined()
    expect(mockProvider.checkout).toBeDefined()
    expect(mockProvider.orders).toBeDefined()
    expect(mockProvider.customers).toBeDefined()
    expect(mockProvider.discounts).toBeDefined()
    expect(mockProvider.webhooks).toBeDefined()
  })

  it('Product interface has required fields', () => {
    const product: Product = {
      id: 'prod_1',
      title: 'Test Product',
      handle: 'test-product',
      description: 'A test product',
      tags: ['test'],
      variants: [],
      images: [],
      priceRange: {
        minVariantPrice: { amount: '10.00', currencyCode: 'USD' },
        maxVariantPrice: { amount: '20.00', currencyCode: 'USD' },
      },
      availableForSale: true,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    }

    expect(product.id).toBe('prod_1')
    expect(product.priceRange.minVariantPrice.amount).toBe('10.00')
  })

  it('Order interface has required fields', () => {
    const order: Order = {
      id: 'order_1',
      orderNumber: '#1001',
      totalPrice: { amount: '50.00', currencyCode: 'USD' },
      subtotalPrice: { amount: '45.00', currencyCode: 'USD' },
      lineItems: [],
      fulfillmentStatus: 'UNFULFILLED',
      financialStatus: 'PAID',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    }

    expect(order.id).toBe('order_1')
    expect(order.fulfillmentStatus).toBe('UNFULFILLED')
  })

  it('Cart interface has required fields', () => {
    const cart: Cart = {
      id: 'cart_1',
      checkoutUrl: 'https://checkout.shopify.com/123',
      totalQuantity: 2,
      cost: {
        subtotalAmount: { amount: '30.00', currencyCode: 'USD' },
        totalAmount: { amount: '33.00', currencyCode: 'USD' },
      },
      lines: [],
      discountCodes: [],
      discountAllocations: [],
      attributes: [],
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    }

    expect(cart.id).toBe('cart_1')
    expect(cart.totalQuantity).toBe(2)
  })

  it('Customer interface has required fields', () => {
    const customer: Customer = {
      id: 'cust_1',
      email: 'test@example.com',
      addresses: [],
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    }

    expect(customer.id).toBe('cust_1')
    expect(customer.email).toBe('test@example.com')
  })

  it('Discount interface has required fields', () => {
    const discount: Discount = {
      code: 'SAVE10',
      type: 'percentage',
      value: 10,
      usageCount: 5,
    }

    expect(discount.code).toBe('SAVE10')
    expect(discount.type).toBe('percentage')
  })

  it('ListParams has pagination fields', () => {
    const params: ListParams = {
      first: 20,
      after: 'cursor_abc',
      query: 'status:active',
      sortKey: 'CREATED_AT',
      reverse: true,
    }

    expect(params.first).toBe(20)
  })

  it('PaginatedResult wraps items with pageInfo', () => {
    const result: PaginatedResult<Product> = {
      items: [],
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: 'start',
        endCursor: 'end',
      },
    }

    expect(result.pageInfo.hasNextPage).toBe(true)
    expect(result.items).toHaveLength(0)
  })
})
