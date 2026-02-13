/**
 * Onboarding Session Service
 *
 * Manages onboarding sessions for brand creation.
 */

import { sql } from '@cgk-platform/db'
import { createLogger } from '@cgk-platform/logging'

import type {
  CreateSessionInput,
  OnboardingSession,
  OnboardingSessionStatus,
  OnboardingStepProgress,
  OnboardingStepStatus,
  SessionWithProgress,
  StepData,
  StepNumber,
  UpdateStepInput,
} from './types.js'
import { STEP_NAMES } from './types.js'

const logger = createLogger({
  meta: { service: 'onboarding', component: 'session' },
})

/**
 * Map database row to OnboardingSession
 */
function mapRowToSession(row: Record<string, unknown>): OnboardingSession {
  return {
    id: row.id as string,
    organizationId: (row.organization_id as string) || null,
    createdBy: (row.created_by as string) || null,
    status: row.status as OnboardingSessionStatus,
    currentStep: row.current_step as StepNumber,
    stepData: (row.step_data as StepData) || {},
    startedAt: new Date(row.started_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    lastActivityAt: new Date(row.last_activity_at as string),
    expiresAt: new Date(row.expires_at as string),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Map database row to OnboardingStepProgress
 */
function mapRowToStep(row: Record<string, unknown>): OnboardingStepProgress {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    stepNumber: row.step_number as StepNumber,
    stepName: row.step_name as string,
    status: row.status as OnboardingStepStatus,
    data: (row.data as Record<string, unknown>) || {},
    errors: (row.errors as Record<string, string>) || null,
    startedAt: row.started_at ? new Date(row.started_at as string) : null,
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Create a new onboarding session
 */
export async function createSession(input: CreateSessionInput): Promise<OnboardingSession> {
  logger.info('Creating onboarding session', { createdBy: input.createdBy })

  const result = await sql`
    INSERT INTO onboarding_sessions (created_by)
    VALUES (${input.createdBy})
    RETURNING *
  `

  const session = mapRowToSession(result.rows[0] as Record<string, unknown>)

  // Create initial step records for all 9 steps
  for (let step = 1; step <= 9; step++) {
    const stepName = STEP_NAMES[step as StepNumber]
    await sql`
      INSERT INTO onboarding_steps (session_id, step_number, step_name)
      VALUES (${session.id}, ${step}, ${stepName})
    `
  }

  logger.info('Session created', { sessionId: session.id })

  return session
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<OnboardingSession | null> {
  const result = await sql`
    SELECT * FROM onboarding_sessions
    WHERE id = ${sessionId}
  `

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToSession(result.rows[0] as Record<string, unknown>)
}

/**
 * Get session with all step progress
 */
export async function getSessionWithProgress(sessionId: string): Promise<SessionWithProgress | null> {
  const session = await getSession(sessionId)
  if (!session) {
    return null
  }

  const stepsResult = await sql`
    SELECT * FROM onboarding_steps
    WHERE session_id = ${sessionId}
    ORDER BY step_number ASC
  `

  const steps = stepsResult.rows.map((row) =>
    mapRowToStep(row as Record<string, unknown>)
  )

  return {
    ...session,
    steps,
  }
}

/**
 * Get active session for a user
 * Returns the most recent in-progress session
 */
export async function getActiveSessionForUser(userId: string): Promise<OnboardingSession | null> {
  const result = await sql`
    SELECT * FROM onboarding_sessions
    WHERE created_by = ${userId}
      AND status = 'in_progress'
      AND expires_at > NOW()
    ORDER BY last_activity_at DESC
    LIMIT 1
  `

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToSession(result.rows[0] as Record<string, unknown>)
}

/**
 * Get session by organization ID
 */
export async function getSessionByOrganization(
  organizationId: string
): Promise<OnboardingSession | null> {
  const result = await sql`
    SELECT * FROM onboarding_sessions
    WHERE organization_id = ${organizationId}
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToSession(result.rows[0] as Record<string, unknown>)
}

/**
 * Update session step data and current step
 */
export async function updateSession(
  sessionId: string,
  updates: {
    organizationId?: string
    currentStep?: StepNumber
    stepData?: StepData
    status?: OnboardingSessionStatus
  }
): Promise<OnboardingSession> {
  logger.info('Updating session', { sessionId, updates: Object.keys(updates) })

  const result = await sql`
    UPDATE onboarding_sessions
    SET
      last_activity_at = NOW(),
      organization_id = COALESCE(${updates.organizationId || null}, organization_id),
      current_step = COALESCE(${updates.currentStep || null}, current_step),
      step_data = COALESCE(${updates.stepData ? JSON.stringify(updates.stepData) : null}::jsonb, step_data),
      status = COALESCE(${updates.status || null}::onboarding_status, status),
      completed_at = CASE WHEN ${updates.status || null} = 'completed' THEN NOW() ELSE completed_at END
    WHERE id = ${sessionId}
    RETURNING *
  `

  if (result.rows.length === 0) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  return mapRowToSession(result.rows[0] as Record<string, unknown>)
}

/**
 * Update step progress
 */
export async function updateStepProgress(input: UpdateStepInput): Promise<OnboardingStepProgress> {
  const { sessionId, stepNumber, data, status } = input
  const stepName = STEP_NAMES[stepNumber]

  logger.info('Updating step progress', { sessionId, stepNumber, status })

  const result = await sql`
    UPDATE onboarding_steps
    SET
      data = ${JSON.stringify(data)}::jsonb,
      status = COALESCE(${status || null}::onboarding_step_status, status),
      started_at = CASE
        WHEN started_at IS NULL AND ${status || null} IN ('in_progress', 'completed') THEN NOW()
        ELSE started_at
      END,
      completed_at = CASE
        WHEN ${status || null} IN ('completed', 'skipped') THEN NOW()
        ELSE completed_at
      END
    WHERE session_id = ${sessionId} AND step_number = ${stepNumber}
    RETURNING *
  `

  if (result.rows.length === 0) {
    // Create if not exists
    const insertResult = await sql`
      INSERT INTO onboarding_steps (session_id, step_number, step_name, data, status)
      VALUES (${sessionId}, ${stepNumber}, ${stepName}, ${JSON.stringify(data)}::jsonb, ${status || 'pending'})
      RETURNING *
    `
    return mapRowToStep(insertResult.rows[0] as Record<string, unknown>)
  }

  return mapRowToStep(result.rows[0] as Record<string, unknown>)
}

/**
 * Mark step as completed
 */
export async function completeStep(
  sessionId: string,
  stepNumber: StepNumber,
  data: Record<string, unknown>
): Promise<OnboardingStepProgress> {
  return updateStepProgress({
    sessionId,
    stepNumber,
    data,
    status: 'completed',
  })
}

/**
 * Skip a step
 */
export async function skipStep(sessionId: string, stepNumber: StepNumber): Promise<OnboardingStepProgress> {
  return updateStepProgress({
    sessionId,
    stepNumber,
    data: {},
    status: 'skipped',
  })
}

/**
 * Complete onboarding session
 */
export async function completeSession(sessionId: string): Promise<OnboardingSession> {
  logger.info('Completing session', { sessionId })

  const result = await sql`
    UPDATE onboarding_sessions
    SET
      status = 'completed',
      completed_at = NOW(),
      last_activity_at = NOW()
    WHERE id = ${sessionId}
    RETURNING *
  `

  if (result.rows.length === 0) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  return mapRowToSession(result.rows[0] as Record<string, unknown>)
}

/**
 * Abandon session
 */
export async function abandonSession(sessionId: string): Promise<void> {
  logger.info('Abandoning session', { sessionId })

  await sql`
    UPDATE onboarding_sessions
    SET status = 'abandoned', last_activity_at = NOW()
    WHERE id = ${sessionId}
  `
}

/**
 * Clean up expired sessions
 * Should be run by a background job
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await sql`
    UPDATE onboarding_sessions
    SET status = 'abandoned'
    WHERE status = 'in_progress'
      AND expires_at < NOW()
    RETURNING id
  `

  const count = result.rows.length
  if (count > 0) {
    logger.info('Cleaned up expired sessions', { count })
  }

  return count
}

/**
 * Get all in-progress sessions (for admin monitoring)
 */
export async function getInProgressSessions(options?: {
  limit?: number
  offset?: number
}): Promise<{ sessions: OnboardingSession[]; total: number }> {
  const limit = options?.limit || 50
  const offset = options?.offset || 0

  const [sessionsResult, countResult] = await Promise.all([
    sql`
      SELECT os.*, u.email as user_email, o.name as org_name
      FROM onboarding_sessions os
      LEFT JOIN users u ON u.id = os.created_by
      LEFT JOIN organizations o ON o.id = os.organization_id
      WHERE os.status = 'in_progress'
      ORDER BY os.last_activity_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*) as count FROM onboarding_sessions
      WHERE status = 'in_progress'
    `,
  ])

  return {
    sessions: sessionsResult.rows.map((row) =>
      mapRowToSession(row as Record<string, unknown>)
    ),
    total: parseInt((countResult.rows[0] as Record<string, unknown>).count as string, 10),
  }
}
