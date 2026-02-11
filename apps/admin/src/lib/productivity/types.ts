/**
 * PHASE-2H-PRODUCTIVITY: Productivity & Task Management types
 */

// Task status
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

// Task priority
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

// Task source type
export type TaskSourceType = 'manual' | 'slack' | 'email' | 'workflow' | 'ai_extracted'

// Project status
export type ProjectStatus = 'draft' | 'active' | 'completed' | 'archived'

// Project pipeline stage
export type ProjectPipelineStage = 'backlog' | 'planning' | 'in_progress' | 'review' | 'done'

// Project type
export type ProjectType = 'internal' | 'client' | 'creator' | 'campaign'

// Saved item type
export type SavedItemType = 'task' | 'project' | 'message' | 'file' | 'link'

// Comment type
export type TaskCommentType = 'comment' | 'status_change' | 'assignment' | 'system'

// User reference (for display)
export interface UserReference {
  id: string
  name: string | null
  email: string
  avatar_url?: string | null
}

// Task interface
export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority

  assigned_to: string | null
  assigned_by: string | null
  assigned_at: string | null

  due_date: string | null
  completed_at: string | null
  completed_by: string | null
  completed_via: string | null

  tags: string[]
  project_id: string | null
  parent_task_id: string | null

  source_type: TaskSourceType
  source_ref: string | null
  source_message: string | null

  ai_extracted: boolean
  ai_confidence: number | null

  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

// Task with user references populated
export interface TaskWithUsers extends Task {
  assignee: UserReference | null
  assigner: UserReference | null
  completer: UserReference | null
  creator: UserReference | null
  project: {
    id: string
    title: string
  } | null
  parent_task: {
    id: string
    title: string
  } | null
  subtask_count: number
}

// Project interface
export interface Project {
  id: string
  title: string
  description: string | null
  status: ProjectStatus

  owner_id: string | null
  coordinator_id: string | null

  start_date: string | null
  due_date: string | null
  completed_at: string | null

  project_type: ProjectType | null
  tags: string[]

  pipeline_stage: ProjectPipelineStage
  pipeline_order: number

  external_id: string | null
  external_type: string | null

  settings: Record<string, unknown>
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

// Project with user references populated
export interface ProjectWithUsers extends Project {
  owner: UserReference | null
  coordinator: UserReference | null
  creator: UserReference | null
  task_count: number
  completed_task_count: number
}

// Saved item interface
export interface SavedItem {
  id: string
  user_id: string
  item_type: SavedItemType
  item_id: string | null
  item_url: string | null
  title: string
  description: string | null
  thumbnail_url: string | null
  folder: string
  tags: string[]
  metadata: Record<string, unknown>
  created_at: string
}

// Task comment interface
export interface TaskComment {
  id: string
  task_id: string
  author_id: string
  content: string
  comment_type: TaskCommentType
  old_value: string | null
  new_value: string | null
  created_at: string
  author?: UserReference
}

// Productivity audit log entry
export interface ProductivityAuditEntry {
  id: string
  actor_id: string
  action: string
  entity_type: string
  entity_id: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  actor?: UserReference
}

// Task filters for querying
export interface TaskFilters {
  page: number
  limit: number
  offset: number
  search?: string
  status?: TaskStatus | TaskStatus[]
  priority?: TaskPriority | TaskPriority[]
  assigned_to?: string
  project_id?: string
  due_before?: string
  due_after?: string
  tags?: string[]
  include_completed?: boolean
  sort: 'created_at' | 'due_date' | 'priority' | 'status' | 'title' | 'updated_at'
  dir: 'asc' | 'desc'
}

// Project filters for querying
export interface ProjectFilters {
  page: number
  limit: number
  offset: number
  search?: string
  status?: ProjectStatus | ProjectStatus[]
  pipeline_stage?: ProjectPipelineStage | ProjectPipelineStage[]
  owner_id?: string
  project_type?: ProjectType
  due_before?: string
  due_after?: string
  tags?: string[]
  sort: 'created_at' | 'due_date' | 'pipeline_order' | 'title' | 'updated_at'
  dir: 'asc' | 'desc'
}

// Saved item filters
export interface SavedItemFilters {
  folder?: string
  item_type?: SavedItemType
  tags?: string[]
}

// Task statistics
export interface TaskStats {
  total: number
  pending: number
  in_progress: number
  completed: number
  cancelled: number
  overdue: number
  completed_this_week: number
  avg_completion_hours: number | null
  by_priority: {
    urgent: number
    high: number
    medium: number
    low: number
  }
  by_assignee: Array<{
    user_id: string
    name: string | null
    email: string
    count: number
    completed: number
  }>
}

// Project statistics
export interface ProjectStats {
  total: number
  by_status: {
    draft: number
    active: number
    completed: number
    archived: number
  }
  by_stage: {
    backlog: number
    planning: number
    in_progress: number
    review: number
    done: number
  }
  avg_completion_days: number | null
}

// Saved item statistics
export interface SavedItemStats {
  total: number
  by_type: Record<SavedItemType, number>
  by_folder: Record<string, number>
}

// Input types for creating/updating
export interface CreateTaskInput {
  title: string
  description?: string
  priority?: TaskPriority
  assigned_to?: string
  due_date?: string
  tags?: string[]
  project_id?: string
  parent_task_id?: string
  source_type?: TaskSourceType
  source_ref?: string
  source_message?: string
  ai_extracted?: boolean
  ai_confidence?: number
  metadata?: Record<string, unknown>
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: string | null
  due_date?: string | null
  tags?: string[]
  project_id?: string | null
  metadata?: Record<string, unknown>
}

export interface CreateProjectInput {
  title: string
  description?: string
  owner_id?: string
  coordinator_id?: string
  start_date?: string
  due_date?: string
  project_type?: ProjectType
  tags?: string[]
  pipeline_stage?: ProjectPipelineStage
  external_id?: string
  external_type?: string
  settings?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface UpdateProjectInput {
  title?: string
  description?: string
  status?: ProjectStatus
  owner_id?: string | null
  coordinator_id?: string | null
  start_date?: string | null
  due_date?: string | null
  project_type?: ProjectType | null
  tags?: string[]
  pipeline_stage?: ProjectPipelineStage
  settings?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface SaveItemInput {
  item_type: SavedItemType
  item_id?: string
  item_url?: string
  title: string
  description?: string
  thumbnail_url?: string
  folder?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface AddCommentInput {
  content: string
  comment_type?: TaskCommentType
  old_value?: string
  new_value?: string
}

// Constants
export const TASK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled']

export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

export const PROJECT_STATUSES: ProjectStatus[] = ['draft', 'active', 'completed', 'archived']

export const PIPELINE_STAGES: ProjectPipelineStage[] = ['backlog', 'planning', 'in_progress', 'review', 'done']

export const PROJECT_TYPES: ProjectType[] = ['internal', 'client', 'creator', 'campaign']

export const SAVED_ITEM_TYPES: SavedItemType[] = ['task', 'project', 'message', 'file', 'link']

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  high: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  medium: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  low: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  in_progress: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  completed: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  cancelled: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30',
}

export const STAGE_COLORS: Record<ProjectPipelineStage, string> = {
  backlog: 'border-gray-400',
  planning: 'border-blue-400',
  in_progress: 'border-yellow-400',
  review: 'border-purple-400',
  done: 'border-green-400',
}

export const STAGE_LABELS: Record<ProjectPipelineStage, string> = {
  backlog: 'Backlog',
  planning: 'Planning',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}
