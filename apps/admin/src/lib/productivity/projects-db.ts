/**
 * PHASE-2H-PRODUCTIVITY: Project database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'

import type {
  Project,
  ProjectWithUsers,
  TaskWithUsers,
  ProjectFilters,
  ProjectStats,
  ProjectPipelineStage,
  CreateProjectInput,
  UpdateProjectInput,
} from './types'

/**
 * Get projects with filtering and pagination
 */
export async function getProjects(
  tenantSlug: string,
  filters: ProjectFilters,
): Promise<{ rows: ProjectWithUsers[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    // Search filter
    if (filters.search) {
      paramIndex++
      conditions.push(`(p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`)
      values.push(`%${filters.search}%`)
    }

    // Status filter
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
      paramIndex++
      conditions.push(`p.status = ANY($${paramIndex}::project_status[])`)
      values.push(statuses)
    }

    // Pipeline stage filter
    if (filters.pipeline_stage) {
      const stages = Array.isArray(filters.pipeline_stage) ? filters.pipeline_stage : [filters.pipeline_stage]
      paramIndex++
      conditions.push(`p.pipeline_stage = ANY($${paramIndex}::project_pipeline_stage[])`)
      values.push(stages)
    }

    // Owner filter
    if (filters.owner_id) {
      paramIndex++
      conditions.push(`p.owner_id = $${paramIndex}`)
      values.push(filters.owner_id)
    }

    // Project type filter
    if (filters.project_type) {
      paramIndex++
      conditions.push(`p.project_type = $${paramIndex}::project_type`)
      values.push(filters.project_type)
    }

    // Due date filters
    if (filters.due_before) {
      paramIndex++
      conditions.push(`p.due_date <= $${paramIndex}`)
      values.push(filters.due_before)
    }

    if (filters.due_after) {
      paramIndex++
      conditions.push(`p.due_date >= $${paramIndex}`)
      values.push(filters.due_after)
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      paramIndex++
      conditions.push(`p.tags && $${paramIndex}::text[]`)
      values.push(filters.tags)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Sort mapping
    const sortMap: Record<string, string> = {
      created_at: 'p.created_at',
      due_date: 'p.due_date',
      pipeline_order: 'p.pipeline_stage, p.pipeline_order',
      title: 'p.title',
      updated_at: 'p.updated_at',
    }
    const sortCol = sortMap[filters.sort] || 'p.created_at'
    const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT
        p.*,
        -- Owner
        CASE WHEN owner.id IS NOT NULL THEN
          jsonb_build_object('id', owner.id, 'name', owner.name, 'email', owner.email)
        ELSE NULL END as owner,
        -- Coordinator
        CASE WHEN coordinator.id IS NOT NULL THEN
          jsonb_build_object('id', coordinator.id, 'name', coordinator.name, 'email', coordinator.email)
        ELSE NULL END as coordinator,
        -- Creator
        CASE WHEN creator.id IS NOT NULL THEN
          jsonb_build_object('id', creator.id, 'name', creator.name, 'email', creator.email)
        ELSE NULL END as creator,
        -- Task counts
        COALESCE(task_counts.task_count, 0)::int as task_count,
        COALESCE(task_counts.completed_task_count, 0)::int as completed_task_count
      FROM projects p
      LEFT JOIN public.users owner ON owner.id = p.owner_id
      LEFT JOIN public.users coordinator ON coordinator.id = p.coordinator_id
      LEFT JOIN public.users creator ON creator.id = p.created_by
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int as task_count,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed_task_count
        FROM tasks WHERE project_id = p.id
      ) task_counts ON true
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir} NULLS LAST
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    // Count query
    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*)::int as count FROM projects p ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as ProjectWithUsers[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

/**
 * Get a single project by ID
 */
export async function getProject(
  tenantSlug: string,
  projectId: string,
): Promise<ProjectWithUsers | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        p.*,
        CASE WHEN owner.id IS NOT NULL THEN
          jsonb_build_object('id', owner.id, 'name', owner.name, 'email', owner.email)
        ELSE NULL END as owner,
        CASE WHEN coordinator.id IS NOT NULL THEN
          jsonb_build_object('id', coordinator.id, 'name', coordinator.name, 'email', coordinator.email)
        ELSE NULL END as coordinator,
        CASE WHEN creator.id IS NOT NULL THEN
          jsonb_build_object('id', creator.id, 'name', creator.name, 'email', creator.email)
        ELSE NULL END as creator,
        COALESCE(task_counts.task_count, 0)::int as task_count,
        COALESCE(task_counts.completed_task_count, 0)::int as completed_task_count
      FROM projects p
      LEFT JOIN public.users owner ON owner.id = p.owner_id
      LEFT JOIN public.users coordinator ON coordinator.id = p.coordinator_id
      LEFT JOIN public.users creator ON creator.id = p.created_by
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int as task_count,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed_task_count
        FROM tasks WHERE project_id = p.id
      ) task_counts ON true
      WHERE p.id = ${projectId}
      LIMIT 1
    `

    return (result.rows[0] as ProjectWithUsers) || null
  })
}

/**
 * Create a new project
 */
export async function createProject(
  tenantSlug: string,
  userId: string,
  data: CreateProjectInput,
): Promise<Project> {
  return withTenant(tenantSlug, async () => {
    // Get the next pipeline order for the stage
    const orderResult = await sql`
      SELECT COALESCE(MAX(pipeline_order), -1) + 1 as next_order
      FROM projects
      WHERE pipeline_stage = ${data.pipeline_stage || 'backlog'}::project_pipeline_stage
    `
    const nextOrder = orderResult.rows[0]?.next_order || 0

    const result = await sql`
      INSERT INTO projects (
        title, description, owner_id, coordinator_id, start_date, due_date,
        project_type, tags, pipeline_stage, pipeline_order, external_id,
        external_type, settings, metadata, created_by
      ) VALUES (
        ${data.title},
        ${data.description || null},
        ${data.owner_id || null},
        ${data.coordinator_id || null},
        ${data.start_date || null}::date,
        ${data.due_date || null}::date,
        ${data.project_type || null}::project_type,
        ${data.tags || []}::text[],
        ${data.pipeline_stage || 'backlog'}::project_pipeline_stage,
        ${nextOrder},
        ${data.external_id || null},
        ${data.external_type || null},
        ${JSON.stringify(data.settings || {})}::jsonb,
        ${JSON.stringify(data.metadata || {})}::jsonb,
        ${userId}
      )
      RETURNING *
    `

    // Log the action
    await logProjectAction(tenantSlug, userId, 'project.created', result.rows[0].id as string, null, data)

    return result.rows[0] as Project
  })
}

/**
 * Update a project
 */
export async function updateProject(
  tenantSlug: string,
  userId: string,
  projectId: string,
  data: UpdateProjectInput,
): Promise<Project | null> {
  return withTenant(tenantSlug, async () => {
    // Get current project for audit log
    const currentResult = await sql`SELECT * FROM projects WHERE id = ${projectId}`
    if (currentResult.rows.length === 0) return null
    const currentProject = currentResult.rows[0] as Project

    const setClauses: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let paramIndex = 0

    if (data.title !== undefined) {
      paramIndex++
      setClauses.push(`title = $${paramIndex}`)
      values.push(data.title)
    }

    if (data.description !== undefined) {
      paramIndex++
      setClauses.push(`description = $${paramIndex}`)
      values.push(data.description)
    }

    if (data.status !== undefined) {
      paramIndex++
      setClauses.push(`status = $${paramIndex}::project_status`)
      values.push(data.status)

      if (data.status === 'completed') {
        setClauses.push(`completed_at = NOW()`)
      }
    }

    if (data.owner_id !== undefined) {
      paramIndex++
      setClauses.push(`owner_id = $${paramIndex}`)
      values.push(data.owner_id)
    }

    if (data.coordinator_id !== undefined) {
      paramIndex++
      setClauses.push(`coordinator_id = $${paramIndex}`)
      values.push(data.coordinator_id)
    }

    if (data.start_date !== undefined) {
      paramIndex++
      setClauses.push(`start_date = $${paramIndex}::date`)
      values.push(data.start_date)
    }

    if (data.due_date !== undefined) {
      paramIndex++
      setClauses.push(`due_date = $${paramIndex}::date`)
      values.push(data.due_date)
    }

    if (data.project_type !== undefined) {
      paramIndex++
      setClauses.push(`project_type = $${paramIndex}::project_type`)
      values.push(data.project_type)
    }

    if (data.tags !== undefined) {
      paramIndex++
      setClauses.push(`tags = $${paramIndex}::text[]`)
      values.push(data.tags)
    }

    if (data.pipeline_stage !== undefined) {
      paramIndex++
      setClauses.push(`pipeline_stage = $${paramIndex}::project_pipeline_stage`)
      values.push(data.pipeline_stage)
    }

    if (data.settings !== undefined) {
      paramIndex++
      setClauses.push(`settings = $${paramIndex}::jsonb`)
      values.push(JSON.stringify(data.settings))
    }

    if (data.metadata !== undefined) {
      paramIndex++
      setClauses.push(`metadata = $${paramIndex}::jsonb`)
      values.push(JSON.stringify(data.metadata))
    }

    paramIndex++
    values.push(projectId)

    const result = await sql.query(
      `UPDATE projects SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    )

    if (result.rows.length > 0) {
      await logProjectAction(tenantSlug, userId, 'project.updated', projectId, currentProject, data)
    }

    return (result.rows[0] as Project) || null
  })
}

