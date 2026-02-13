/**
 * Test Setup for Migration Testing
 *
 * Configures test environment, mocks, and cleanup handlers.
 */

import { beforeAll, afterAll, vi } from 'vitest'

// Set default test environment variables
beforeAll(() => {
  // Ensure we have a consistent encryption key for tests
  process.env['MIGRATION_ENCRYPTION_KEY'] = 'test-encryption-key-32-chars-!'

  // Mock database URLs if not set (for unit tests)
  if (!process.env['RAWDOG_POSTGRES_URL']) {
    process.env['RAWDOG_POSTGRES_URL'] = 'postgresql://test:test@localhost:5432/rawdog_test'
  }
  if (!process.env['POSTGRES_URL']) {
    process.env['POSTGRES_URL'] = 'postgresql://test:test@localhost:5432/cgk_test'
  }
})

// Clean up after all tests
afterAll(() => {
  vi.restoreAllMocks()
})

// Extend Vitest types
declare module 'vitest' {
  export interface Assertion<T = unknown> {
    toBeValidEncryptedPayload(): T
    toMatchRowShape(expected: Record<string, unknown>): T
  }
}
