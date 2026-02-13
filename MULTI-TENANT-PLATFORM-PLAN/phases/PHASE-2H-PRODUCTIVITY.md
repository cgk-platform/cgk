# PHASE-2H: Productivity & Task Management

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: COMPLETE
**Completed**: 2026-02-10

**Duration**: 1.5 weeks (Week 11-12)
**Depends On**: PHASE-2A (Admin Shell), PHASE-2E (Team Management)
**Parallel With**: PHASE-2H-WORKFLOWS (builds upon same foundation)
**Blocks**: PHASE-2H-WORKFLOWS (needs task infrastructure)

---

## MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

All productivity features are tenant-scoped. Tasks, projects, and saved items from Tenant A must NEVER be visible to Tenant B.

---

## Goal

Build a comprehensive productivity system for tenant admins and team members, including task management, project tracking, productivity reports, saved items/bookmarks, and employee assignment. This enables teams to coordinate work, track deliverables, and measure productivity within their tenant.

---

## Context: RAWDOG Reference Implementation

The RAWDOG platform has extensive productivity features:

**Source files to reference:**
```
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/productivity/
/Users/holdenthemic/Documents/rawdog-web/src/app/admin/projects/
/Users/holdenthemic/Documents/rawdog-web/src/lib/creator-portal/projects.ts
/Users/holdenthemic/Documents/rawdog-web/src/lib/slack/db/schema.ts (admin_tasks table)
```

Key patterns:
- Tasks originate from manual creation, Slack extraction, or workflow automation
- Projects follow a Kanban pipeline with status transitions
- Tasks have priorities (urgent/high/medium/low) and due dates
- AI extraction for task generation from messages
- Saved items for bookmarking important content

---

## Success Criteria

- [ ] Team members can create, assign, and track tasks
- [ ] Tasks support priorities, due dates, tags, and status transitions
- [ ] Projects with milestones and task hierarchies
- [ ] Productivity dashboard with KPIs and reports
- [ ] Saved items (bookmarks) for starred content
- [ ] Assignment system for distributing work to team members
- [ ] Task search and filtering by status, priority, assignee
- [ ] All task actions logged in audit trail

---

## Deliverables

### Database Schema (in tenant schema)

