/**
 * Org Chart Builder - Build tree structure from org chart data
 */

import {
  getDirectReports,
  getOrgChartEntry,
  getOrgChartWithDetails,
} from '../db/org-chart-queries.js'
import type { EmployeeType, OrgChartNode } from '../types/teams.js'

/**
 * Build the complete org chart tree
 */
export async function buildOrgChart(): Promise<OrgChartNode[]> {
  const entries = await getOrgChartWithDetails()

  // Build tree structure
  const nodeMap = new Map<string, OrgChartNode>()
  const roots: OrgChartNode[] = []

  // First pass: create all nodes
  for (const entry of entries) {
    const nodeId = `${entry.employeeType}:${entry.employeeId}`
    const node: OrgChartNode = {
      id: nodeId,
      type: entry.employeeType,
      name: entry.name,
      title: entry.title,
      avatarUrl: entry.avatarUrl || undefined,
      department: entry.department || undefined,
      team: entry.team || undefined,
      level: entry.level,
      children: [],
    }
    nodeMap.set(nodeId, node)
  }

  // Second pass: build tree relationships
  for (const entry of entries) {
    const nodeId = `${entry.employeeType}:${entry.employeeId}`
    const node = nodeMap.get(nodeId)!

    if (entry.reportsToId && entry.reportsToType) {
      const parentId = `${entry.reportsToType}:${entry.reportsToId}`
      const parent = nodeMap.get(parentId)
      if (parent) {
        parent.children.push(node)
      } else {
        // Parent not found, treat as root
        roots.push(node)
      }
    } else {
      roots.push(node)
    }
  }

  // Sort children by display order
  const sortChildren = (nodes: OrgChartNode[]): void => {
    nodes.sort((a, b) => a.level - b.level)
    for (const node of nodes) {
      sortChildren(node.children)
    }
  }
  sortChildren(roots)

  return roots
}

/**
 * Get a subtree starting from a specific employee
 */
export async function getOrgSubtree(
  employeeType: EmployeeType,
  employeeId: string
): Promise<OrgChartNode | null> {
  const entry = await getOrgChartEntry(employeeType, employeeId)
  if (!entry) return null

  const entries = await getOrgChartWithDetails()
  const entryMap = new Map(entries.map((e) => [`${e.employeeType}:${e.employeeId}`, e]))

  const buildSubtree = (type: EmployeeType, id: string): OrgChartNode | null => {
    const key = `${type}:${id}`
    const data = entryMap.get(key)
    if (!data) return null

    const node: OrgChartNode = {
      id: key,
      type: data.employeeType,
      name: data.name,
      title: data.title,
      avatarUrl: data.avatarUrl || undefined,
      department: data.department || undefined,
      team: data.team || undefined,
      level: data.level,
      children: [],
    }

    // Find children
    for (const e of entries) {
      if (e.reportsToType === type && e.reportsToId === id) {
        const child = buildSubtree(e.employeeType, e.employeeId)
        if (child) {
          node.children.push(child)
        }
      }
    }

    return node
  }

  return buildSubtree(employeeType, employeeId)
}

/**
 * Get direct reports for an employee
 */
export async function getEmployeeDirectReports(
  employeeType: EmployeeType,
  employeeId: string
): Promise<OrgChartNode[]> {
  const reports = await getDirectReports(employeeType, employeeId)
  const entries = await getOrgChartWithDetails()
  const entryMap = new Map(entries.map((e) => [`${e.employeeType}:${e.employeeId}`, e]))

  return reports
    .map((report) => {
      const key = `${report.employeeType}:${report.employeeId}`
      const data = entryMap.get(key)
      if (!data) return null

      return {
        id: key,
        type: data.employeeType,
        name: data.name,
        title: data.title,
        avatarUrl: data.avatarUrl || undefined,
        department: data.department || undefined,
        team: data.team || undefined,
        level: data.level,
        children: [],
      } as OrgChartNode
    })
    .filter((n): n is OrgChartNode => n !== null)
}

/**
 * Find the path from one employee to another (reporting chain)
 */
export async function findReportingPath(
  fromType: EmployeeType,
  fromId: string,
  toType: EmployeeType,
  toId: string
): Promise<Array<{ type: EmployeeType; id: string; name: string }> | null> {
  const entries = await getOrgChartWithDetails()
  const entryMap = new Map(entries.map((e) => [`${e.employeeType}:${e.employeeId}`, e]))

  // Build path from 'from' up to root
  const fromPath: Array<{ type: EmployeeType; id: string; name: string }> = []
  let current = entryMap.get(`${fromType}:${fromId}`)
  while (current) {
    fromPath.push({
      type: current.employeeType,
      id: current.employeeId,
      name: current.name,
    })
    if (current.reportsToType && current.reportsToId) {
      current = entryMap.get(`${current.reportsToType}:${current.reportsToId}`)
    } else {
      break
    }
  }

  // Build path from 'to' up to root
  const toPath: Array<{ type: EmployeeType; id: string; name: string }> = []
  current = entryMap.get(`${toType}:${toId}`)
  while (current) {
    toPath.push({
      type: current.employeeType,
      id: current.employeeId,
      name: current.name,
    })
    if (current.reportsToType && current.reportsToId) {
      current = entryMap.get(`${current.reportsToType}:${current.reportsToId}`)
    } else {
      break
    }
  }

  // Find common ancestor
  const fromSet = new Set(fromPath.map((p) => `${p.type}:${p.id}`))
  let commonIndex = -1
  for (let i = 0; i < toPath.length; i++) {
    const toPathEntry = toPath[i]
    if (toPathEntry && fromSet.has(`${toPathEntry.type}:${toPathEntry.id}`)) {
      commonIndex = i
      break
    }
  }

  if (commonIndex === -1) {
    return null // No common ancestor
  }

  const commonAncestor = toPath[commonIndex]
  if (!commonAncestor) {
    return null
  }

  // Build path: from -> common -> to
  const fromToCommon = fromPath.slice(
    0,
    fromPath.findIndex(
      (p) => p.type === commonAncestor.type && p.id === commonAncestor.id
    ) + 1
  )
  const commonToTo = toPath.slice(0, commonIndex).reverse()

  return [...fromToCommon, ...commonToTo]
}

/**
 * Calculate org chart stats
 */
export async function getOrgChartStats(): Promise<{
  totalEmployees: number
  aiAgents: number
  humans: number
  maxDepth: number
  departments: string[]
}> {
  const entries = await getOrgChartWithDetails()

  const stats = {
    totalEmployees: entries.length,
    aiAgents: entries.filter((e) => e.employeeType === 'ai').length,
    humans: entries.filter((e) => e.employeeType === 'human').length,
    maxDepth: Math.max(...entries.map((e) => e.level), 0),
    departments: [...new Set(entries.map((e) => e.department).filter((d): d is string => !!d))],
  }

  return stats
}

/**
 * Render org chart as text (for debugging/logging)
 */
export function renderOrgChartAsText(nodes: OrgChartNode[], indent = 0): string {
  const lines: string[] = []
  const prefix = '  '.repeat(indent)
  const icon = (type: EmployeeType) => (type === 'ai' ? '[AI]' : '[H]')

  for (const node of nodes) {
    lines.push(`${prefix}${icon(node.type)} ${node.name} - ${node.title}`)
    if (node.children.length > 0) {
      lines.push(renderOrgChartAsText(node.children, indent + 1))
    }
  }

  return lines.join('\n')
}
