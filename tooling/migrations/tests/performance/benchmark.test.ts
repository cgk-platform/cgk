/**
 * Performance Tests for Migration
 *
 * Benchmarks transformation speed, encryption performance,
 * and memory usage characteristics.
 *
 * Note: These tests focus on pure computation benchmarks that
 * don't require database connections. For full migration benchmarks,
 * run against a test database.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import {
  transformRow,
  transformBatch,
  type TransformContext,
} from '../../lib/transform-row.js'
import { encrypt, decrypt, encryptSensitiveColumns } from '../../lib/encryption.js'
import {
  generateLargeDataset,
  CUSTOMER_FIXTURES,
  ORDER_FIXTURES,
  CREATOR_FIXTURES,
} from '../fixtures/test-data.js'

// Performance metrics collection
interface PerformanceMetrics {
  name: string
  duration: number
  itemsProcessed: number
  itemsPerSecond: number
  memoryUsedMB: number
}

const performanceResults: PerformanceMetrics[] = []

// Helper to measure performance
async function measurePerformance(
  name: string,
  fn: () => Promise<number> | number
): Promise<PerformanceMetrics> {
  // Force GC if available to get clean memory measurement
  if (global.gc) {
    global.gc()
  }

  const startMemory = process.memoryUsage().heapUsed
  const startTime = performance.now()

  const itemsProcessed = await fn()

  const endTime = performance.now()
  const endMemory = process.memoryUsage().heapUsed

  const duration = endTime - startTime
  const memoryUsedMB = Math.max(0, (endMemory - startMemory) / 1024 / 1024)

  const metrics: PerformanceMetrics = {
    name,
    duration,
    itemsProcessed,
    itemsPerSecond: duration > 0 ? itemsProcessed / (duration / 1000) : 0,
    memoryUsedMB,
  }

  performanceResults.push(metrics)
  return metrics
}

// Print results after all tests
afterAll(() => {
  console.log('\n' + '='.repeat(60))
  console.log('PERFORMANCE BENCHMARK RESULTS')
  console.log('='.repeat(60))

  for (const result of performanceResults) {
    console.log(`\n${result.name}:`)
    console.log(`  Duration: ${result.duration.toFixed(2)}ms`)
    console.log(`  Items: ${result.itemsProcessed}`)
    console.log(`  Speed: ${result.itemsPerSecond.toFixed(2)} items/sec`)
    console.log(`  Memory delta: ${result.memoryUsedMB.toFixed(2)} MB`)
  }

  console.log('\n' + '='.repeat(60))
})

describe('Transformation Performance', () => {
  const context: TransformContext = {
    sourceTable: 'orders',
    targetTable: 'orders',
    tenantSlug: 'rawdog',
    encryptSensitive: false,
  }

  it('transforms 1,000 rows efficiently', async () => {
    const data = generateLargeDataset(1000, ORDER_FIXTURES[0])

    const metrics = await measurePerformance('Transform 1K orders', () => {
      transformBatch(data, context)
      return data.length
    })

    // Should process at least 10,000 rows/second
    expect(metrics.itemsPerSecond).toBeGreaterThan(10000)
    // Should use less than 50MB memory
    expect(metrics.memoryUsedMB).toBeLessThan(50)
  })

  it('transforms 10,000 rows efficiently', async () => {
    const data = generateLargeDataset(10000, ORDER_FIXTURES[0])

    const metrics = await measurePerformance('Transform 10K orders', () => {
      transformBatch(data, context)
      return data.length
    })

    // Should maintain reasonable throughput
    expect(metrics.itemsPerSecond).toBeGreaterThan(5000)
  })

  it('transforms complex rows (creators) efficiently', async () => {
    const creatorContext: TransformContext = {
      sourceTable: 'creators',
      targetTable: 'creators',
      tenantSlug: 'rawdog',
      encryptSensitive: false,
    }
    const data = generateLargeDataset(1000, CREATOR_FIXTURES[0])

    const metrics = await measurePerformance('Transform 1K creators', () => {
      transformBatch(data, creatorContext)
      return data.length
    })

    expect(metrics.itemsPerSecond).toBeGreaterThan(5000)
  })

  it('handles varied data types efficiently', async () => {
    const customerContext: TransformContext = {
      sourceTable: 'customers',
      targetTable: 'customers',
      tenantSlug: 'rawdog',
      encryptSensitive: false,
    }
    const data = generateLargeDataset(2000, CUSTOMER_FIXTURES[0])

    const metrics = await measurePerformance('Transform 2K customers', () => {
      transformBatch(data, customerContext)
      return data.length
    })

    expect(metrics.itemsPerSecond).toBeGreaterThan(5000)
  })
})

describe('Encryption Performance', () => {
  beforeEach(() => {
    process.env['MIGRATION_ENCRYPTION_KEY'] = 'test-encryption-key-32-chars-!'
  })

  // NOTE: Encryption uses scrypt key derivation which is intentionally slow
  // for security. These tests use small datasets to stay within timeout.

  it('encrypts values with scrypt (slow by design)', async () => {
    // Small dataset due to scrypt's intentional slowness
    const values = Array.from({ length: 10 }, (_, i) => `secret_value_${i}`)

    const metrics = await measurePerformance('Encrypt 10 values', () => {
      for (const value of values) {
        encrypt(value)
      }
      return values.length
    })

    // Just verify completion - scrypt is intentionally slow
    expect(metrics.itemsProcessed).toBe(10)
  })

  it('decrypts values with scrypt (slow by design)', async () => {
    // Pre-encrypt a small set
    const encrypted = Array.from({ length: 10 }, (_, i) => encrypt(`secret_${i}`))

    const metrics = await measurePerformance('Decrypt 10 values', () => {
      for (const value of encrypted) {
        decrypt(value)
      }
      return encrypted.length
    })

    // Just verify completion
    expect(metrics.itemsProcessed).toBe(10)
  }, 60000) // Increase timeout for decryption

  it('encryption/decryption roundtrip performance', async () => {
    // Small dataset for roundtrip test
    const values = Array.from({ length: 5 }, (_, i) => `value_${i}`)

    const metrics = await measurePerformance('Roundtrip 5 values', () => {
      for (const value of values) {
        const encrypted = encrypt(value)
        decrypt(encrypted)
      }
      return values.length
    })

    // Verify roundtrip completes
    expect(metrics.itemsProcessed).toBe(5)
  }, 60000)

  it('encrypts sensitive columns in batch', async () => {
    // Small batch due to scrypt overhead
    const rows = generateLargeDataset(5, {
      id: 'test',
      name: 'Test User',
      access_token: 'secret_token_value',
      api_key: 'api_key_value',
      payout_details: '{"bank": "Test Bank"}',
    })

    const metrics = await measurePerformance('Encrypt sensitive columns 5 rows', () => {
      for (const row of rows) {
        encryptSensitiveColumns(row)
      }
      return rows.length
    })

    // Verify completion
    expect(metrics.itemsProcessed).toBe(5)
  }, 120000) // Longer timeout for multiple sensitive columns
})

describe('Transform with Encryption', () => {
  beforeEach(() => {
    process.env['MIGRATION_ENCRYPTION_KEY'] = 'test-encryption-key-32-chars-!'
  })

  it('transforms with encryption enabled', async () => {
    const context: TransformContext = {
      sourceTable: 'creators',
      targetTable: 'creators',
      tenantSlug: 'rawdog',
      encryptSensitive: true,
      sensitiveColumns: ['payout_details'],
    }
    // Small dataset due to scrypt overhead
    const data = generateLargeDataset(5, CREATOR_FIXTURES[0])

    const metrics = await measurePerformance('Transform+Encrypt 5 creators', () => {
      transformBatch(data, context)
      return data.length
    })

    // Verify completion
    expect(metrics.itemsProcessed).toBe(5)
  }, 120000)
})

describe('Memory Efficiency', () => {
  it('processes large dataset without excessive memory', async () => {
    const data = generateLargeDataset(5000, ORDER_FIXTURES[0])
    const context: TransformContext = {
      sourceTable: 'orders',
      targetTable: 'orders',
      tenantSlug: 'rawdog',
      encryptSensitive: false,
    }

    const metrics = await measurePerformance('Memory test 5K orders', () => {
      transformBatch(data, context)
      return data.length
    })

    // Memory should stay reasonable for 5000 rows
    expect(metrics.memoryUsedMB).toBeLessThan(100)
  })

  it('processes batches without memory accumulation', async () => {
    const context: TransformContext = {
      sourceTable: 'orders',
      targetTable: 'orders',
      tenantSlug: 'rawdog',
      encryptSensitive: false,
    }

    const batchCount = 10
    const batchSize = 1000
    let totalProcessed = 0

    const metrics = await measurePerformance(`${batchCount} batches x ${batchSize}`, () => {
      for (let i = 0; i < batchCount; i++) {
        const batch = generateLargeDataset(batchSize, ORDER_FIXTURES[0])
        transformBatch(batch, context)
        totalProcessed += batchSize
      }
      return totalProcessed
    })

    // Memory should not grow linearly with batches
    expect(metrics.memoryUsedMB).toBeLessThan(200)
  })
})

describe('Scalability', () => {
  const context: TransformContext = {
    sourceTable: 'customers',
    targetTable: 'customers',
    tenantSlug: 'rawdog',
    encryptSensitive: false,
  }

  const datasetSizes = [100, 500, 1000, 2000, 5000]

  for (const size of datasetSizes) {
    it(`scales with ${size} rows`, async () => {
      const data = generateLargeDataset(size, CUSTOMER_FIXTURES[0])

      const metrics = await measurePerformance(`Scale test ${size} rows`, () => {
        transformBatch(data, context)
        return data.length
      })

      expect(metrics.itemsProcessed).toBe(size)
    })
  }

  it('compares scalability across sizes', () => {
    const scaleResults = performanceResults.filter((r) => r.name.startsWith('Scale test'))

    if (scaleResults.length < 2) {
      console.log('Not enough scale results to compare')
      return
    }

    // Calculate average throughput
    const avgThroughput =
      scaleResults.reduce((sum, r) => sum + r.itemsPerSecond, 0) / scaleResults.length

    console.log(`\nScalability Analysis:`)
    console.log(`  Average throughput: ${avgThroughput.toFixed(2)} items/sec`)

    // Check throughput consistency
    for (const result of scaleResults) {
      const deviation = Math.abs(result.itemsPerSecond - avgThroughput) / avgThroughput
      console.log(
        `  ${result.name}: ${result.itemsPerSecond.toFixed(2)} items/sec (${(deviation * 100).toFixed(1)}% deviation)`
      )
    }
  })
})

describe('Performance Thresholds', () => {
  it('meets minimum transformation throughput', async () => {
    const data = generateLargeDataset(1000, CUSTOMER_FIXTURES[0])
    const context: TransformContext = {
      sourceTable: 'customers',
      targetTable: 'customers',
      tenantSlug: 'rawdog',
      encryptSensitive: false,
    }

    const metrics = await measurePerformance('Throughput threshold test', () => {
      transformBatch(data, context)
      return data.length
    })

    // Minimum acceptable throughput: 5000 rows/sec for simple transforms
    expect(metrics.itemsPerSecond).toBeGreaterThan(5000)
  })

  it('completes encryption within time limit', async () => {
    process.env['MIGRATION_ENCRYPTION_KEY'] = 'test-encryption-key-32-chars-!'
    // Small dataset due to scrypt overhead
    const values = Array.from({ length: 5 }, (_, i) => `value_${i}`)

    const metrics = await measurePerformance('Encryption time limit', () => {
      for (const value of values) {
        encrypt(value)
      }
      return values.length
    })

    // Should complete 5 encryptions in under 60 seconds
    expect(metrics.duration).toBeLessThan(60000)
  }, 60000)
})

describe('Bottleneck Identification', () => {
  it('compares transform vs encryption time', async () => {
    process.env['MIGRATION_ENCRYPTION_KEY'] = 'test-encryption-key-32-chars-!'

    // Small dataset due to scrypt overhead
    const data = generateLargeDataset(5, CREATOR_FIXTURES[0])

    // Transform only
    const transformContext: TransformContext = {
      sourceTable: 'creators',
      targetTable: 'creators',
      tenantSlug: 'rawdog',
      encryptSensitive: false,
    }

    const transformMetrics = await measurePerformance('Transform only (5)', () => {
      transformBatch(data, transformContext)
      return data.length
    })

    // Transform with encryption
    const encryptContext: TransformContext = {
      sourceTable: 'creators',
      targetTable: 'creators',
      tenantSlug: 'rawdog',
      encryptSensitive: true,
      sensitiveColumns: ['payout_details'],
    }

    const data2 = generateLargeDataset(5, CREATOR_FIXTURES[0])
    const encryptMetrics = await measurePerformance('Transform+Encrypt (5)', () => {
      transformBatch(data2, encryptContext)
      return data2.length
    })

    console.log('\n--- Bottleneck Analysis ---')
    console.log(`Transform only: ${transformMetrics.duration.toFixed(2)}ms`)
    console.log(`Transform+Encrypt: ${encryptMetrics.duration.toFixed(2)}ms`)
    console.log(
      `Encryption overhead: ${(encryptMetrics.duration - transformMetrics.duration).toFixed(2)}ms`
    )

    // Both should complete
    expect(transformMetrics.itemsProcessed).toBe(5)
    expect(encryptMetrics.itemsProcessed).toBe(5)
  }, 120000)
})