/**
 * Archive a project
 */
export async function archiveProject(
  tenantSlug: string,
  userId: string,
  projectId: string,
): Promise<boolean> {
  const result = await updateProject(tenantSlug, userId, projectId, { status: 'archived' })
  return result !== null
}

/**
 * Delete a project
 */
export async function deleteProject(
  tenantSlug: string,
  userId: string,
  projectId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const currentResult = await sql`SELECT * FROM projects WHERE id = ${projectId}`
    if (currentResult.rows.length === 0) return false

    const result = await sql`DELETE FROM projects WHERE id = ${projectId} RETURNING id`

    if ((result.rowCount ?? 0) > 0) {
      await logProjectAction(tenantSlug, userId, 'project.deleted', projectId, currentResult.rows[0], null)
    }

    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Move project to a pipeline stage
 */
export async function moveProjectToStage(
  tenantSlug: string,
  userId: string,
  projectId: string,
  stage: ProjectPipelineStage,
  order?: number,
): Promise<Project | null> {
  return withTenant(tenantSlug, async () => {
    // If no order specified, add to end of stage
    let newOrder = order
    if (newOrder === undefined) {
      const orderResult = await sql`
        SELECT COALESCE(MAX(pipeline_order), -1) + 1 as next_order
        FROM projects
        WHERE pipeline_stage = ${stage}::project_pipeline_stage
      `
      newOrder = orderResult.rows[0]?.next_order || 0
    }

    const result = await sql`
      UPDATE projects
      SET pipeline_stage = ${stage}::project_pipeline_stage,
          pipeline_order = ${newOrder},
          updated_at = NOW()
      WHERE id = ${projectId}
      RETURNING *
    `

    if (result.rows.length > 0) {
      await logProjectAction(tenantSlug, userId, 'project.stage_changed', projectId, null, { stage, order: newOrder })
    }

    return (result.rows[0] as Project) || null
  })
}

/**
 * Get projects by pipeline stage
 */
export async function getProjectsByStage(
  tenantSlug: string,
  stage: ProjectPipelineStage,
): Promise<ProjectWithUsers[]> {
  const result = await getProjects(tenantSlug, {
    page: 1,
    limit: 100,
    offset: 0,
    pipeline_stage: stage,
    sort: 'pipeline_order',
    dir: 'asc',
  })
  return result.rows
}

/**
 * Get all projects for kanban board view
 */
export async function getProjectsForKanban(
  tenantSlug: string,
): Promise<Record<ProjectPipelineStage, ProjectWithUsers[]>> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        p.*,
        CASE WHEN owner.id IS NOT NULL THEN
          jsonb_build_object('id', owner.id, 'name', owner.name, 'email', owner.email)
        ELSE NULL END as owner,
        CASE WHEN coordinator.id IS NOT NULL THEN
          jsonb_build_object('id', coordinator.id, 'name', coordinator.name, 'email', coordinator.email)
        ELSE NULL END as coordinator,
        COALESCE(task_counts.task_count, 0)::int as task_count,
        COALESCE(task_counts.completed_task_count, 0)::int as completed_task_count
      FROM projects p
      LEFT JOIN public.users owner ON owner.id = p.owner_id
      LEFT JOIN public.users coordinator ON coordinator.id = p.coordinator_id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int as task_count,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed_task_count
        FROM tasks WHERE project_id = p.id
      ) task_counts ON true
      WHERE p.status != 'archived'
      ORDER BY p.pipeline_stage, p.pipeline_order ASC
    `

    const stages: Record<ProjectPipelineStage, ProjectWithUsers[]> = {
      backlog: [],
      planning: [],
      in_progress: [],
      review: [],
      done: [],
    }

    for (const row of result.rows as ProjectWithUsers[]) {
      if (stages[row.pipeline_stage]) {
        stages[row.pipeline_stage].push(row)
      }
    }

    return stages
  })
}

/**
 * Reorder projects within a stage
 */
export async function reorderProjectsInStage(
  tenantSlug: string,
  userId: string,
  stage: ProjectPipelineStage,
  projectIds: string[],
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    // Update each project's order
    for (let i = 0; i < projectIds.length; i++) {
      await sql`
        UPDATE projects
        SET pipeline_order = ${i}, updated_at = NOW()
        WHERE id = ${projectIds[i]}
          AND pipeline_stage = ${stage}::project_pipeline_stage
      `
    }

    await logProjectAction(tenantSlug, userId, 'projects.reordered', stage, null, { projectIds })
  })
}

/**
 * Get tasks for a project
 */
export async function getProjectTasks(
  tenantSlug: string,
  projectId: string,
): Promise<TaskWithUsers[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        t.*,
        CASE WHEN assignee.id IS NOT NULL THEN
          jsonb_build_object('id', assignee.id, 'name', assignee.name, 'email', assignee.email)
        ELSE NULL END as assignee,
        CASE WHEN creator.id IS NOT NULL THEN
          jsonb_build_object('id', creator.id, 'name', creator.name, 'email', creator.email)
        ELSE NULL END as creator,
        0::int as subtask_count
      FROM tasks t
      LEFT JOIN public.users assignee ON assignee.id = t.assigned_to
      LEFT JOIN public.users creator ON creator.id = t.created_by
      WHERE t.project_id = ${projectId}
      ORDER BY t.created_at ASC
    `
    return result.rows as TaskWithUsers[]
  })
}

