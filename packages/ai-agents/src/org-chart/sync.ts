/**
 * Org Chart Sync - Synchronize org chart with team_members and ai_agents
 */

import { sql } from '@cgk-platform/db'
import {
  calculateChildLevels,
  setRootLevels,
  upsertOrgChartEntry,
} from '../db/org-chart-queries.js'
import type { EmployeeType } from '../types/teams.js'

/**
 * Sync the entire org chart from team_members and ai_agents tables
 */
export async function syncOrgChart(): Promise<{
  humansAdded: number
  aiAgentsAdded: number
  levelsCalculated: boolean
}> {
  let humansAdded = 0
  let aiAgentsAdded = 0

  // Sync human employees from team_members
  const humans = await sql`
    SELECT user_id, name, title, manager_id, department
    FROM team_members
    WHERE status != 'inactive'
  `

  for (const human of humans.rows) {
    await upsertOrgChartEntry({
      employeeType: 'human' as EmployeeType,
      employeeId: human.user_id as string,
      reportsToType: human.manager_id ? ('human' as EmployeeType) : null,
      reportsToId: human.manager_id as string | null,
      department: human.department as string | null,
    })
    humansAdded++
  }

  // Sync AI agents
  const agents = await sql`
    SELECT
      id, display_name, role,
      manager_agent_id, human_manager_id
    FROM ai_agents
    WHERE status = 'active'
  `

  for (const agent of agents.rows) {
    // Determine reporting relationship
    let reportsToType: EmployeeType | null = null
    let reportsToId: string | null = null

    if (agent.manager_agent_id) {
      reportsToType = 'ai'
      reportsToId = agent.manager_agent_id as string
    } else if (agent.human_manager_id) {
      reportsToType = 'human'
      reportsToId = agent.human_manager_id as string
    }

    await upsertOrgChartEntry({
      employeeType: 'ai' as EmployeeType,
      employeeId: agent.id as string,
      reportsToType,
      reportsToId,
    })
    aiAgentsAdded++
  }

  // Calculate levels
  await calculateOrgLevels()

  return {
    humansAdded,
    aiAgentsAdded,
    levelsCalculated: true,
  }
}

/**
 * Calculate hierarchy levels for all org chart entries
 */
export async function calculateOrgLevels(): Promise<void> {
  // Set roots to level 0
  await setRootLevels()

  // Recursively set levels (max depth 10 to prevent infinite loops)
  for (let level = 0; level < 10; level++) {
    const updated = await calculateChildLevels(level)
    if (updated === 0) break
  }
}

/**
 * Add a human employee to the org chart
 */
export async function addHumanToOrgChart(params: {
  userId: string
  reportsToUserId?: string
  department?: string
  team?: string
}): Promise<void> {
  await upsertOrgChartEntry({
    employeeType: 'human',
    employeeId: params.userId,
    reportsToType: params.reportsToUserId ? 'human' : null,
    reportsToId: params.reportsToUserId || null,
    department: params.department,
    team: params.team,
  })

  // Recalculate levels
  await calculateOrgLevels()
}

/**
 * Add an AI agent to the org chart
 */
export async function addAgentToOrgChart(params: {
  agentId: string
  reportsToType?: EmployeeType
  reportsToId?: string
  department?: string
  team?: string
}): Promise<void> {
  await upsertOrgChartEntry({
    employeeType: 'ai',
    employeeId: params.agentId,
    reportsToType: params.reportsToType || null,
    reportsToId: params.reportsToId || null,
    department: params.department,
    team: params.team,
  })

  // Recalculate levels
  await calculateOrgLevels()
}

/**
 * Update reporting relationship
 */
export async function updateReportingRelationship(params: {
  employeeType: EmployeeType
  employeeId: string
  reportsToType: EmployeeType | null
  reportsToId: string | null
}): Promise<void> {
  await upsertOrgChartEntry({
    employeeType: params.employeeType,
    employeeId: params.employeeId,
    reportsToType: params.reportsToType,
    reportsToId: params.reportsToId,
  })

  // Recalculate levels
  await calculateOrgLevels()
}

/**
 * Remove an employee from the org chart
 */
export async function removeFromOrgChart(
  employeeType: EmployeeType,
  employeeId: string
): Promise<void> {
  // First, reassign any direct reports to this person's manager
  const entry = await sql`
    SELECT reports_to_type, reports_to_id
    FROM org_chart
    WHERE employee_type = ${employeeType} AND employee_id = ${employeeId}
  `

  if (entry.rows[0]) {
    const { reports_to_type, reports_to_id } = entry.rows[0]

    // Update all direct reports
    await sql`
      UPDATE org_chart
      SET reports_to_type = ${reports_to_type}, reports_to_id = ${reports_to_id}
      WHERE reports_to_type = ${employeeType} AND reports_to_id = ${employeeId}
    `
  }

  // Delete the entry
  await sql`
    DELETE FROM org_chart
    WHERE employee_type = ${employeeType} AND employee_id = ${employeeId}
  `

  // Recalculate levels
  await calculateOrgLevels()
}

/**
 * Sync a single agent's org chart entry
 */
export async function syncAgentOrgChart(agentId: string): Promise<void> {
  const agent = await sql`
    SELECT id, manager_agent_id, human_manager_id
    FROM ai_agents
    WHERE id = ${agentId}
  `

  if (!agent.rows[0]) return

  const row = agent.rows[0]
  let reportsToType: EmployeeType | null = null
  let reportsToId: string | null = null

  if (row.manager_agent_id) {
    reportsToType = 'ai'
    reportsToId = row.manager_agent_id as string
  } else if (row.human_manager_id) {
    reportsToType = 'human'
    reportsToId = row.human_manager_id as string
  }

  await upsertOrgChartEntry({
    employeeType: 'ai',
    employeeId: agentId,
    reportsToType,
    reportsToId,
  })

  await calculateOrgLevels()
}

/**
 * Validate org chart integrity
 */
export async function validateOrgChart(): Promise<{
  valid: boolean
  issues: string[]
}> {
  const issues: string[] = []

  // Check for cycles (should be caught by level calculation, but double-check)
  const entries = await sql`
    SELECT employee_type, employee_id, reports_to_type, reports_to_id, level
    FROM org_chart
  `

  // Check for orphaned references
  const employeeSet = new Set(
    entries.rows.map((e) => `${e.employee_type}:${e.employee_id}`)
  )

  for (const entry of entries.rows) {
    if (entry.reports_to_id) {
      const managerKey = `${entry.reports_to_type}:${entry.reports_to_id}`
      if (!employeeSet.has(managerKey)) {
        issues.push(
          `Employee ${entry.employee_type}:${entry.employee_id} reports to non-existent ${managerKey}`
        )
      }
    }
  }

  // Check for negative levels (indicates cycle or error)
  for (const entry of entries.rows) {
    if ((entry.level as number) < 0) {
      issues.push(`Employee ${entry.employee_type}:${entry.employee_id} has negative level`)
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}
