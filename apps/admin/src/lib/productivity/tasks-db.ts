/**
 * PHASE-2H-PRODUCTIVITY: Task database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'

import type {
  Task,
  TaskWithUsers,
  TaskComment,
  TaskFilters,
  TaskStats,
  TaskStatus,
  TaskPriority,
  CreateTaskInput,
  UpdateTaskInput,
  AddCommentInput,
} from './types'

/**
 * Get tasks with filtering and pagination
 */
export async function getTasks(
  tenantSlug: string,
  filters: TaskFilters,
): Promise<{ rows: TaskWithUsers[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    // Search filter
    if (filters.search) {
      paramIndex++
      conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`)
      values.push(`%${filters.search}%`)
    }

    // Status filter
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
      paramIndex++
      conditions.push(`t.status = ANY($${paramIndex}::task_status[])`)
      values.push(statuses)
    } else if (!filters.include_completed) {
      // By default, hide completed and cancelled tasks
      conditions.push(`t.status NOT IN ('completed', 'cancelled')`)
    }

    // Priority filter
    if (filters.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
      paramIndex++
      conditions.push(`t.priority = ANY($${paramIndex}::task_priority[])`)
      values.push(priorities)
    }

    // Assignee filter
    if (filters.assigned_to) {
      paramIndex++
      conditions.push(`t.assigned_to = $${paramIndex}`)
      values.push(filters.assigned_to)
    }

    // Project filter
    if (filters.project_id) {
      paramIndex++
      conditions.push(`t.project_id = $${paramIndex}`)
      values.push(filters.project_id)
    }

    // Due date filters
    if (filters.due_before) {
      paramIndex++
      conditions.push(`t.due_date <= $${paramIndex}`)
      values.push(filters.due_before)
    }

    if (filters.due_after) {
      paramIndex++
      conditions.push(`t.due_date >= $${paramIndex}`)
      values.push(filters.due_after)
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      paramIndex++
      conditions.push(`t.tags && $${paramIndex}::text[]`)
      values.push(filters.tags)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Sort mapping
    const sortMap: Record<string, string> = {
      created_at: 't.created_at',
      due_date: 't.due_date',
      priority: 't.priority',
      status: 't.status',
      title: 't.title',
      updated_at: 't.updated_at',
    }
    const sortCol = sortMap[filters.sort] || 't.created_at'
    const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT
        t.*,
        -- Assignee
        CASE WHEN assignee.id IS NOT NULL THEN
          jsonb_build_object('id', assignee.id, 'name', assignee.name, 'email', assignee.email)
        ELSE NULL END as assignee,
        -- Assigner
        CASE WHEN assigner.id IS NOT NULL THEN
          jsonb_build_object('id', assigner.id, 'name', assigner.name, 'email', assigner.email)
        ELSE NULL END as assigner,
        -- Completer
        CASE WHEN completer.id IS NOT NULL THEN
          jsonb_build_object('id', completer.id, 'name', completer.name, 'email', completer.email)
        ELSE NULL END as completer,
        -- Creator
        CASE WHEN creator.id IS NOT NULL THEN
          jsonb_build_object('id', creator.id, 'name', creator.name, 'email', creator.email)
        ELSE NULL END as creator,
        -- Project
        CASE WHEN p.id IS NOT NULL THEN
          jsonb_build_object('id', p.id, 'title', p.title)
        ELSE NULL END as project,
        -- Parent task
        CASE WHEN parent.id IS NOT NULL THEN
          jsonb_build_object('id', parent.id, 'title', parent.title)
        ELSE NULL END as parent_task,
        -- Subtask count
        COALESCE(subtasks.count, 0)::int as subtask_count
      FROM tasks t
      LEFT JOIN public.users assignee ON assignee.id = t.assigned_to
      LEFT JOIN public.users assigner ON assigner.id = t.assigned_by
      LEFT JOIN public.users completer ON completer.id = t.completed_by
      LEFT JOIN public.users creator ON creator.id = t.created_by
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN tasks parent ON parent.id = t.parent_task_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as count FROM tasks WHERE parent_task_id = t.id
      ) subtasks ON true
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir} NULLS LAST
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    // Count query
    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*)::int as count FROM tasks t ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as TaskWithUsers[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

/**
 * Get a single task by ID
 */
export async function getTask(
  tenantSlug: string,
  taskId: string,
): Promise<TaskWithUsers | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        t.*,
        CASE WHEN assignee.id IS NOT NULL THEN
          jsonb_build_object('id', assignee.id, 'name', assignee.name, 'email', assignee.email)
        ELSE NULL END as assignee,
        CASE WHEN assigner.id IS NOT NULL THEN
          jsonb_build_object('id', assigner.id, 'name', assigner.name, 'email', assigner.email)
        ELSE NULL END as assigner,
        CASE WHEN completer.id IS NOT NULL THEN
          jsonb_build_object('id', completer.id, 'name', completer.name, 'email', completer.email)
        ELSE NULL END as completer,
        CASE WHEN creator.id IS NOT NULL THEN
          jsonb_build_object('id', creator.id, 'name', creator.name, 'email', creator.email)
        ELSE NULL END as creator,
        CASE WHEN p.id IS NOT NULL THEN
          jsonb_build_object('id', p.id, 'title', p.title)
        ELSE NULL END as project,
        CASE WHEN parent.id IS NOT NULL THEN
          jsonb_build_object('id', parent.id, 'title', parent.title)
        ELSE NULL END as parent_task,
        COALESCE(subtasks.count, 0)::int as subtask_count
      FROM tasks t
      LEFT JOIN public.users assignee ON assignee.id = t.assigned_to
      LEFT JOIN public.users assigner ON assigner.id = t.assigned_by
      LEFT JOIN public.users completer ON completer.id = t.completed_by
      LEFT JOIN public.users creator ON creator.id = t.created_by
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN tasks parent ON parent.id = t.parent_task_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as count FROM tasks WHERE parent_task_id = t.id
      ) subtasks ON true
      WHERE t.id = ${taskId}
      LIMIT 1
    `

    return (result.rows[0] as TaskWithUsers) || null
  })
}