/**
 * Add a task to a project
 */
export async function addTaskToProject(
  tenantSlug: string,
  userId: string,
  projectId: string,
  taskId: string,
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`
      UPDATE tasks
      SET project_id = ${projectId}, updated_at = NOW()
      WHERE id = ${taskId}
    `

    await logProjectAction(tenantSlug, userId, 'project.task_added', projectId, null, { taskId })
  })
}

/**
 * Remove a task from a project
 */
export async function removeTaskFromProject(
  tenantSlug: string,
  userId: string,
  taskId: string,
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE tasks
      SET project_id = NULL, updated_at = NOW()
      WHERE id = ${taskId}
      RETURNING project_id
    `

    if (result.rows.length > 0 && result.rows[0].project_id) {
      await logProjectAction(tenantSlug, userId, 'project.task_removed', result.rows[0].project_id as string, null, { taskId })
    }
  })
}

/**
 * Get project statistics
 */
export async function getProjectStats(tenantSlug: string): Promise<ProjectStats> {
  return withTenant(tenantSlug, async () => {
    // Get status counts
    const statusResult = await sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'draft')::int as draft,
        COUNT(*) FILTER (WHERE status = 'active')::int as active,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
        COUNT(*) FILTER (WHERE status = 'archived')::int as archived
      FROM projects
    `

    // Get stage counts
    const stageResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE pipeline_stage = 'backlog')::int as backlog,
        COUNT(*) FILTER (WHERE pipeline_stage = 'planning')::int as planning,
        COUNT(*) FILTER (WHERE pipeline_stage = 'in_progress')::int as in_progress,
        COUNT(*) FILTER (WHERE pipeline_stage = 'review')::int as review,
        COUNT(*) FILTER (WHERE pipeline_stage = 'done')::int as done
      FROM projects
      WHERE status != 'archived'
    `

    // Get average completion time
    const avgResult = await sql`
      SELECT ROUND(AVG(EXTRACT(DAY FROM (completed_at - created_at)))::numeric, 1) as avg_days
      FROM projects
      WHERE status = 'completed'
        AND completed_at IS NOT NULL
        AND completed_at >= NOW() - INTERVAL '90 days'
    `

    const statusRow = statusResult.rows[0] || {}
    const stageRow = stageResult.rows[0] || {}

    return {
      total: statusRow.total || 0,
      by_status: {
        draft: statusRow.draft || 0,
        active: statusRow.active || 0,
        completed: statusRow.completed || 0,
        archived: statusRow.archived || 0,
      },
      by_stage: {
        backlog: stageRow.backlog || 0,
        planning: stageRow.planning || 0,
        in_progress: stageRow.in_progress || 0,
        review: stageRow.review || 0,
        done: stageRow.done || 0,
      },
      avg_completion_days: avgResult.rows[0]?.avg_days || null,
    }
  })
}

/**
 * Log a project action for audit trail
 */
async function logProjectAction(
  tenantSlug: string,
  actorId: string,
  action: string,
  entityId: string,
  oldValue: unknown,
  newValue: unknown,
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      INSERT INTO productivity_audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
      VALUES (
        ${actorId},
        ${action},
        'project',
        ${entityId},
        ${oldValue ? JSON.stringify(oldValue) : null}::jsonb,
        ${newValue ? JSON.stringify(newValue) : null}::jsonb
      )
    `
  })
}