```sql
-- Tasks table (tenant-scoped)
CREATE TABLE {tenant_schema}.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed, cancelled
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent

  -- Assignment
  assigned_to UUID REFERENCES public.users(id),
  assigned_by UUID REFERENCES public.users(id),
  assigned_at TIMESTAMPTZ,

  -- Timeline
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.users(id),
  completed_via TEXT, -- manual, workflow, auto

  -- Organization
  tags TEXT[] DEFAULT '{}',
  project_id UUID REFERENCES {tenant_schema}.projects(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES {tenant_schema}.tasks(id) ON DELETE SET NULL,

  -- Source tracking (for AI extraction, Slack, etc.)
  source_type TEXT, -- manual, slack, email, workflow, ai_extracted
  source_ref TEXT,  -- External reference ID
  source_message TEXT, -- Original message content

  -- AI metadata
  ai_extracted BOOLEAN DEFAULT FALSE,
  ai_confidence DECIMAL(3,2),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_status ON {tenant_schema}.tasks(status);
CREATE INDEX idx_tasks_assignee ON {tenant_schema}.tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON {tenant_schema}.tasks(due_date);
CREATE INDEX idx_tasks_priority ON {tenant_schema}.tasks(priority);
CREATE INDEX idx_tasks_project ON {tenant_schema}.tasks(project_id);

-- Projects table (tenant-scoped)
CREATE TABLE {tenant_schema}.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, completed, archived

  -- Assignment & ownership
  owner_id UUID REFERENCES public.users(id),
  coordinator_id UUID REFERENCES public.users(id),

  -- Timeline
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,

  -- Project type & categorization
  project_type TEXT, -- internal, client, creator, campaign
  tags TEXT[] DEFAULT '{}',

  -- Kanban position
  pipeline_stage TEXT DEFAULT 'backlog', -- backlog, planning, in_progress, review, done
  pipeline_order INTEGER DEFAULT 0,

  -- External references
  external_id TEXT, -- Shopify order ID, creator ID, etc.
  external_type TEXT, -- order, creator, campaign

  -- Metadata
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON {tenant_schema}.projects(status);
CREATE INDEX idx_projects_owner ON {tenant_schema}.projects(owner_id);
CREATE INDEX idx_projects_stage ON {tenant_schema}.projects(pipeline_stage, pipeline_order);

-- Saved items / bookmarks (tenant-scoped)
CREATE TABLE {tenant_schema}.saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),

  -- What's saved
  item_type TEXT NOT NULL, -- task, project, message, file, link
  item_id UUID, -- Reference ID if applicable
  item_url TEXT, -- URL if external link

  -- Display
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,

  -- Organization
  folder TEXT DEFAULT 'starred', -- starred, pinned, archive, custom folder
  tags TEXT[] DEFAULT '{}',

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_items_user ON {tenant_schema}.saved_items(user_id);
CREATE INDEX idx_saved_items_folder ON {tenant_schema}.saved_items(user_id, folder);
CREATE INDEX idx_saved_items_type ON {tenant_schema}.saved_items(item_type);

-- Task comments / activity log
CREATE TABLE {tenant_schema}.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES {tenant_schema}.tasks(id) ON DELETE CASCADE,

  author_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT NOT NULL,

  -- Activity type
  comment_type TEXT DEFAULT 'comment', -- comment, status_change, assignment, system

  -- For status changes
  old_value TEXT,
  new_value TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task ON {tenant_schema}.task_comments(task_id);

-- Productivity audit log
CREATE TABLE {tenant_schema}.productivity_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_id UUID NOT NULL REFERENCES public.users(id),
  action TEXT NOT NULL, -- task.created, task.completed, project.created, etc.

  entity_type TEXT NOT NULL, -- task, project, saved_item
  entity_id UUID NOT NULL,

  old_value JSONB,
  new_value JSONB,

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_productivity_audit_actor ON {tenant_schema}.productivity_audit_log(actor_id);
CREATE INDEX idx_productivity_audit_time ON {tenant_schema}.productivity_audit_log(created_at DESC);
```

### Task Service (`packages/admin-core/src/lib/productivity/tasks.ts`)

```typescript
// Task CRUD
export async function createTask(tenantId: string, data: CreateTaskInput): Promise<Task>
export async function getTasks(tenantId: string, filters: TaskFilters): Promise<PaginatedResult<Task>>
export async function getTask(tenantId: string, taskId: string): Promise<Task | null>
export async function updateTask(tenantId: string, taskId: string, data: UpdateTaskInput): Promise<Task>
export async function deleteTask(tenantId: string, taskId: string): Promise<void>

// Task actions
export async function assignTask(tenantId: string, taskId: string, userId: string, assignedBy: string): Promise<Task>
export async function completeTask(tenantId: string, taskId: string, completedBy: string): Promise<Task>
export async function changeTaskStatus(tenantId: string, taskId: string, status: TaskStatus): Promise<Task>

// Task queries
export async function getTasksByAssignee(tenantId: string, userId: string): Promise<Task[]>
export async function getOverdueTasks(tenantId: string): Promise<Task[]>
export async function getTaskStats(tenantId: string): Promise<TaskStats>

// Task comments
export async function addTaskComment(tenantId: string, taskId: string, data: CommentInput): Promise<TaskComment>
export async function getTaskComments(tenantId: string, taskId: string): Promise<TaskComment[]>
```

### Project Service (`packages/admin-core/src/lib/productivity/projects.ts`)

