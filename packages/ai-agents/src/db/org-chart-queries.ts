/**
 * Database queries for Org Chart system
 * All queries expect to be run within a tenant context via withTenant()
 */

import { sql } from '@cgk-platform/db'
import type {
  EmployeeType,
  OrgChartEntry,
  UpdateOrgChartInput,
} from '../types/teams.js'

// Helper to convert snake_case DB rows to camelCase
function toCamelCase<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
    result[camelKey] = value
  }
  return result as T
}

// ============================================================================
// Org Chart CRUD
// ============================================================================

/**
 * Create or update an org chart entry
 */
export async function upsertOrgChartEntry(params: {
  employeeType: EmployeeType
  employeeId: string
  reportsToType?: EmployeeType | null
  reportsToId?: string | null
  department?: string | null
  team?: string | null
  displayOrder?: number
}): Promise<OrgChartEntry> {
  const result = await sql`
    INSERT INTO org_chart (
      employee_type, employee_id,
      reports_to_type, reports_to_id,
      department, team, display_order
    )
    VALUES (
      ${params.employeeType},
      ${params.employeeId},
      ${params.reportsToType || null},
      ${params.reportsToId || null},
      ${params.department || null},
      ${params.team || null},
      ${params.displayOrder || 0}
    )
    ON CONFLICT (tenant_id, employee_type, employee_id)
    DO UPDATE SET
      reports_to_type = EXCLUDED.reports_to_type,
      reports_to_id = EXCLUDED.reports_to_id,
      department = EXCLUDED.department,
      team = EXCLUDED.team,
      display_order = EXCLUDED.display_order,
      updated_at = NOW()
    RETURNING *
  `

  return toCamelCase<OrgChartEntry>(result.rows[0] as Record<string, unknown>)
}

/**
 * Get an org chart entry
 */
export async function getOrgChartEntry(
  employeeType: EmployeeType,
  employeeId: string
): Promise<OrgChartEntry | null> {
  const result = await sql`
    SELECT * FROM org_chart
    WHERE employee_type = ${employeeType} AND employee_id = ${employeeId}
  `
  return result.rows[0] ? toCamelCase<OrgChartEntry>(result.rows[0] as Record<string, unknown>) : null
}

/**
 * List all org chart entries
 */
export async function listOrgChartEntries(): Promise<OrgChartEntry[]> {
  const result = await sql`
    SELECT * FROM org_chart
    ORDER BY level ASC, display_order ASC
  `
  return result.rows.map((row) => toCamelCase<OrgChartEntry>(row as Record<string, unknown>))
}

/**
 * Get direct reports for an employee
 */
export async function getDirectReports(
  employeeType: EmployeeType,
  employeeId: string
): Promise<OrgChartEntry[]> {
  const result = await sql`
    SELECT * FROM org_chart
    WHERE reports_to_type = ${employeeType} AND reports_to_id = ${employeeId}
    ORDER BY display_order ASC
  `
  return result.rows.map((row) => toCamelCase<OrgChartEntry>(row as Record<string, unknown>))
}

/**
 * Update an org chart entry
 */
export async function updateOrgChartEntry(
  employeeType: EmployeeType,
  employeeId: string,
  input: UpdateOrgChartInput
): Promise<OrgChartEntry | null> {
  const sets: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (input.reportsToType !== undefined) {
    sets.push(`reports_to_type = $${paramIndex++}`)
    values.push(input.reportsToType)
  }
  if (input.reportsToId !== undefined) {
    sets.push(`reports_to_id = $${paramIndex++}`)
    values.push(input.reportsToId)
  }
  if (input.department !== undefined) {
    sets.push(`department = $${paramIndex++}`)
    values.push(input.department)
  }
  if (input.team !== undefined) {
    sets.push(`team = $${paramIndex++}`)
    values.push(input.team)
  }
  if (input.displayOrder !== undefined) {
    sets.push(`display_order = $${paramIndex++}`)
    values.push(input.displayOrder)
  }

  if (sets.length === 0) {
    return getOrgChartEntry(employeeType, employeeId)
  }

  sets.push(`updated_at = NOW()`)
  values.push(employeeType, employeeId)

  const query = `
    UPDATE org_chart SET ${sets.join(', ')}
    WHERE employee_type = $${paramIndex++} AND employee_id = $${paramIndex}
    RETURNING *
  `
  const result = await sql.query(query, values)

  return result.rows[0] ? toCamelCase<OrgChartEntry>(result.rows[0] as Record<string, unknown>) : null
}