/**
 * Create a new task
 */
export async function createTask(
  tenantSlug: string,
  userId: string,
  data: CreateTaskInput,
): Promise<Task> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO tasks (
        title, description, priority, assigned_to, assigned_by, assigned_at,
        due_date, tags, project_id, parent_task_id, source_type, source_ref,
        source_message, ai_extracted, ai_confidence, metadata, created_by
      ) VALUES (
        ${data.title},
        ${data.description || null},
        ${data.priority || 'medium'}::task_priority,
        ${data.assigned_to || null},
        ${data.assigned_to ? userId : null},
        ${data.assigned_to ? sql`NOW()` : null},
        ${data.due_date || null}::timestamptz,
        ${data.tags || []}::text[],
        ${data.project_id || null},
        ${data.parent_task_id || null},
        ${data.source_type || 'manual'}::task_source_type,
        ${data.source_ref || null},
        ${data.source_message || null},
        ${data.ai_extracted || false},
        ${data.ai_confidence || null},
        ${JSON.stringify(data.metadata || {})}::jsonb,
        ${userId}
      )
      RETURNING *
    `

    // Log the action
    await logProductivityAction(tenantSlug, userId, 'task.created', 'task', result.rows[0].id as string, null, data)

    return result.rows[0] as Task
  })
}

/**
 * Update a task
 */
export async function updateTask(
  tenantSlug: string,
  userId: string,
  taskId: string,
  data: UpdateTaskInput,
): Promise<Task | null> {
  return withTenant(tenantSlug, async () => {
    // Get current task for audit log
    const currentResult = await sql`SELECT * FROM tasks WHERE id = ${taskId}`
    if (currentResult.rows.length === 0) return null
    const currentTask = currentResult.rows[0] as Task

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
      setClauses.push(`status = $${paramIndex}::task_status`)
      values.push(data.status)

      if (data.status === 'completed') {
        setClauses.push(`completed_at = NOW()`)
        paramIndex++
        setClauses.push(`completed_by = $${paramIndex}`)
        values.push(userId)
        setClauses.push(`completed_via = 'manual'`)
      }
    }

    if (data.priority !== undefined) {
      paramIndex++
      setClauses.push(`priority = $${paramIndex}::task_priority`)
      values.push(data.priority)
    }

    if (data.assigned_to !== undefined) {
      paramIndex++
      setClauses.push(`assigned_to = $${paramIndex}`)
      values.push(data.assigned_to)

      if (data.assigned_to) {
        paramIndex++
        setClauses.push(`assigned_by = $${paramIndex}`)
        values.push(userId)
        setClauses.push(`assigned_at = NOW()`)
      } else {
        setClauses.push(`assigned_by = NULL`)
        setClauses.push(`assigned_at = NULL`)
      }
    }

    if (data.due_date !== undefined) {
      paramIndex++
      setClauses.push(`due_date = $${paramIndex}::timestamptz`)
      values.push(data.due_date)
    }

    if (data.tags !== undefined) {
      paramIndex++
      setClauses.push(`tags = $${paramIndex}::text[]`)
      values.push(data.tags)
    }

    if (data.project_id !== undefined) {
      paramIndex++
      setClauses.push(`project_id = $${paramIndex}`)
      values.push(data.project_id)
    }

    if (data.metadata !== undefined) {
      paramIndex++
      setClauses.push(`metadata = $${paramIndex}::jsonb`)
      values.push(JSON.stringify(data.metadata))
    }

    paramIndex++
    values.push(taskId)

    const result = await sql.query(
      `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    )

    if (result.rows.length > 0) {
      // Log the action
      await logProductivityAction(tenantSlug, userId, 'task.updated', 'task', taskId, currentTask, data)
    }

    return (result.rows[0] as Task) || null
  })
}