```typescript
// Project CRUD
export async function createProject(tenantId: string, data: CreateProjectInput): Promise<Project>
export async function getProjects(tenantId: string, filters: ProjectFilters): Promise<PaginatedResult<Project>>
export async function getProject(tenantId: string, projectId: string): Promise<Project | null>
export async function updateProject(tenantId: string, projectId: string, data: UpdateProjectInput): Promise<Project>
export async function archiveProject(tenantId: string, projectId: string): Promise<void>

// Pipeline operations
export async function moveProjectToStage(tenantId: string, projectId: string, stage: PipelineStage, order?: number): Promise<Project>
export async function getProjectsByStage(tenantId: string, stage: PipelineStage): Promise<Project[]>
export async function reorderProjectsInStage(tenantId: string, stage: PipelineStage, projectIds: string[]): Promise<void>

// Project tasks
export async function getProjectTasks(tenantId: string, projectId: string): Promise<Task[]>
export async function addTaskToProject(tenantId: string, projectId: string, taskId: string): Promise<void>
```

### Saved Items Service (`packages/admin-core/src/lib/productivity/saved-items.ts`)

```typescript
export async function saveItem(tenantId: string, userId: string, data: SaveItemInput): Promise<SavedItem>
export async function getSavedItems(tenantId: string, userId: string, folder?: string): Promise<SavedItem[]>
export async function removeSavedItem(tenantId: string, itemId: string): Promise<void>
export async function moveSavedItem(tenantId: string, itemId: string, folder: string): Promise<SavedItem>
export async function getSavedItemStats(tenantId: string, userId: string): Promise<SavedItemStats>
```

### UI Components

- `TaskList` - Paginated/filterable task table
- `TaskCard` - Individual task display with quick actions
- `TaskDetail` - Full task view with comments and activity
- `TaskCreateModal` - Create/edit task form
- `ProjectKanban` - Drag-and-drop project pipeline
- `ProjectCard` - Project summary card
- `ProjectDetail` - Project view with tasks and milestones
- `SavedItemsGrid` - Bookmarked items with folder organization
- `ProductivityDashboard` - KPIs, charts, task distribution
- `AssigneeSelector` - Team member picker for assignments
- `PriorityBadge` - Visual priority indicator
- `DueDatePicker` - Date picker with relative options

### Admin Pages

```
/admin/productivity                  # Dashboard with KPIs
/admin/productivity/tasks            # Task list
/admin/productivity/tasks/[id]       # Task detail
/admin/productivity/projects         # Project list (table view)
/admin/productivity/projects/board   # Kanban board view
/admin/productivity/projects/[id]    # Project detail
/admin/productivity/saved            # Saved items
/admin/productivity/reports          # Productivity reports
```

---

## Constraints

- Tasks require at least a title (all other fields optional)
- Priority levels: `urgent` (red), `high` (orange), `medium` (default), `low` (gray)
- Due dates in the past should show "overdue" indicator
- Completed tasks are soft-hidden from main views but searchable
- Project pipeline changes must be atomic (optimistic updates in UI)
- Saved items are user-specific, not shared across team
- Max 500 tasks per project (soft limit with warning)

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For dashboard, kanban, and task views
- Context7 MCP: "dnd-kit kanban board patterns"
- Context7 MCP: "React Query optimistic updates"

**RAWDOG code to reference:**
- `src/app/admin/productivity/` - Dashboard and task pages
- `src/app/admin/projects/` - Project management pages
- `src/app/admin/creator-pipeline/page.tsx` - Kanban board pattern
- `src/lib/creator-portal/projects.ts` - Project data model
- `src/lib/slack/db/schema.ts` - Task schema pattern

**Spec documents:**
- `PHASE-2E-TEAM-MANAGEMENT.md` - Team member patterns (for assignment)
- `PHASE-2D-ADMIN-FINANCE.md` - Kanban patterns

---

## Interfaces

### Task

```typescript
interface Task {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'

  assignedTo: {
    id: string
    name: string
    avatarUrl: string | null
  } | null
  assignedBy: {
    id: string
    name: string
  } | null
  assignedAt: Date | null

  dueDate: Date | null
  completedAt: Date | null
  completedBy: {
    id: string
    name: string
  } | null

  tags: string[]
  project: {
    id: string
    title: string
  } | null
  parentTask: {
    id: string
    title: string
  } | null
  subtasks: Task[]

  sourceType: 'manual' | 'slack' | 'email' | 'workflow' | 'ai_extracted' | null
  aiExtracted: boolean
  aiConfidence: number | null

  createdBy: {
    id: string
    name: string
  }
  createdAt: Date
  updatedAt: Date
}
```

