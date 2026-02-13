/**
 * Unit Tests for Row Transformation
 *
 * Tests the transformation logic for each table type,
 * edge cases, and data normalization.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  transformRow,
  transformBatch,
  snakeToCamel,
  camelToSnake,
  getTransformFunction,
  validateTransformedRow,
  type TransformContext,
  type DatabaseRow,
} from '../../lib/transform-row.js'
import {
  ORDER_FIXTURES,
  CREATOR_FIXTURES,
  REVIEW_FIXTURES,
  WITHDRAWAL_REQUEST_FIXTURES,
  BLOG_POST_FIXTURES,
  ATTRIBUTION_TOUCHPOINT_FIXTURES,
  ESIGN_DOCUMENT_FIXTURES,
  EDGE_CASES,
} from '../fixtures/test-data.js'

describe('String Case Conversion', () => {
  it('converts snake_case to camelCase', () => {
    expect(snakeToCamel('hello_world')).toBe('helloWorld')
    expect(snakeToCamel('first_name')).toBe('firstName')
    expect(snakeToCamel('order_id')).toBe('orderId')
    expect(snakeToCamel('created_at_utc')).toBe('createdAtUtc')
  })

  it('handles single words', () => {
    expect(snakeToCamel('id')).toBe('id')
    expect(snakeToCamel('name')).toBe('name')
  })

  it('converts camelCase to snake_case', () => {
    expect(camelToSnake('helloWorld')).toBe('hello_world')
    expect(camelToSnake('firstName')).toBe('first_name')
    expect(camelToSnake('orderId')).toBe('order_id')
  })
})

describe('Generic Row Transformation', () => {
  const baseContext: TransformContext = {
    sourceTable: 'test_table',
    targetTable: 'test_table',
    tenantSlug: 'rawdog',
    encryptSensitive: false,
  }

  it('normalizes null and undefined values', () => {
    const row: DatabaseRow = {
      id: '123',
      name: null,
      description: undefined,
    }

    const result = transformRow(row, baseContext)

    expect(result.id).toBe('123')
    expect(result.name).toBeNull()
    expect(result.description).toBeNull()
  })

  it('converts Date objects to ISO strings', () => {
    const testDate = new Date('2024-06-15T10:30:00Z')
    const row: DatabaseRow = {
      id: '123',
      created_at: testDate,
    }

    const result = transformRow(row, baseContext)

    expect(result.created_at).toBe('2024-06-15T10:30:00.000Z')
  })

  it('converts BigInt to string', () => {
    const row: DatabaseRow = {
      id: '123',
      large_number: BigInt('9007199254740991'),
    }

    const result = transformRow(row, baseContext)

    expect(result.large_number).toBe('9007199254740991')
  })

  it('rounds cents values to integers', () => {
    const row: DatabaseRow = {
      id: '123',
      total_cents: 1999.5,
      tax_cents: 99.4,
    }

    const result = transformRow(row, baseContext)

    expect(result.total_cents).toBe(2000)
    expect(result.tax_cents).toBe(99)
  })

  it('parses string percentages to floats', () => {
    const row: DatabaseRow = {
      id: '123',
      discount_pct: '15.5',
      tax_rate: '8.25',
    }

    const result = transformRow(row, baseContext)

    expect(result.discount_pct).toBe(15.5)
    expect(result.tax_rate).toBe(8.25)
  })

  it('handles invalid percentage strings', () => {
    const row: DatabaseRow = {
      id: '123',
      discount_pct: 'invalid',
    }

    const result = transformRow(row, baseContext)

    expect(result.discount_pct).toBeNull()
  })

  it('preserves arrays', () => {
    const row: DatabaseRow = {
      id: '123',
      tags: ['a', 'b', 'c'],
    }

    const result = transformRow(row, baseContext)

    expect(result.tags).toEqual(['a', 'b', 'c'])
  })

  it('preserves objects', () => {
    const row: DatabaseRow = {
      id: '123',
      metadata: { key: 'value', nested: { a: 1 } },
    }

    const result = transformRow(row, baseContext)

    expect(result.metadata).toEqual({ key: 'value', nested: { a: 1 } })
  })
})

describe('Order Row Transformation', () => {
  const context: TransformContext = {
    sourceTable: 'orders',
    targetTable: 'orders',
    tenantSlug: 'rawdog',
    encryptSensitive: false,
  }

  it('normalizes gross_sales_cents from string', () => {
    const row: DatabaseRow = {
      ...ORDER_FIXTURES[2], // Has string gross_sales_cents
    }

    const result = transformRow(row, context)

    expect(typeof result.gross_sales_cents).toBe('number')
    expect(result.gross_sales_cents).toBe(2999)
  })

  it('normalizes total_cents from float', () => {
    const row: DatabaseRow = {
      id: 'test',
      total_cents: 1999.99,
    }

    const result = transformRow(row, context)

    expect(result.total_cents).toBe(2000)
  })

  it('parses JSON string line_items', () => {
    const row: DatabaseRow = {
      ...ORDER_FIXTURES[1], // Has JSON string line_items
    }

    const result = transformRow(row, context)

    expect(Array.isArray(result.line_items)).toBe(true)
    expect(result.line_items).toHaveLength(1)
  })

  it('handles invalid JSON line_items', () => {
    const row: DatabaseRow = {
      id: 'test',
      line_items: 'invalid json',
    }

    const result = transformRow(row, context)

    expect(result.line_items).toEqual([])
  })

  it('normalizes status values to lowercase', () => {
    const row: DatabaseRow = {
      ...ORDER_FIXTURES[2], // Has uppercase statuses
    }

    const result = transformRow(row, context)

    expect(result.status).toBe('cancelled')
    expect(result.fulfillment_status).toBe('unfulfilled')
    expect(result.financial_status).toBe('refunded')
  })
})

describe('Creator Row Transformation', () => {
  const context: TransformContext = {
    sourceTable: 'creators',
    targetTable: 'creators',
    tenantSlug: 'rawdog',
    encryptSensitive: false,
  }

  it('maps commission_rate to commission_rate_pct', () => {
    const row: DatabaseRow = {
      ...CREATOR_FIXTURES[0], // Has commission_rate
    }

    const result = transformRow(row, context)

    expect(result.commission_rate_pct).toBe(15.5)
    expect(result.commission_rate).toBeUndefined()
  })

  it('maps commission_percent string to commission_rate_pct', () => {
    const row: DatabaseRow = {
      ...CREATOR_FIXTURES[1], // Has commission_percent as string
    }

    const result = transformRow(row, context)

    expect(result.commission_rate_pct).toBe(10.0)
    expect(result.commission_percent).toBeUndefined()
  })

  it('parses JSON string social_profiles', () => {
    const row: DatabaseRow = {
      ...CREATOR_FIXTURES[1], // Has JSON string social_profiles
    }

    const result = transformRow(row, context)

    expect(typeof result.social_profiles).toBe('object')
    expect(result.social_profiles).toEqual({})
  })

  it('handles null social_profiles', () => {
    const row: DatabaseRow = {
      id: 'test',
      social_profiles: null,
    }

    const result = transformRow(row, context)

    expect(result.social_profiles).toEqual({})
  })

  it('normalizes tier and status to lowercase', () => {
    const row: DatabaseRow = {
      ...CREATOR_FIXTURES[1], // Has uppercase tier and status
    }

    const result = transformRow(row, context)

    expect(result.status).toBe('pending')
    expect(result.tier).toBe('bronze')
  })
})

describe('Withdrawal Request (Payout) Transformation', () => {
  const context: TransformContext = {
    sourceTable: 'withdrawal_requests',
    targetTable: 'payouts',
    tenantSlug: 'rawdog',
    encryptSensitive: false,
  }

  it('maps withdrawal request fields to payout schema', () => {
    const row: DatabaseRow = {
      ...WITHDRAWAL_REQUEST_FIXTURES[0],
    }

    const result = transformRow(row, context)

    expect(result.id).toBe(row.id)
    expect(result.creator_id).toBe(row.creator_id)
    expect(result.currency).toBe('USD')
    expect(result.method).toBe('paypal')
  })

  it('maps status values correctly', () => {
    // Test approved -> completed
    let result = transformRow(WITHDRAWAL_REQUEST_FIXTURES[0], context)
    expect(result.status).toBe('completed')

    // Test requested -> pending
    result = transformRow(WITHDRAWAL_REQUEST_FIXTURES[1], context)
    expect(result.status).toBe('pending')

    // Test rejected -> failed
    result = transformRow(WITHDRAWAL_REQUEST_FIXTURES[2], context)
    expect(result.status).toBe('failed')
  })

  it('calculates net_amount_cents', () => {
    const row: DatabaseRow = {
      ...WITHDRAWAL_REQUEST_FIXTURES[0],
    }

    const result = transformRow(row, context)

    const expectedNet = (row.amount_cents as number) - (row.fee_cents as number)
    expect(result.net_amount_cents).toBe(expectedNet)
  })

  it('maps old column names to new names', () => {
    const row: DatabaseRow = {
      ...WITHDRAWAL_REQUEST_FIXTURES[0],
    }

    const result = transformRow(row, context)

    // bank_details -> payout_details
    expect(result.payout_details).toBeDefined()
    // admin_notes -> notes
    expect(result.notes).toBe(row.admin_notes)
  })

  it('maps rejection_reason to failure_reason', () => {
    const row: DatabaseRow = {
      ...WITHDRAWAL_REQUEST_FIXTURES[2], // Has rejection_reason
    }

    const result = transformRow(row, context)

    expect(result.failure_reason).toBe('Insufficient balance')
  })
})

describe('Review Row Transformation', () => {
  const context: TransformContext = {
    sourceTable: 'reviews',
    targetTable: 'reviews',
    tenantSlug: 'rawdog',
    encryptSensitive: false,
  }

  it('clamps rating to 1-5 range', () => {
    const row: DatabaseRow = {
      ...REVIEW_FIXTURES[2], // Has rating of 10
    }

    const result = transformRow(row, context)

    expect(result.rating).toBe(5)
  })

  it('clamps low ratings to minimum 1', () => {
    const row: DatabaseRow = {
      id: 'test',
      rating: 0,
    }

    const result = transformRow(row, context)

    expect(result.rating).toBe(1)
  })

  it('converts string ratings to integers', () => {
    const row: DatabaseRow = {
      ...REVIEW_FIXTURES[3], // Has string rating
    }

    const result = transformRow(row, context)

    expect(result.rating).toBe(4)
    expect(typeof result.rating).toBe('number')
  })

  it('normalizes status to lowercase and validates', () => {
    const row: DatabaseRow = {
      ...REVIEW_FIXTURES[2], // Has uppercase status
    }

    const result = transformRow(row, context)

    expect(result.status).toBe('approved')
  })

  it('handles invalid status values', () => {
    const row: DatabaseRow = {
      id: 'test',
      status: 'INVALID_STATUS',
    }

    const result = transformRow(row, context)

    expect(result.status).toBe('pending')
  })
})

describe('Blog Post Row Transformation', () => {
  const context: TransformContext = {
    sourceTable: 'blog_posts',
    targetTable: 'blog_posts',
    tenantSlug: 'rawdog',
    encryptSensitive: false,
  }

  it('normalizes status to lowercase', () => {
    const row: DatabaseRow = {
      ...BLOG_POST_FIXTURES[1], // Has uppercase status
    }

    const result = transformRow(row, context)

    expect(result.status).toBe('draft')
  })

  it('handles invalid status values', () => {
    const row: DatabaseRow = {
      id: 'test',
      status: 'INVALID',
    }

    const result = transformRow(row, context)

    expect(result.status).toBe('draft')
  })

  it('parses JSON string tags', () => {
    const row: DatabaseRow = {
      ...BLOG_POST_FIXTURES[1], // Has JSON string tags
    }

    const result = transformRow(row, context)

    expect(Array.isArray(result.tags)).toBe(true)
    expect(result.tags).toEqual(['draft'])
  })

  it('handles invalid JSON tags', () => {
    const row: DatabaseRow = {
      id: 'test',
      tags: 'not valid json',
    }

    const result = transformRow(row, context)

    expect(result.tags).toEqual([])
  })
})

describe('Attribution Touchpoint Transformation', () => {
  const context: TransformContext = {
    sourceTable: 'attribution_touchpoints',
    targetTable: 'attribution_touchpoints',
    tenantSlug: 'rawdog',
    encryptSensitive: false,
  }

  it('normalizes channel to lowercase', () => {
    const row: DatabaseRow = {
      ...ATTRIBUTION_TOUCHPOINT_FIXTURES[0], // Has uppercase channel
    }

    const result = transformRow(row, context)

    expect(result.channel).toBe('organic')
  })

  it('normalizes touchpoint_type to lowercase', () => {
    const row: DatabaseRow = {
      ...ATTRIBUTION_TOUCHPOINT_FIXTURES[0], // Has uppercase touchpoint_type
    }

    const result = transformRow(row, context)

    expect(result.touchpoint_type).toBe('first_click')
  })
})

describe('E-Sign Document Transformation', () => {
  const context: TransformContext = {
    sourceTable: 'esign_documents',
    targetTable: 'esign_documents',
    tenantSlug: 'rawdog',
    encryptSensitive: false,
  }

  it('normalizes status to lowercase', () => {
    const row: DatabaseRow = {
      ...ESIGN_DOCUMENT_FIXTURES[1], // Has uppercase status
    }

    const result = transformRow(row, context)

    expect(result.status).toBe('pending')
  })

  it('handles invalid status values', () => {
    const row: DatabaseRow = {
      id: 'test',
      status: 'UNKNOWN_STATUS',
    }

    const result = transformRow(row, context)

    expect(result.status).toBe('draft')
  })
})

describe('Batch Transformation', () => {
  const context: TransformContext = {
    sourceTable: 'orders',
    targetTable: 'orders',
    tenantSlug: 'rawdog',
    encryptSensitive: false,
  }

  it('transforms multiple rows', () => {
    const results = transformBatch(ORDER_FIXTURES, context)

    expect(results).toHaveLength(ORDER_FIXTURES.length)
    results.forEach((result) => {
      expect(typeof result.status).toBe('string')
    })
  })

  it('handles empty batch', () => {
    const results = transformBatch([], context)

    expect(results).toEqual([])
  })
})

describe('Transform Function Lookup', () => {
  it('returns transformer for known tables', () => {
    expect(getTransformFunction('orders')).not.toBeNull()
    expect(getTransformFunction('creators')).not.toBeNull()
    expect(getTransformFunction('reviews')).not.toBeNull()
    expect(getTransformFunction('withdrawal_requests')).not.toBeNull()
    expect(getTransformFunction('payouts')).not.toBeNull()
    expect(getTransformFunction('blog_posts')).not.toBeNull()
  })

  it('returns null for unknown tables', () => {
    expect(getTransformFunction('unknown_table')).toBeNull()
    expect(getTransformFunction('')).toBeNull()
  })
})

describe('Row Validation', () => {
  it('validates required fields are present', () => {
    const row: DatabaseRow = {
      id: '123',
      name: 'Test',
      email: 'test@example.com',
    }

    const result = validateTransformedRow(row, ['id', 'name'])

    expect(result.valid).toBe(true)
    expect(result.missingFields).toEqual([])
  })

  it('detects missing required fields', () => {
    const row: DatabaseRow = {
      id: '123',
    }

    const result = validateTransformedRow(row, ['id', 'name', 'email'])

    expect(result.valid).toBe(false)
    expect(result.missingFields).toContain('name')
    expect(result.missingFields).toContain('email')
  })

  it('treats null as missing', () => {
    const row: DatabaseRow = {
      id: '123',
      name: null,
    }

    const result = validateTransformedRow(row, ['id', 'name'])

    expect(result.valid).toBe(false)
    expect(result.missingFields).toContain('name')
  })

  it('treats undefined as missing', () => {
    const row: DatabaseRow = {
      id: '123',
      name: undefined,
    }

    const result = validateTransformedRow(row, ['id', 'name'])

    expect(result.valid).toBe(false)
    expect(result.missingFields).toContain('name')
  })
})

describe('Edge Cases', () => {
  const baseContext: TransformContext = {
    sourceTable: 'test_table',
    targetTable: 'test_table',
    tenantSlug: 'rawdog',
    encryptSensitive: false,
  }

  it('handles very long strings', () => {
    const row: DatabaseRow = {
      id: '123',
      description: EDGE_CASES.longString,
    }

    const result = transformRow(row, baseContext)

    expect(result.description).toBe(EDGE_CASES.longString)
  })

  it('handles special characters', () => {
    const row: DatabaseRow = {
      id: '123',
      name: EDGE_CASES.specialChars,
    }

    const result = transformRow(row, baseContext)

    expect(result.name).toBe(EDGE_CASES.specialChars)
  })

  it('handles unicode text', () => {
    const row: DatabaseRow = {
      id: '123',
      name: EDGE_CASES.unicodeText,
    }

    const result = transformRow(row, baseContext)

    expect(result.name).toBe(EDGE_CASES.unicodeText)
  })

  it('handles large numbers', () => {
    const row: DatabaseRow = {
      id: '123',
      count: EDGE_CASES.largeNumber,
    }

    const result = transformRow(row, baseContext)

    expect(result.count).toBe(EDGE_CASES.largeNumber)
  })

  it('handles negative numbers', () => {
    const row: DatabaseRow = {
      id: '123',
      balance_cents: EDGE_CASES.negativeNumber,
    }

    const result = transformRow(row, baseContext)

    expect(result.balance_cents).toBe(EDGE_CASES.negativeNumber)
  })

  it('handles empty strings', () => {
    const row: DatabaseRow = {
      id: '123',
      name: EDGE_CASES.emptyString,
    }

    const result = transformRow(row, baseContext)

    expect(result.name).toBe('')
  })

  it('handles SQL injection attempts safely', () => {
    const row: DatabaseRow = {
      id: '123',
      name: EDGE_CASES.sqlInjection,
    }

    const result = transformRow(row, baseContext)

    // The string should be preserved as-is (SQL injection prevention is at DB layer)
    expect(result.name).toBe(EDGE_CASES.sqlInjection)
  })
})
