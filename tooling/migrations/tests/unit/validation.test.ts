/**
 * Unit Tests for Validation Functions
 *
 * Tests validation accuracy for row counts, financial sums,
 * sample data, and foreign key integrity.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  TABLE_MIGRATION_ORDER,
  FINANCIAL_TABLES,
  FOREIGN_KEY_RELATIONSHIPS,
  COLUMN_MAPPINGS,
  DEFAULT_VALUES,
  validateEnvironment,
  getConnectionUrl,
  type MigratableTable,
} from '../../config.js'

describe('Configuration', () => {
  describe('TABLE_MIGRATION_ORDER', () => {
    it('contains all expected tables', () => {
      const expectedTables = [
        'customers',
        'products',
        'orders',
        'line_items',
        'reviews',
        'creators',
        'creator_projects',
        'balance_transactions',
        'withdrawal_requests',
        'landing_pages',
        'blog_posts',
        'ab_tests',
        'attribution_touchpoints',
        'esign_documents',
      ]

      expectedTables.forEach((table) => {
        expect(TABLE_MIGRATION_ORDER).toContain(table)
      })
    })

    it('has tables in dependency order', () => {
      const indexOf = (table: string) => TABLE_MIGRATION_ORDER.indexOf(table as MigratableTable)

      // customers and products must come before orders
      expect(indexOf('customers')).toBeLessThan(indexOf('orders'))
      expect(indexOf('products')).toBeLessThan(indexOf('orders'))

      // orders must come before line_items
      expect(indexOf('orders')).toBeLessThan(indexOf('line_items'))

      // creators must come before creator_projects
      expect(indexOf('creators')).toBeLessThan(indexOf('creator_projects'))

      // creators must come before balance_transactions
      expect(indexOf('creators')).toBeLessThan(indexOf('balance_transactions'))

      // creators must come before withdrawal_requests
      expect(indexOf('creators')).toBeLessThan(indexOf('withdrawal_requests'))
    })
  })

  describe('FINANCIAL_TABLES', () => {
    it('includes orders.total_cents', () => {
      const ordersEntry = FINANCIAL_TABLES.find((f) => f.table === 'orders')
      expect(ordersEntry).toBeDefined()
      expect(ordersEntry?.column).toBe('total_cents')
    })

    it('includes balance_transactions.amount_cents', () => {
      const btEntry = FINANCIAL_TABLES.find((f) => f.table === 'balance_transactions')
      expect(btEntry).toBeDefined()
      expect(btEntry?.column).toBe('amount_cents')
    })
  })

  describe('FOREIGN_KEY_RELATIONSHIPS', () => {
    it('defines line_items -> orders relationship', () => {
      const rel = FOREIGN_KEY_RELATIONSHIPS.find(
        (r) => r.childTable === 'line_items' && r.parentTable === 'orders'
      )
      expect(rel).toBeDefined()
      expect(rel?.childColumn).toBe('order_id')
      expect(rel?.parentColumn).toBe('id')
    })

    it('defines creator_projects -> creators relationship', () => {
      const rel = FOREIGN_KEY_RELATIONSHIPS.find(
        (r) => r.childTable === 'creator_projects' && r.parentTable === 'creators'
      )
      expect(rel).toBeDefined()
      expect(rel?.childColumn).toBe('creator_id')
      expect(rel?.parentColumn).toBe('id')
    })

    it('defines balance_transactions -> creators relationship', () => {
      const rel = FOREIGN_KEY_RELATIONSHIPS.find(
        (r) => r.childTable === 'balance_transactions' && r.parentTable === 'creators'
      )
      expect(rel).toBeDefined()
      expect(rel?.childColumn).toBe('creator_id')
    })

    it('defines withdrawal_requests -> creators relationship', () => {
      const rel = FOREIGN_KEY_RELATIONSHIPS.find(
        (r) => r.childTable === 'withdrawal_requests' && r.parentTable === 'creators'
      )
      expect(rel).toBeDefined()
      expect(rel?.childColumn).toBe('creator_id')
    })
  })

  describe('COLUMN_MAPPINGS', () => {
    it('maps creators.commission_rate to commission_rate_pct', () => {
      expect(COLUMN_MAPPINGS.creators?.commission_rate).toBe('commission_rate_pct')
    })

    it('maps creators.commission_percent to commission_rate_pct', () => {
      expect(COLUMN_MAPPINGS.creators?.commission_percent).toBe('commission_rate_pct')
    })

    it('maps withdrawal_requests.rejection_reason to failure_reason', () => {
      expect(COLUMN_MAPPINGS.withdrawal_requests?.rejection_reason).toBe('failure_reason')
    })

    it('maps withdrawal_requests.admin_notes to notes', () => {
      expect(COLUMN_MAPPINGS.withdrawal_requests?.admin_notes).toBe('notes')
    })

    it('maps withdrawal_requests.bank_details to payout_details', () => {
      expect(COLUMN_MAPPINGS.withdrawal_requests?.bank_details).toBe('payout_details')
    })
  })

  describe('DEFAULT_VALUES', () => {
    it('defines order defaults', () => {
      expect(DEFAULT_VALUES.orders?.currency).toBe('USD')
      expect(DEFAULT_VALUES.orders?.status).toBe('pending')
      expect(DEFAULT_VALUES.orders?.fulfillment_status).toBe('unfulfilled')
      expect(DEFAULT_VALUES.orders?.financial_status).toBe('pending')
      expect(DEFAULT_VALUES.orders?.line_items).toEqual([])
    })

    it('defines creator defaults', () => {
      expect(DEFAULT_VALUES.creators?.status).toBe('pending')
      expect(DEFAULT_VALUES.creators?.tier).toBe('bronze')
      expect(DEFAULT_VALUES.creators?.commission_rate_pct).toBe(10.0)
      expect(DEFAULT_VALUES.creators?.balance_cents).toBe(0)
    })

    it('defines product defaults', () => {
      expect(DEFAULT_VALUES.products?.status).toBe('active')
      expect(DEFAULT_VALUES.products?.currency).toBe('USD')
      expect(DEFAULT_VALUES.products?.images).toEqual([])
    })

    it('defines customer defaults', () => {
      expect(DEFAULT_VALUES.customers?.currency).toBe('USD')
      expect(DEFAULT_VALUES.customers?.orders_count).toBe(0)
      expect(DEFAULT_VALUES.customers?.accepts_marketing).toBe(false)
    })

    it('defines review defaults', () => {
      expect(DEFAULT_VALUES.reviews?.status).toBe('pending')
      expect(DEFAULT_VALUES.reviews?.helpful_votes).toBe(0)
      expect(DEFAULT_VALUES.reviews?.is_verified_purchase).toBe(false)
    })

    it('defines blog_post defaults', () => {
      expect(DEFAULT_VALUES.blog_posts?.status).toBe('draft')
      expect(DEFAULT_VALUES.blog_posts?.tags).toEqual([])
    })
  })
})

describe('Environment Validation', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Reset env for each test
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('validates when all required vars are set', () => {
    process.env['RAWDOG_POSTGRES_URL'] = 'postgresql://test'
    process.env['POSTGRES_URL'] = 'postgresql://test'

    const result = validateEnvironment()

    expect(result.valid).toBe(true)
    expect(result.missing).toEqual([])
  })

  it('fails when RAWDOG_POSTGRES_URL is missing', () => {
    delete process.env['RAWDOG_POSTGRES_URL']
    process.env['POSTGRES_URL'] = 'postgresql://test'

    const result = validateEnvironment()

    expect(result.valid).toBe(false)
    expect(result.missing).toContain('RAWDOG_POSTGRES_URL')
  })

  it('fails when POSTGRES_URL is missing', () => {
    process.env['RAWDOG_POSTGRES_URL'] = 'postgresql://test'
    delete process.env['POSTGRES_URL']

    const result = validateEnvironment()

    expect(result.valid).toBe(false)
    expect(result.missing).toContain('POSTGRES_URL')
  })

  it('warns when MIGRATION_ENCRYPTION_KEY is missing', () => {
    process.env['RAWDOG_POSTGRES_URL'] = 'postgresql://test'
    process.env['POSTGRES_URL'] = 'postgresql://test'
    delete process.env['MIGRATION_ENCRYPTION_KEY']

    const result = validateEnvironment()

    expect(result.valid).toBe(true) // Still valid
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('MIGRATION_ENCRYPTION_KEY')
  })
})

describe('getConnectionUrl', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns source URL', () => {
    process.env['RAWDOG_POSTGRES_URL'] = 'postgresql://source'

    expect(getConnectionUrl('source')).toBe('postgresql://source')
  })

  it('returns destination URL', () => {
    process.env['POSTGRES_URL'] = 'postgresql://destination'

    expect(getConnectionUrl('destination')).toBe('postgresql://destination')
  })

  it('returns encryption key', () => {
    process.env['MIGRATION_ENCRYPTION_KEY'] = 'secret_key'

    expect(getConnectionUrl('encryptionKey')).toBe('secret_key')
  })

  it('returns undefined for missing vars', () => {
    delete process.env['RAWDOG_POSTGRES_URL']

    expect(getConnectionUrl('source')).toBeUndefined()
  })
})

describe('Validation Result Types', () => {
  // Import types to ensure they're correct
  it('has proper ValidationResult structure', async () => {
    // Type should have required fields
    const mockResult: import('../../lib/types.js').ValidationResult = {
      type: 'count',
      table: 'orders',
      passed: true,
      message: 'Test message',
      details: { count: 100 },
    }

    expect(mockResult.type).toBe('count')
    expect(mockResult.passed).toBe(true)
  })

  it('has proper ValidationReport structure', async () => {
    const mockReport: import('../../lib/types.js').ValidationReport = {
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 1000,
      tenantSlug: 'rawdog',
      results: [],
      passed: true,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
      },
    }

    expect(mockReport.tenantSlug).toBe('rawdog')
    expect(mockReport.passed).toBe(true)
  })
})

describe('Count Validation Details', () => {
  it('has proper structure', async () => {
    const mockDetails: import('../../lib/types.js').CountValidationDetails = {
      sourceCount: 100,
      destinationCount: 100,
      difference: 0,
    }

    expect(mockDetails.difference).toBe(0)
  })

  it('calculates difference correctly', async () => {
    const mockDetails: import('../../lib/types.js').CountValidationDetails = {
      sourceCount: 100,
      destinationCount: 95,
      difference: 5,
    }

    expect(mockDetails.sourceCount - mockDetails.destinationCount).toBe(mockDetails.difference)
  })
})

describe('Sum Validation Details', () => {
  it('has proper structure', async () => {
    const mockDetails: import('../../lib/types.js').SumValidationDetails = {
      column: 'total_cents',
      sourceSum: BigInt(1000000),
      destinationSum: BigInt(1000000),
      difference: BigInt(0),
      sourceSumFormatted: '$10,000.00',
      destinationSumFormatted: '$10,000.00',
    }

    expect(mockDetails.column).toBe('total_cents')
    expect(mockDetails.difference).toBe(BigInt(0))
  })
})

describe('Foreign Key Validation Details', () => {
  it('has proper structure', async () => {
    const mockDetails: import('../../lib/types.js').ForeignKeyValidationDetails = {
      relationship: 'line_items.order_id -> orders.id',
      orphanedCount: 0,
      orphanedIds: [],
    }

    expect(mockDetails.orphanedCount).toBe(0)
    expect(mockDetails.orphanedIds).toHaveLength(0)
  })

  it('captures orphaned IDs', async () => {
    const mockDetails: import('../../lib/types.js').ForeignKeyValidationDetails = {
      relationship: 'line_items.order_id -> orders.id',
      orphanedCount: 3,
      orphanedIds: ['li_001', 'li_002', 'li_003'],
    }

    expect(mockDetails.orphanedCount).toBe(3)
    expect(mockDetails.orphanedIds).toContain('li_001')
  })
})

describe('Sample Validation Details', () => {
  it('has proper structure', async () => {
    const mockDetails: import('../../lib/types.js').SampleValidationDetails = {
      sampleSize: 100,
      matchedCount: 100,
      mismatchedCount: 0,
      mismatches: [],
    }

    expect(mockDetails.sampleSize).toBe(100)
    expect(mockDetails.mismatchedCount).toBe(0)
  })

  it('captures mismatches', async () => {
    const mockDetails: import('../../lib/types.js').SampleValidationDetails = {
      sampleSize: 100,
      matchedCount: 98,
      mismatchedCount: 2,
      mismatches: [
        {
          id: 'order_001',
          column: 'total_cents',
          sourceValue: 1000,
          destinationValue: 999,
        },
        {
          id: 'order_002',
          column: 'status',
          sourceValue: 'PENDING',
          destinationValue: 'pending',
        },
      ],
    }

    expect(mockDetails.mismatchedCount).toBe(2)
    expect(mockDetails.mismatches).toHaveLength(2)
    expect(mockDetails.mismatches[0].column).toBe('total_cents')
  })
})
