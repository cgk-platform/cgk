import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { resolve } from 'path'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import skill from '../index.js'

describe('tenant-isolation-validator', () => {
  const testDir = resolve(process.cwd(), '__tests__/temp')

  beforeAll(() => {
    // Create temp directory for test files
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }
  })

  afterAll(() => {
    // Clean up temp directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(skill.name).toBe('tenant-isolation-validator')
    })

    it('should have version', () => {
      expect(skill.version).toBe('1.0.0')
    })

    it('should have description', () => {
      expect(skill.description).toContain('tenant isolation')
    })
  })

  describe('execute()', () => {
    it('should pass when no violations found', async () => {
      // Clean temp dir first
      rmSync(testDir, { recursive: true, force: true })
      mkdirSync(testDir, { recursive: true })

      // Create a valid file
      const validFile = resolve(testDir, 'valid.ts')
      writeFileSync(validFile, `
import { withTenant, sql } from '@cgk-platform/db'

export async function getOrders(tenantId: string) {
  return withTenant(tenantId, async () => {
    const orders = await sql\`SELECT * FROM orders\`
    return orders
  })
}
`)

      const result = await skill.execute({ path: testDir })

      expect(result.status).toBe('pass')
      expect(result.violations).toEqual([])
      expect(result.summary.totalViolations).toBe(0)
    })

    it('should detect SQL without withTenant', async () => {
      const invalidFile = resolve(testDir, 'no-withtenant.ts')
      writeFileSync(invalidFile, `
import { sql } from '@cgk-platform/db'

export async function getOrders() {
  const orders = await sql\`SELECT * FROM orders\`
  return orders
}
`)

      const result = await skill.execute({ path: testDir })

      expect(result.status).toBe('fail')
      expect(result.violations.length).toBeGreaterThan(0)

      const sqlViolation = result.violations.find(v => v.rule === 'no-raw-sql')
      expect(sqlViolation).toBeDefined()
      expect(sqlViolation.severity).toBe('critical')
      expect(sqlViolation.message).toContain('withTenant()')
    })

    it('should detect cache without createTenantCache', async () => {
      const invalidFile = resolve(testDir, 'no-tenant-cache.ts')
      writeFileSync(invalidFile, `
import { redis } from '@cgk-platform/cache'

export async function getConfig() {
  const config = await redis.get('pricing-config')
  return config
}
`)

      const result = await skill.execute({ path: testDir })

      expect(result.status).toBe('fail')

      const cacheViolation = result.violations.find(v => v.rule === 'no-raw-cache')
      expect(cacheViolation).toBeDefined()
      expect(cacheViolation.severity).toBe('critical')
      expect(cacheViolation.message).toContain('tenant isolation')
    })

    it('should detect jobs without tenantId', async () => {
      const invalidFile = resolve(testDir, 'no-tenant-job.ts')
      writeFileSync(invalidFile, `
import { jobs } from '@cgk-platform/jobs'

export async function sendNotification(orderId: string) {
  await jobs.send('order/created', {
    orderId
  })
}
`)

      const result = await skill.execute({ path: testDir })

      expect(result.status).toBe('fail')

      const jobViolation = result.violations.find(v => v.rule === 'no-tenant-in-job')
      expect(jobViolation).toBeDefined()
      expect(jobViolation.severity).toBe('critical')
      expect(jobViolation.message).toContain('tenantId')
    })

    it('should pass when jobs include tenantId', async () => {
      // Clean temp dir first
      rmSync(testDir, { recursive: true, force: true })
      mkdirSync(testDir, { recursive: true })

      const validFile = resolve(testDir, 'valid-job.ts')
      writeFileSync(validFile, `
import { jobs } from '@cgk-platform/jobs'

export async function sendNotification(tenantId: string, orderId: string) {
  await jobs.send('order/created', {
    tenantId,
    orderId
  })
}
`)

      const result = await skill.execute({ path: testDir })

      const jobViolation = result.violations.find(v => v.rule === 'no-tenant-in-job')
      expect(jobViolation).toBeUndefined()
    })

    it('should scan multiple files and aggregate violations', async () => {
      // Create multiple files with violations
      writeFileSync(resolve(testDir, 'file1.ts'), `
import { sql } from '@cgk-platform/db'
export async function f1() {
  await sql\`SELECT * FROM orders\`
}
`)
      writeFileSync(resolve(testDir, 'file2.ts'), `
import { redis } from '@cgk-platform/cache'
export async function f2() {
  redis.get('key')
}
`)

      const result = await skill.execute({ path: testDir })

      expect(result.status).toBe('fail')
      expect(result.summary.filesWithViolations).toBeGreaterThanOrEqual(2)
      expect(result.violations.length).toBeGreaterThan(0)
    })

    it('should exclude test files from scanning', async () => {
      const testFile = resolve(testDir, 'example.test.ts')
      writeFileSync(testFile, `
import { sql } from '@cgk-platform/db'
// This is a test file, violations should be ignored
await sql\`SELECT * FROM orders\`
`)

      const result = await skill.execute({ path: testDir })

      // Test files should not be included in scan
      const testFileViolations = result.violations.filter(v => v.file.includes('.test.'))
      expect(testFileViolations).toEqual([])
    })

    it('should provide fix suggestions for SQL violations', async () => {
      const invalidFile = resolve(testDir, 'fix-test.ts')
      writeFileSync(invalidFile, `
import { sql } from '@cgk-platform/db'
export async function query() {
  return sql\`SELECT * FROM items\`
}
`)

      const result = await skill.execute({ path: testDir })

      const sqlViolation = result.violations.find(v => v.rule === 'no-raw-sql')
      expect(sqlViolation).toBeDefined()
      expect(sqlViolation.fix).toBeDefined()
      expect(sqlViolation.fix.type).toBe('wrap')
      expect(sqlViolation.fix.suggestion).toContain('withTenant')
    })

    it('should return correct summary statistics', async () => {
      // Clean temp dir
      rmSync(testDir, { recursive: true, force: true })
      mkdirSync(testDir, { recursive: true })

      writeFileSync(resolve(testDir, 'valid.ts'), `
import { withTenant, sql } from '@cgk-platform/db'
export async function query(tenantId: string) {
  return withTenant(tenantId, () => sql\`SELECT 1\`)
}
`)

      const result = await skill.execute({ path: testDir })

      expect(result.summary).toBeDefined()
      expect(result.summary.filesScanned).toBeGreaterThan(0)
      expect(result.summary.filesWithViolations).toBe(0)
      expect(result.summary.totalViolations).toBe(0)
    })

    it('should handle files with no SQL/cache/jobs gracefully', async () => {
      const plainFile = resolve(testDir, 'plain.ts')
      writeFileSync(plainFile, `
export function add(a: number, b: number) {
  return a + b
}
`)

      const result = await skill.execute({ path: testDir })

      // Should not crash, should just skip the file
      expect(result.status).toBe('pass')
    })

    it('should detect violations in multi-line SQL queries', async () => {
      const multilineFile = resolve(testDir, 'multiline.ts')
      writeFileSync(multilineFile, `
import { sql } from '@cgk-platform/db'

export async function complexQuery() {
  const result = await sql\`
    SELECT *
    FROM orders
    WHERE status = 'active'
    ORDER BY created_at DESC
  \`
  return result
}
`)

      const result = await skill.execute({ path: testDir })

      expect(result.status).toBe('fail')
      const sqlViolation = result.violations.find(v => v.rule === 'no-raw-sql')
      expect(sqlViolation).toBeDefined()
    })

    it('should not flag SQL when withTenant is present nearby', async () => {
      const validFile = resolve(testDir, 'withtenant-nearby.ts')
      writeFileSync(validFile, `
import { withTenant, sql } from '@cgk-platform/db'

export async function query(tenantId: string) {
  return withTenant(tenantId, async () => {
    // Some comment
    const result = await sql\`SELECT * FROM orders\`
    return result
  })
}
`)

      const result = await skill.execute({ path: testDir })

      const sqlViolation = result.violations.find(
        v => v.rule === 'no-raw-sql' && v.file.includes('withtenant-nearby')
      )
      expect(sqlViolation).toBeUndefined()
    })

    it('should handle cache methods: get, set, del, hget, hset', async () => {
      const cacheFile = resolve(testDir, 'cache-methods.ts')
      writeFileSync(cacheFile, `
import { cache } from '@cgk-platform/cache'

export async function testCache() {
  await cache.get('key')
  await cache.set('key', 'value')
  await cache.del('key')
  await cache.hget('hash', 'field')
  await cache.hset('hash', 'field', 'value')
}
`)

      const result = await skill.execute({ path: testDir })

      const cacheViolations = result.violations.filter(v => v.rule === 'no-raw-cache')
      expect(cacheViolations.length).toBeGreaterThan(0)
    })

    it('should provide cache fix suggestion', async () => {
      const cacheFile = resolve(testDir, 'cache-fix.ts')
      writeFileSync(cacheFile, `
import { cache } from '@cgk-platform/cache'
export async function getVal() {
  cache.get('key')
}
`)

      const result = await skill.execute({ path: testDir })

      const cacheViolation = result.violations.find(v => v.rule === 'no-raw-cache')
      expect(cacheViolation).toBeDefined()
      expect(cacheViolation.fix).toBeDefined()
      expect(cacheViolation.fix.suggestion).toContain('createTenantCache')
    })

    it('should detect jobs with multi-line payloads', async () => {
      const jobFile = resolve(testDir, 'multiline-job.ts')
      writeFileSync(jobFile, `
import { jobs } from '@cgk-platform/jobs'

export async function sendJob() {
  await jobs.send('task/process', {
    orderId: '123',
    status: 'pending'
  })
}
`)

      const result = await skill.execute({ path: testDir })

      const jobViolation = result.violations.find(v => v.rule === 'no-tenant-in-job')
      expect(jobViolation).toBeDefined()
    })
  })
})