/**
 * Delete a task
 */
export async function deleteTask(
  tenantSlug: string,
  userId: string,
  taskId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    // Get current task for audit log
    const currentResult = await sql`SELECT * FROM tasks WHERE id = ${taskId}`
    if (currentResult.rows.length === 0) return false

    const result = await sql`DELETE FROM tasks WHERE id = ${taskId} RETURNING id`

    if ((result.rowCount ?? 0) > 0) {
      await logProductivityAction(tenantSlug, userId, 'task.deleted', 'task', taskId, currentResult.rows[0], null)
    }

    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Assign a task to a user
 */
export async function assignTask(
  tenantSlug: string,
  taskId: string,
  assigneeId: string | null,
  assignerId: string,
): Promise<Task | null> {
  return updateTask(tenantSlug, assignerId, taskId, { assigned_to: assigneeId })
}

/**
 * Complete a task
 */
export async function completeTask(
  tenantSlug: string,
  taskId: string,
  completedBy: string,
): Promise<Task | null> {
  return updateTask(tenantSlug, completedBy, taskId, { status: 'completed' })
}

/**
 * Change task status
 */
export async function changeTaskStatus(
  tenantSlug: string,
  taskId: string,
  status: TaskStatus,
  userId: string,
): Promise<Task | null> {
  return updateTask(tenantSlug, userId, taskId, { status })
}

/**
 * Get tasks by assignee
 */
export async function getTasksByAssignee(
  tenantSlug: string,
  userId: string,
): Promise<TaskWithUsers[]> {
  const result = await getTasks(tenantSlug, {
    page: 1,
    limit: 100,
    offset: 0,
    assigned_to: userId,
    include_completed: false,
    sort: 'due_date',
    dir: 'asc',
  })
  return result.rows
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(
  tenantSlug: string,
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
        CASE WHEN p.id IS NOT NULL THEN
          jsonb_build_object('id', p.id, 'title', p.title)
        ELSE NULL END as project,
        0::int as subtask_count
      FROM tasks t
      LEFT JOIN public.users assignee ON assignee.id = t.assigned_to
      LEFT JOIN public.users creator ON creator.id = t.created_by
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.due_date < NOW()
        AND t.status NOT IN ('completed', 'cancelled')
      ORDER BY t.due_date ASC
      LIMIT 100
    `
    return result.rows as TaskWithUsers[]
  })
}

/**
 * Get task statistics
 */
export async function getTaskStats(tenantSlug: string): Promise<TaskStats> {
  return withTenant(tenantSlug, async () => {
    // Get status counts
    const statusResult = await sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int as cancelled,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled'))::int as overdue,
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '7 days')::int as completed_this_week
      FROM tasks
    `

    // Get average completion time
    const avgResult = await sql`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)::numeric, 1) as avg_hours
      FROM tasks
      WHERE status = 'completed'
        AND completed_at IS NOT NULL
        AND completed_at >= NOW() - INTERVAL '30 days'
    `

    // Get priority counts
    const priorityResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE priority = 'urgent')::int as urgent,
        COUNT(*) FILTER (WHERE priority = 'high')::int as high,
        COUNT(*) FILTER (WHERE priority = 'medium')::int as medium,
        COUNT(*) FILTER (WHERE priority = 'low')::int as low
      FROM tasks
      WHERE status NOT IN ('completed', 'cancelled')
    `

    // Get by assignee
    const assigneeResult = await sql`
      SELECT
        t.assigned_to as user_id,
        u.name,
        u.email,
        COUNT(*)::int as count,
        COUNT(*) FILTER (WHERE t.status = 'completed')::int as completed
      FROM tasks t
      JOIN public.users u ON u.id = t.assigned_to
      WHERE t.assigned_to IS NOT NULL
      GROUP BY t.assigned_to, u.name, u.email
      ORDER BY count DESC
      LIMIT 10
    `

    const statusRow = statusResult.rows[0] || {}
    const priorityRow = priorityResult.rows[0] || {}

    return {
      total: statusRow.total || 0,
      pending: statusRow.pending || 0,
      in_progress: statusRow.in_progress || 0,
      completed: statusRow.completed || 0,
      cancelled: statusRow.cancelled || 0,
      overdue: statusRow.overdue || 0,
      completed_this_week: statusRow.completed_this_week || 0,
      avg_completion_hours: avgResult.rows[0]?.avg_hours || null,
      by_priority: {
        urgent: priorityRow.urgent || 0,
        high: priorityRow.high || 0,
        medium: priorityRow.medium || 0,
        low: priorityRow.low || 0,
      },
      by_assignee: assigneeResult.rows.map((r) => ({
        user_id: r.user_id as string,
        name: r.name as string | null,
        email: r.email as string,
        count: r.count as number,
        completed: r.completed as number,
      })),
    }
  })
}

/**
 * Add a comment to a task
 */
export async function addTaskComment(
  tenantSlug: string,
  taskId: string,
  userId: string,
  data: AddCommentInput,
): Promise<TaskComment> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO task_comments (task_id, author_id, content, comment_type, old_value, new_value)
      VALUES (
        ${taskId},
        ${userId},
        ${data.content},
        ${data.comment_type || 'comment'}::task_comment_type,
        ${data.old_value || null},
        ${data.new_value || null}
      )
      RETURNING *
    `
    return result.rows[0] as TaskComment
  })
}

/**
 * Get comments for a task
 */
export async function getTaskComments(
  tenantSlug: string,
  taskId: string,
): Promise<TaskComment[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        tc.*,
        jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email) as author
      FROM task_comments tc
      JOIN public.users u ON u.id = tc.author_id
      WHERE tc.task_id = ${taskId}
      ORDER BY tc.created_at ASC
    `
    return result.rows as TaskComment[]
  })
}

/**
 * Log a productivity action for audit trail
 */
async function logProductivityAction(
  tenantSlug: string,
  actorId: string,
  action: string,
  entityType: string,
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
        ${entityType},
        ${entityId},
        ${oldValue ? JSON.stringify(oldValue) : null}::jsonb,
        ${newValue ? JSON.stringify(newValue) : null}::jsonb
      )
    `
  })
}
