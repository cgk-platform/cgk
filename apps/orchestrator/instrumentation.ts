/**
 * Orchestrator - Server Instrumentation
 *
 * This file runs once when the Next.js server starts.
 * Used for environment variable validation and setup.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { validateAppEnv } from '@cgk-platform/core'

export async function register() {
  // Validate required environment variables
  validateAppEnv('orchestrator')

  console.log('[ORCHESTRATOR] Environment variables validated successfully')
}