### Project

```typescript
interface Project {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'active' | 'completed' | 'archived'

  owner: {
    id: string
    name: string
    avatarUrl: string | null
  } | null
  coordinator: {
    id: string
    name: string
    avatarUrl: string | null
  } | null

  startDate: Date | null
  dueDate: Date | null
  completedAt: Date | null

  projectType: 'internal' | 'client' | 'creator' | 'campaign' | null
  tags: string[]

  pipelineStage: 'backlog' | 'planning' | 'in_progress' | 'review' | 'done'
  pipelineOrder: number

  taskCount: number
  completedTaskCount: number

  createdBy: {
    id: string
    name: string
  }
  createdAt: Date
  updatedAt: Date
}
```

### TaskStats

```typescript
interface TaskStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
  overdue: number
  completedThisWeek: number
  avgCompletionHours: number
  byPriority: {
    urgent: number
    high: number
    medium: number
    low: number
  }
  byAssignee: Array<{
    userId: string
    name: string
    count: number
    completed: number
  }>
}
```

---

## API Routes

```
/api/admin/productivity/
  tasks/
    route.ts                         # GET list, POST create
    stats/route.ts                   # GET task statistics
    [id]/route.ts                    # GET, PATCH, DELETE task
    [id]/comments/route.ts           # GET, POST comments
    [id]/assign/route.ts             # POST assign task
    [id]/complete/route.ts           # POST complete task

  projects/
    route.ts                         # GET list, POST create
    board/route.ts                   # GET kanban board data
    [id]/route.ts                    # GET, PATCH, DELETE project
    [id]/tasks/route.ts              # GET project tasks, POST add task
    [id]/reorder/route.ts            # POST reorder in pipeline

  saved/
    route.ts                         # GET list, POST save item
    [id]/route.ts                    # DELETE, PATCH (move folder)
    stats/route.ts                   # GET saved item stats

  reports/
    route.ts                         # GET list reports
    [id]/route.ts                    # GET report details
    [id]/run/route.ts                # POST execute report
```

---

## Frontend Design Prompts

### Productivity Dashboard

```
/frontend-design

Building Productivity Dashboard for tenant admin (PHASE-2H-PRODUCTIVITY).

Requirements:
- KPI cards at top: Total tasks, Completed this week, Overdue, Avg completion time
- Task distribution chart by status (pie or donut)
- Task distribution by assignee (horizontal bar)
- Priority breakdown (stacked bar)
- Recent activity feed (last 10 task updates)
- Quick actions: Create task, View all tasks, View projects

Layout:
- 4-column KPI row at top
- 2-column layout below: Charts on left (60%), Activity feed on right (40%)
- Responsive: Stack on mobile

Design:
- Clean, data-focused dashboard
- Use brand accent color for primary metrics
- Subtle animations on chart load
- Empty states for new tenants with call-to-action
```

### Task List

```
/frontend-design

Building Task List page for tenant admin (PHASE-2H-PRODUCTIVITY).

Requirements:
- Filterable/searchable table of all tasks
- Filters: Status, Priority, Assignee, Due date range, Tags
- Columns: Title, Status, Priority, Assignee (avatar + name), Due date, Actions
- Bulk actions: Select multiple -> Complete, Reassign, Delete
- "Create Task" button in header
- Toggle between table view and card/grid view

Interactions:
- Click row to open task detail in side panel
- Inline status change (dropdown in cell)
- Quick complete checkbox
- Drag to reorder (optional)

Design:
- Priority shown as colored dot/badge
- Overdue tasks highlighted with red background tint
- Completed tasks shown with strikethrough and muted colors
- Assignee shown as avatar with name on hover
```

### Project Kanban

