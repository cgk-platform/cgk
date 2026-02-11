import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/auth',
  'packages/db',
  'packages/ui',
  'packages/shopify',
  'packages/commerce',
  'packages/core',
])
