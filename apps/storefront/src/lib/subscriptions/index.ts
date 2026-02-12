/**
 * Subscription module exports
 *
 * This module provides subscription management functionality.
 *
 * Usage:
 * - Client Components: import from '@/lib/subscriptions/api'
 * - Server Components: import from '@/lib/subscriptions/api.server'
 * - Types: import from '@/lib/subscriptions' or '@/lib/subscriptions/types'
 */

export * from './types'

// Client-side API (for use in 'use client' components)
// Note: For Server Components, import from '@/lib/subscriptions/api.server' directly
export * from './api'