```
/frontend-design

Building Project Kanban Board for tenant admin (PHASE-2H-PRODUCTIVITY).

Requirements:
- 5-column Kanban: Backlog, Planning, In Progress, Review, Done
- Project cards in each column, drag between columns
- Card shows: Title, Owner avatar, Due date, Task progress (3/5 tasks)
- Column headers with count
- "Add Project" button in Backlog column
- Filter by owner, type, date

Interactions:
- Drag-and-drop between columns (dnd-kit)
- Click card to open project detail in modal/drawer
- Inline quick actions on card hover

Design:
- Clean column layout with subtle borders
- Card with shadow on drag
- Progress bar showing task completion
- Due date in red if overdue
- Smooth transition animations
```

---

## AI Discretion Areas

The implementing agent should determine the best approach for:

1. **Task source integrations**: Whether to build Slack/email extraction in this phase or defer
2. **Subtask depth**: How many levels of subtasks to support
3. **Report types**: Which pre-built productivity reports to include
4. **Saved items organization**: Folder structure vs flat with tags
5. **Notification triggers**: When to notify on task changes

---

## Tasks

### [PARALLEL] Database & Schema
- [ ] Create `tasks` table with indexes
- [ ] Create `projects` table with indexes
- [ ] Create `saved_items` table with indexes
- [ ] Create `task_comments` table
- [ ] Create `productivity_audit_log` table
- [ ] Add schema migration scripts

### [PARALLEL] Service Layer
- [ ] Implement task CRUD operations
- [ ] Implement task assignment logic
- [ ] Implement project CRUD operations
- [ ] Implement pipeline stage transitions
- [ ] Implement saved items operations
- [ ] Implement task statistics calculations
- [ ] Add audit logging to all operations

### [SEQUENTIAL after Service Layer] API Routes
- [ ] Create task CRUD routes
- [ ] Create task action routes (assign, complete)
- [ ] Create project CRUD routes
- [ ] Create kanban board route
- [ ] Create saved items routes
- [ ] Create reports routes
- [ ] Add cache-busting headers to all routes

### [SEQUENTIAL after API Routes] UI Components
- [ ] Invoke `/frontend-design` for ProductivityDashboard
- [ ] Invoke `/frontend-design` for TaskList
- [ ] Invoke `/frontend-design` for ProjectKanban
- [ ] Build TaskList component with filters
- [ ] Build TaskCard component
- [ ] Build TaskDetail component
- [ ] Build TaskCreateModal component
- [ ] Build ProjectKanban with dnd-kit
- [ ] Build ProjectCard component
- [ ] Build ProjectDetail component
- [ ] Build SavedItemsGrid component
- [ ] Build ProductivityDashboard component

### [SEQUENTIAL after Components] Pages
- [ ] Create `/admin/productivity` dashboard page
- [ ] Create `/admin/productivity/tasks` page
- [ ] Create `/admin/productivity/tasks/[id]` page
- [ ] Create `/admin/productivity/projects` page
- [ ] Create `/admin/productivity/projects/board` page
- [ ] Create `/admin/productivity/projects/[id]` page
- [ ] Create `/admin/productivity/saved` page
- [ ] Create `/admin/productivity/reports` page

### [SEQUENTIAL after All] Testing
- [ ] Unit tests for task service functions
- [ ] Unit tests for project service functions
- [ ] Integration tests for task workflows
- [ ] Tenant isolation tests
- [ ] Kanban drag-and-drop tests

---

## Definition of Done

- [ ] Tasks can be created, assigned, and completed
- [ ] Task filters and search work correctly
- [ ] Projects display in Kanban board with drag-and-drop
- [ ] Project stage transitions persist correctly
- [ ] Saved items can be added and organized
- [ ] Dashboard shows accurate KPIs and charts
- [ ] All actions logged in audit trail
- [ ] Tenant A cannot see Tenant B's tasks/projects
- [ ] `npx tsc --noEmit` passes
- [ ] Unit and integration tests pass
- [ ] Kanban performance smooth with 50+ projects
