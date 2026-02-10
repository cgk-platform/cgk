/**
 * Migration system tests
 *
 * Tests for the migration loader and types.
 */

import { describe, expect, it } from 'vitest'

import { loadPublicMigrations, loadTenantMigrations } from '../migrations/loader.js'

describe('Migration Loader', () => {
  describe('loadPublicMigrations', () => {
    it('should load all public migrations', async () => {
      const migrations = await loadPublicMigrations()

      expect(migrations.length).toBe(7)
      expect(migrations[0]?.version).toBe(1)
      expect(migrations[0]?.name).toBe('platform_config')
      expect(migrations[6]?.version).toBe(7)
      expect(migrations[6]?.name).toBe('magic_links')
    })

    it('should return migrations sorted by version', async () => {
      const migrations = await loadPublicMigrations()

      for (let i = 1; i < migrations.length; i++) {
        expect(migrations[i]!.version).toBeGreaterThan(migrations[i - 1]!.version)
      }
    })

    it('should include SQL content', async () => {
      const migrations = await loadPublicMigrations()

      for (const migration of migrations) {
        expect(migration.sql).toBeTruthy()
        expect(migration.sql.length).toBeGreaterThan(0)
        expect(migration.sql).toContain('CREATE')
      }
    })

    it('should have correct filenames', async () => {
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

      expect(migrations.length).toBe(7)
      expect(migrations[0]?.version).toBe(1)
      expect(migrations[0]?.name).toBe('orders')
      expect(migrations[6]?.version).toBe(7)
      expect(migrations[6]?.name).toBe('blog_posts')
    })

    it('should return migrations sorted by version', async () => {
      const migrations = await loadTenantMigrations()

      for (let i = 1; i < migrations.length; i++) {
        expect(migrations[i]!.version).toBeGreaterThan(migrations[i - 1]!.version)
      }
    })

    it('should include SQL content', async () => {
      const migrations = await loadTenantMigrations()

      for (const migration of migrations) {
        expect(migration.sql).toBeTruthy()
        expect(migration.sql.length).toBeGreaterThan(0)
        expect(migration.sql).toContain('CREATE')
      }
    })

    it('should have correct filenames', async () => {
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
    it('public migrations should use IF NOT EXISTS for idempotency', async () => {
      const migrations = await loadPublicMigrations()

      for (const migration of migrations) {
        // Each migration should have at least one CREATE TABLE IF NOT EXISTS
        // or other idempotent pattern
        const hasIfNotExists =
          migration.sql.includes('IF NOT EXISTS') ||
          migration.sql.includes('DO $$') // For DO blocks that check existence
        expect(hasIfNotExists).toBe(true)
      }
    })

    it('tenant migrations should use IF NOT EXISTS for idempotency', async () => {
      const migrations = await loadTenantMigrations()

      for (const migration of migrations) {
        const hasIfNotExists =
          migration.sql.includes('IF NOT EXISTS') ||
          migration.sql.includes('DO $$')
        expect(hasIfNotExists).toBe(true)
      }
    })

    it('public migrations should include timestamps', async () => {
      const migrations = await loadPublicMigrations()

      for (const migration of migrations) {
        // Every table should have created_at
        if (migration.sql.includes('CREATE TABLE')) {
          expect(migration.sql).toContain('created_at')
        }
      }
    })

    it('tenant migrations should include timestamps', async () => {
      const migrations = await loadTenantMigrations()

      for (const migration of migrations) {
        if (migration.sql.includes('CREATE TABLE')) {
          expect(migration.sql).toContain('created_at')
        }
      }
    })
  })
})
