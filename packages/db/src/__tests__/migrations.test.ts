/**
 * Migration system tests
 *
 * Tests for the migration loader and types.
 * Migration counts are validated as minimums to avoid
 * breaking tests every time a new migration is added.
 */

import { describe, expect, it } from 'vitest'

import { loadPublicMigrations, loadTenantMigrations } from '../migrations/loader.js'

describe('Migration Loader', () => {
  describe('loadPublicMigrations', () => {
    it('should load all public migrations', async () => {
      const migrations = await loadPublicMigrations()

      // At least the original 7 + many more added over time
      expect(migrations.length).toBeGreaterThanOrEqual(7)
      expect(migrations[0]?.version).toBe(1)
      expect(migrations[0]?.name).toBe('platform_config')
    })

    it('should return migrations sorted by version then name', async () => {
      const migrations = await loadPublicMigrations()

      for (let i = 1; i < migrations.length; i++) {
        const curr = migrations[i]!
        const prev = migrations[i - 1]!
        // Versions must be non-decreasing (duplicates allowed, sorted by name)
        if (curr.version === prev.version) {
          expect(curr.name.localeCompare(prev.name)).toBeGreaterThanOrEqual(0)
        } else {
          expect(curr.version).toBeGreaterThan(prev.version)
        }
      }
    })

    it('should include SQL content', async () => {
      const migrations = await loadPublicMigrations()

      for (const migration of migrations) {
        expect(migration.sql).toBeTruthy()
        expect(migration.sql.length).toBeGreaterThan(0)
        // Migrations contain DDL (CREATE, ALTER, INSERT, etc.) or comments
        const hasDDL =
          migration.sql.includes('CREATE') ||
          migration.sql.includes('ALTER') ||
          migration.sql.includes('INSERT') ||
          migration.sql.includes('DROP')
        expect(hasDDL).toBe(true)
      }
    })

    it('should have correct initial filenames', async () => {
      const migrations = await loadPublicMigrations()

      expect(migrations[0]?.filename).toBe('001_platform_config.sql')
      expect(migrations[1]?.filename).toBe('002_organizations.sql')
      expect(migrations[2]?.filename).toBe('003_users.sql')
      expect(migrations[3]?.filename).toBe('004_sessions.sql')
      expect(migrations[4]?.filename).toBe('005_api_keys.sql')
      expect(migrations[5]?.filename).toBe('006_billing.sql')
      expect(migrations[6]?.filename).toBe('007_magic_links.sql')
    })
  })

  describe('loadTenantMigrations', () => {
    it('should load all tenant migrations', async () => {
      const migrations = await loadTenantMigrations()

      // At least the original 7 + many more added over time
      expect(migrations.length).toBeGreaterThanOrEqual(7)
      expect(migrations[0]?.version).toBe(1)
      expect(migrations[0]?.name).toBe('orders')
    })

    it('should return migrations sorted by version then name', async () => {
      const migrations = await loadTenantMigrations()

      for (let i = 1; i < migrations.length; i++) {
        const curr = migrations[i]!
        const prev = migrations[i - 1]!
        // Versions must be non-decreasing (duplicates allowed, sorted by name)
        if (curr.version === prev.version) {
          expect(curr.name.localeCompare(prev.name)).toBeGreaterThanOrEqual(0)
        } else {
          expect(curr.version).toBeGreaterThan(prev.version)
        }
      }
    })

    it('should include SQL content', async () => {
      const migrations = await loadTenantMigrations()

      for (const migration of migrations) {
        expect(migration.sql).toBeTruthy()
        expect(migration.sql.length).toBeGreaterThan(0)
        // Migrations contain DDL, a SELECT, or are documentation-only
        const hasSQL =
          migration.sql.includes('CREATE') ||
          migration.sql.includes('ALTER') ||
          migration.sql.includes('INSERT') ||
          migration.sql.includes('DROP') ||
          migration.sql.includes('SELECT')
        expect(hasSQL).toBe(true)
      }
    })

    it('should have correct initial filenames', async () => {
      const migrations = await loadTenantMigrations()

      expect(migrations[0]?.filename).toBe('001_orders.sql')
      expect(migrations[1]?.filename).toBe('002_customers.sql')
      expect(migrations[2]?.filename).toBe('003_products.sql')
      expect(migrations[3]?.filename).toBe('004_creators.sql')
      expect(migrations[4]?.filename).toBe('005_payouts.sql')
      expect(migrations[5]?.filename).toBe('006_reviews.sql')
      expect(migrations[6]?.filename).toBe('007_blog_posts.sql')
    })
  })

  describe('Migration SQL Content', () => {
    it('public migrations should use idempotent patterns', async () => {
      const migrations = await loadPublicMigrations()

      for (const migration of migrations) {
        const hasIdempotentPattern =
          migration.sql.includes('IF NOT EXISTS') ||
          migration.sql.includes('IF EXISTS') ||
          migration.sql.includes('DO $$') ||
          migration.sql.includes('ON CONFLICT')
        expect(hasIdempotentPattern).toBe(true)
      }
    })

    it('tenant migrations should use idempotent patterns', async () => {
      const migrations = await loadTenantMigrations()

      for (const migration of migrations) {
        const hasIdempotentPattern =
          migration.sql.includes('IF NOT EXISTS') ||
          migration.sql.includes('IF EXISTS') ||
          migration.sql.includes('DO $$') ||
          migration.sql.includes('ON CONFLICT')
        expect(hasIdempotentPattern).toBe(true)
      }
    })

    it('public CREATE TABLE migrations should include timestamps', async () => {
      const migrations = await loadPublicMigrations()

      for (const migration of migrations) {
        // Only check migrations that CREATE a new table (not ALTER/INDEX-only)
        if (migration.sql.includes('CREATE TABLE') && !migration.sql.startsWith('--')) {
          expect(migration.sql).toContain('created_at')
        }
      }
    })

    it('tenant CREATE TABLE migrations should include timestamps', async () => {
      const migrations = await loadTenantMigrations()

      for (const migration of migrations) {
        if (migration.sql.includes('CREATE TABLE') && !migration.sql.startsWith('--')) {
          expect(migration.sql).toContain('created_at')
        }
      }
    })
  })
})