/**
 * Delete an org chart entry
 */
export async function deleteOrgChartEntry(
  employeeType: EmployeeType,
  employeeId: string
): Promise<boolean> {
  const result = await sql`
    DELETE FROM org_chart
    WHERE employee_type = ${employeeType} AND employee_id = ${employeeId}
  `
  return (result.rowCount ?? 0) > 0
}

/**
 * Set org chart level for an entry
 */
export async function setOrgChartLevel(
  employeeType: EmployeeType,
  employeeId: string,
  level: number
): Promise<void> {
  await sql`
    UPDATE org_chart
    SET level = ${level}, updated_at = NOW()
    WHERE employee_type = ${employeeType} AND employee_id = ${employeeId}
  `
}

/**
 * Set all root entries to level 0
 */
export async function setRootLevels(): Promise<void> {
  await sql`
    UPDATE org_chart
    SET level = 0
    WHERE reports_to_id IS NULL
  `
}

/**
 * Calculate levels for a given parent level
 * Returns number of rows updated
 */
export async function calculateChildLevels(parentLevel: number): Promise<number> {
  const childLevel = parentLevel + 1

  const result = await sql`
    UPDATE org_chart oc
    SET level = ${childLevel}
    FROM org_chart parent
    WHERE oc.reports_to_id = parent.employee_id
      AND oc.reports_to_type = parent.employee_type
      AND parent.level = ${parentLevel}
      AND oc.level IS DISTINCT FROM ${childLevel}
  `

  return result.rowCount ?? 0
}

/**
 * Get org chart data for building tree with employee details
 */
export async function getOrgChartWithDetails(): Promise<
  Array<{
    id: string
    employeeType: EmployeeType
    employeeId: string
    reportsToType: EmployeeType | null
    reportsToId: string | null
    level: number
    department: string | null
    team: string | null
    displayOrder: number
    name: string
    title: string
    avatarUrl: string | null
  }>
> {
  const result = await sql`
    SELECT
      oc.id,
      oc.employee_type,
      oc.employee_id,
      oc.reports_to_type,
      oc.reports_to_id,
      oc.level,
      oc.department,
      oc.team,
      oc.display_order,
      CASE
        WHEN oc.employee_type = 'ai' THEN a.display_name
        ELSE tm.name
      END as name,
      CASE
        WHEN oc.employee_type = 'ai' THEN a.role
        ELSE tm.title
      END as title,
      CASE
        WHEN oc.employee_type = 'ai' THEN a.avatar_url
        ELSE tm.avatar_url
      END as avatar_url
    FROM org_chart oc
    LEFT JOIN ai_agents a ON oc.employee_type = 'ai' AND oc.employee_id = a.id::text
    LEFT JOIN public.team_members tm ON oc.employee_type = 'human' AND oc.employee_id = tm.user_id
    ORDER BY oc.level ASC, oc.display_order ASC
  `

  return result.rows.map((row) => ({
    id: row.id as string,
    employeeType: row.employee_type as EmployeeType,
    employeeId: row.employee_id as string,
    reportsToType: row.reports_to_type as EmployeeType | null,
    reportsToId: row.reports_to_id as string | null,
    level: row.level as number,
    department: row.department as string | null,
    team: row.team as string | null,
    displayOrder: row.display_order as number,
    name: (row.name as string) || 'Unknown',
    title: (row.title as string) || 'Unknown',
    avatarUrl: row.avatar_url as string | null,
  }))
}
