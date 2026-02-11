/**
 * Feature Flags Seeder
 *
 * Seeds the platform flags on first run.
 */

import { createLogger } from '@cgk/logging'

import { PLATFORM_FLAGS } from './platform-flags.js'
import { seedFlags } from './repository.js'
import type { CreateFlagInput } from './types.js'

const logger = createLogger({
  meta: { service: 'feature-flags', component: 'seed' },
})

/**
 * Seed all platform flags
 *
 * This function is idempotent - it will create new flags and update
 * existing ones with new metadata/targeting if needed.
 *
 * @param userId - Optional user ID for audit trail
 * @returns Number of flags created and updated
 */
export async function seedPlatformFlags(userId?: string): Promise<{
  created: number
  updated: number
  total: number
}> {
  logger.info('Seeding platform flags', { count: PLATFORM_FLAGS.length })

  const flagInputs: CreateFlagInput[] = PLATFORM_FLAGS.map((flag) => ({
    key: flag.key,
    name: flag.name,
    description: flag.description,
    type: flag.type,
    defaultValue: flag.defaultValue,
    category: flag.category,
    targeting: flag.targeting,
  }))

  try {
    const result = await seedFlags(flagInputs, userId)

    logger.info('Platform flags seeded', {
      created: result.created,
      updated: result.updated,
      total: PLATFORM_FLAGS.length,
    })

    return {
      created: result.created,
      updated: result.updated,
      total: PLATFORM_FLAGS.length,
    }
  } catch (error) {
    logger.error('Failed to seed platform flags', error as Error)
    throw error
  }
}

/**
 * Check if platform flags need seeding
 *
 * Returns true if any platform flags are missing
 */
export async function needsSeeding(): Promise<boolean> {
  const { sql } = await import('@cgk/db')

  // Check count of existing platform flags
  const result = await sql`
    SELECT COUNT(*) as count FROM feature_flags
    WHERE key LIKE 'platform.%'
       OR key LIKE 'checkout.%'
       OR key LIKE 'payments.%'
       OR key LIKE 'mcp.%'
       OR key LIKE 'ai.%'
       OR key LIKE 'creators.%'
       OR key LIKE 'admin.%'
  `

  const count = parseInt(result.rows[0]?.count as string || '0', 10)
  return count < PLATFORM_FLAGS.length
}

/**
 * Auto-seed on import if needed
 *
 * This can be called in app initialization to ensure flags exist
 */
export async function ensurePlatformFlagsExist(): Promise<void> {
  const needs = await needsSeeding()

  if (needs) {
    await seedPlatformFlags()
  }
}
