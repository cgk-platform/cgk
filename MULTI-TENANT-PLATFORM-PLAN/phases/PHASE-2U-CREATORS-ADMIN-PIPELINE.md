# PHASE-2U-CREATORS-ADMIN-PIPELINE: Creator Pipeline & Kanban

**Duration**: 1 week (Week 20)
**Depends On**: PHASE-4C (creator projects), PHASE-2U-CREATORS-ADMIN-DIRECTORY
**Parallel With**: PHASE-2U-CREATORS-ADMIN-COMMUNICATIONS, PHASE-2U-CREATORS-ADMIN-ESIGN
**Blocks**: None

---

## Goal

Implement a comprehensive project pipeline management system with Kanban board, multiple views (table, calendar), stage configuration, automation triggers, and pipeline analytics for managing creator projects from creation to payout.

---

## Success Criteria

- [ ] Kanban board with drag-and-drop stage transitions
- [ ] Multiple views: Kanban, Table, Calendar
- [ ] Stage configuration (columns, WIP limits, colors)
- [ ] At-risk indicators (overdue, due soon)
- [ ] Pipeline analytics (throughput, bottlenecks, cycle time)
- [ ] Filtering by creator, status, deadline, risk level
- [ ] Bulk stage transitions
- [ ] Stage automation triggers
- [ ] Keyboard shortcuts for power users

---

## Deliverables

### 1. Pipeline Overview

**Location**: `/admin/creator-pipeline`

**Pipeline Stages (Default)**:
```typescript
const PIPELINE_STAGES = [
  { id: 'draft', label: 'Draft', color: '#9CA3AF' },
  { id: 'pending_creator', label: 'Upcoming', color: '#3B82F6' },
  { id: 'in_progress', label: 'In Progress', color: '#8B5CF6' },
  { id: 'submitted', label: 'Submitted', color: '#F59E0B' },
  { id: 'revision_requested', label: 'Revisions', color: '#EF4444' },
  { id: 'approved', label: 'Approved', color: '#10B981' },
  { id: 'payout_ready', label: 'Payout Ready', color: '#059669' },
  { id: 'withdrawal_requested', label: 'Withdrawal Requested', color: '#6366F1' },
  { id: 'payout_approved', label: 'Paid', color: '#047857' },
] as const

type ProjectStatus = typeof PIPELINE_STAGES[number]['id']
```

**Valid Stage Transitions**:
```typescript
const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['pending_creator', 'in_progress'],
  pending_creator: ['draft', 'in_progress', 'revision_requested'],
  in_progress: ['submitted', 'revision_requested', 'approved', 'payout_ready'],
  submitted: ['approved', 'revision_requested', 'in_progress', 'payout_ready'],
  revision_requested: ['in_progress', 'submitted', 'approved', 'payout_ready'],
  approved: ['payout_ready', 'revision_requested'],
  payout_ready: ['withdrawal_requested', 'approved'],
  withdrawal_requested: ['payout_approved', 'revision_requested'], // Locked (admin only)
  payout_approved: [], // Terminal state (locked)
}

// Locked stages - cannot be dragged
const LOCKED_STATUSES = ['withdrawal_requested', 'payout_approved']
```

### 2. Kanban View

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Kanban] [Table] [Calendar]    [Filter ▼]    [+ New Project]               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Stats: 42 Active | $12,450 at Risk | 8 Overdue | 15 Due This Week         │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│ │ Draft   │ │ Upcoming│ │ In Prog │ │Submitted│ │Revisions│ │ Approved│   │
│ │   (3)   │ │   (5)   │ │   (12)  │ │   (8)   │ │   (2)   │ │   (6)   │   │
│ ├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤   │
│ │┌───────┐│ │┌───────┐│ │┌───────┐│ │┌───────┐│ │┌───────┐│ │┌───────┐│   │
│ ││Project││ ││Project││ ││🚨 Over││ ││Project││ ││⚠️ Proj ││ ││Project││   │
│ ││Card 1 ││ ││Card 4 ││ ││due    ││ ││Card 9 ││ ││Card X ││ ││Card Y ││   │
│ │└───────┘│ │└───────┘│ │└───────┘│ │└───────┘│ │└───────┘│ │└───────┘│   │
│ │┌───────┐│ │┌───────┐│ │┌───────┐│ │         │ │         │ │         │   │
│ ││Project││ ││Project││ ││⚠️ Due  ││ │         │ │         │ │         │   │
│ ││Card 2 ││ ││Card 5 ││ ││Soon   ││ │         │ │         │ │         │   │
│ │└───────┘│ │└───────┘│ │└───────┘│ │         │ │         │ │         │   │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Project Card Component**:
```typescript
interface ProjectCardProps {
  project: PipelineProject
  isDragging?: boolean
  onClick?: () => void
}

interface PipelineProject {
  id: string
  title: string
  creatorId: string
  creatorName: string
  creatorAvatar?: string
  status: ProjectStatus
  dueDate?: Date
  daysUntilDeadline: number | null
  valueCents: number
  isAtRisk: boolean
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  tags?: string[]
  hasUnreadMessages: boolean
  filesCount: number
  lastActivityAt: Date
}
```

**Card Visual Indicators**:
| Indicator | Condition | Style |
|-----------|-----------|-------|
| 🚨 Critical | Overdue | Red left border + Red emoji |
| ⚠️ Warning | Due in ≤3 days | Orange left border + Orange emoji |
| ✅ Complete | Approved/Paid stages | Green left border + Reduced opacity |
| 💬 Unread | Has unread messages | Blue dot badge |

**Drag-and-Drop**:
- Uses `@dnd-kit/core` for drag-and-drop
- Validates transitions against `VALID_TRANSITIONS`
- Shows invalid drop zones as grayed out
- Locked statuses cannot be dragged
- Optimistic UI update with rollback on error

### 3. Table View

**Location**: `/admin/creator-pipeline` (toggle view)

**Table Columns**:
| Column | Description | Sortable | Filterable |
|--------|-------------|----------|------------|
| Select | Bulk selection checkbox | No | No |
| Project | Title + Creator name | Yes | Text search |
| Status | Status badge with color | Yes | Multi-select |
| Due Date | Date + Days remaining | Yes | Date range |
| Value | Payment amount | Yes | Range |
| Risk | Risk level indicator | Yes | Multi-select |
| Files | File count | Yes | No |
| Last Activity | Relative timestamp | Yes | Date range |
| Actions | Quick actions menu | No | No |

**Table Features**:
- Column resizing
- Column visibility toggle
- Sort by any sortable column
- Inline status change dropdown
- Row click opens detail modal
- Bulk selection + actions

### 4. Calendar View

**Location**: `/admin/creator-pipeline` (toggle view)

**Calendar Features**:
- Month/Week/Day view toggle
- Projects positioned on due date
- Color-coded by status
- Click to open project detail
- Drag to change due date
- Filter by creator, status
- Today indicator

**Calendar Event**:
```typescript
interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  backgroundColor: string
  borderColor: string
  textColor: string
  extendedProps: {
    projectId: string
    creatorName: string
    status: ProjectStatus
    valueCents: number
  }
}
```

### 5. Filter Panel

**Location**: Collapsible panel above Kanban/Table

**Filters**:
| Filter | Type | Options |
|--------|------|---------|
| Creator | Multi-select | All creators with active projects |
| Status | Multi-select | All pipeline stages |
| Due Date | Date range | From/To date picker |
| Risk Level | Multi-select | None, Low, Medium, High, Critical |
| Value Range | Range slider | Min/Max cents |
| Has Files | Toggle | With files only |
| Unread Messages | Toggle | With unread only |
| Tags | Multi-select | Project tags |

**Saved Filters**:
- Save current filter as named preset
- Quick access to saved filters
- Admin-defined default filters

### 6. Pipeline Analytics

**Stats Bar (Always Visible)**:
```typescript
interface PipelineStats {
  totalProjects: number
  activeProjects: number
  totalValueCents: number
  atRiskValueCents: number
  overdueCount: number
  dueSoonCount: number
  avgCycleTimeDays: number
  throughputPerWeek: number
}
```

**Analytics Dashboard** (expandable section):

| Metric | Description |
|--------|-------------|
| **Throughput** | Projects completed per week (4-week rolling) |
| **Cycle Time** | Avg days from creation to completion |
| **Lead Time** | Avg days from pending_creator to approved |
| **Stage Duration** | Avg time in each stage |
| **Bottleneck Detection** | Stage with longest avg duration |
| **Value at Risk** | Sum of overdue + due-soon project values |
| **WIP Violations** | Stages exceeding WIP limits |

**Visualizations**:
- Stage distribution pie chart
- Throughput trend line (weekly)
- Cycle time histogram
- Stage duration bar chart
- Risk distribution breakdown

### 7. Stage Configuration

**Location**: `/admin/creator-pipeline/settings` (or modal)

**Configurable per Stage**:
| Setting | Description | Default |
|---------|-------------|---------|
| Label | Display name | Stage ID humanized |
| Color | Hex color code | Default palette |
| WIP Limit | Max cards in stage | 0 (unlimited) |
| Auto-notify Creator | Send email on entry | false |
| Auto-assign | Auto-assign to admin | null |
| Default Due Offset | Days from entry to due | null |

**Stage Order**:
- Drag-and-drop reordering
- Cannot remove required stages (draft, approved, payout_approved)
- Can add custom intermediate stages

### 8. Automation Triggers

**Trigger Types**:
```typescript
type PipelineTrigger = {
  id: string
  tenantId: string
  name: string
  enabled: boolean
  triggerType: 'stage_enter' | 'stage_exit' | 'overdue' | 'due_soon' | 'value_threshold'
  triggerStage?: ProjectStatus
  triggerDays?: number // For due_soon
  triggerValueCents?: number
  actions: PipelineAction[]
}

type PipelineAction =
  | { type: 'send_email', template: string }
  | { type: 'slack_notify', channel: string, message: string }
  | { type: 'assign_to', userId: string }
  | { type: 'add_tag', tag: string }
  | { type: 'change_status', newStatus: ProjectStatus }
```

**Built-in Triggers**:
- `overdue_reminder` - Send reminder when project becomes overdue
- `due_soon_warning` - Send warning 3 days before deadline
- `submitted_notification` - Notify admin when creator submits
- `approval_notification` - Notify creator when approved

### 9. Keyboard Shortcuts

**Shortcuts**:
| Key | Action |
|-----|--------|
| `?` | Show shortcuts help |
| `k` | Move focus up |
| `j` | Move focus down |
| `h` | Move focus left (prev column) |
| `l` | Move focus right (next column) |
| `Enter` | Open focused card |
| `Esc` | Close modal/deselect |
| `n` | New project |
| `f` | Focus search/filter |
| `1-9` | Switch to column 1-9 |

---

## Database Schema

```sql
-- Pipeline configuration per tenant
CREATE TABLE pipeline_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stages JSONB NOT NULL DEFAULT '[]', -- Stage configurations
  default_filters JSONB,
  wip_limits JSONB DEFAULT '{}', -- { stage_id: limit }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Pipeline automation triggers
CREATE TABLE pipeline_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  trigger_type VARCHAR(50) NOT NULL,
  trigger_stage VARCHAR(50),
  trigger_days INTEGER,
  trigger_value_cents INTEGER,
  actions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved filters
CREATE TABLE pipeline_saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pipeline_config_tenant ON pipeline_config(tenant_id);
CREATE INDEX idx_pipeline_triggers_tenant ON pipeline_triggers(tenant_id);
CREATE INDEX idx_pipeline_saved_filters_tenant ON pipeline_saved_filters(tenant_id);
```

---

## API Routes

### Pipeline Data

```
GET /api/admin/creator-pipeline
  Query: status[], creatorId[], dateFrom, dateTo, riskLevel[], minValue, maxValue, page, limit
  Returns: { projects: PipelineProject[], total: number, stats: PipelineStats }

GET /api/admin/creator-pipeline/stats
  Query: period (7d, 30d, 90d)
  Returns: PipelineStats with trends

GET /api/admin/creator-pipeline/analytics
  Query: period
  Returns: { throughput, cycleTime, stageMetrics, bottlenecks }
```

### Stage Transitions

```
PATCH /api/admin/creator-pipeline/[id]/status
  Body: { newStatus: ProjectStatus, notes?: string }
  Returns: { success: boolean, project: PipelineProject }

POST /api/admin/creator-pipeline/bulk-status
  Body: { projectIds: string[], newStatus: ProjectStatus }
  Returns: { success: boolean, updated: number, errors?: [] }
```

### Configuration

```
GET /api/admin/creator-pipeline/config
  Returns: PipelineConfig

PATCH /api/admin/creator-pipeline/config
  Body: PipelineConfig
  Returns: { success: boolean }

GET /api/admin/creator-pipeline/triggers
  Returns: { triggers: PipelineTrigger[] }

POST /api/admin/creator-pipeline/triggers
  Body: CreateTriggerPayload
  Returns: { success: boolean, trigger: PipelineTrigger }

PATCH /api/admin/creator-pipeline/triggers/[id]
  Body: UpdateTriggerPayload
  Returns: { success: boolean }

DELETE /api/admin/creator-pipeline/triggers/[id]
  Returns: { success: boolean }
```

### Saved Filters

```
GET /api/admin/creator-pipeline/filters
  Returns: { filters: SavedFilter[] }

POST /api/admin/creator-pipeline/filters
  Body: { name: string, filters: FilterConfig }
  Returns: { success: boolean, filter: SavedFilter }

DELETE /api/admin/creator-pipeline/filters/[id]
  Returns: { success: boolean }
```

---

## UI Components

```typescript
// packages/admin-core/src/components/pipeline/
PipelinePage.tsx           // Main page with view toggle
KanbanView.tsx             // Kanban board layout
KanbanColumn.tsx           // Individual column
ProjectCard.tsx            // Draggable project card
TableView.tsx              // Table view layout
CalendarView.tsx           // Calendar view
FilterPanel.tsx            // Collapsible filters
StatsBar.tsx               // Top stats row
AnalyticsPanel.tsx         // Expandable analytics
ProjectDetailModal.tsx     // Project detail view
StageConfigModal.tsx       // Stage configuration
TriggerConfigModal.tsx     // Automation trigger setup
SavedFiltersDropdown.tsx   // Quick filter access
KeyboardShortcutsHelp.tsx  // Shortcuts modal
```

---

## Constraints

- Maximum 500 cards loaded per view (paginate beyond)
- Drag-and-drop must validate transitions before applying
- Calendar view limited to projects with due dates
- WIP limit violations shown as warnings, not blocking
- Analytics calculations use pre-aggregated data for performance
- All data must be tenant-isolated

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Kanban board, calendar, analytics

**MCPs to consult:**
- Context7 MCP: "@dnd-kit/core patterns for React"
- Context7 MCP: "FullCalendar React integration"

**RAWDOG code to reference:**
- `src/app/admin/creator-pipeline/page.tsx` - Pipeline page
- `src/app/admin/creator-pipeline/components/TableView.tsx` - Table view
- `src/app/admin/creator-pipeline/components/CalendarView.tsx` - Calendar
- `src/app/admin/creator-pipeline/components/FilterPanel.tsx` - Filters
- `src/lib/creator-portal/pipeline/types.ts` - Pipeline types
- `src/lib/creator-portal/pipeline/at-risk.ts` - Risk calculations

---

## Tasks

### [PARALLEL] Database & Types
- [ ] Create `pipeline_config` table migration
- [ ] Create `pipeline_triggers` table migration
- [ ] Create `pipeline_saved_filters` table migration
- [ ] Define TypeScript interfaces in `@cgk/admin-core`

### [PARALLEL with types] Data Layer
- [ ] Implement `getPipelineProjects(tenantId, filters)` function
- [ ] Implement `getPipelineStats(tenantId)` function
- [ ] Implement `getPipelineAnalytics(tenantId, period)` function
- [ ] Implement `updateProjectStatus(projectId, newStatus)` function
- [ ] Implement `bulkUpdateStatus(projectIds, newStatus)` function
- [ ] Implement `getPipelineConfig(tenantId)` function
- [ ] Implement `updatePipelineConfig(tenantId, config)` function
- [ ] Implement trigger CRUD functions
- [ ] Implement saved filter CRUD functions

### [SEQUENTIAL after data layer] API Routes
- [ ] Create `/api/admin/creator-pipeline` route
- [ ] Create `/api/admin/creator-pipeline/stats` route
- [ ] Create `/api/admin/creator-pipeline/analytics` route
- [ ] Create `/api/admin/creator-pipeline/[id]/status` route
- [ ] Create `/api/admin/creator-pipeline/bulk-status` route
- [ ] Create `/api/admin/creator-pipeline/config` route
- [ ] Create `/api/admin/creator-pipeline/triggers` routes
- [ ] Create `/api/admin/creator-pipeline/filters` routes

### [PARALLEL with API] UI Components - Kanban
- [ ] Build PipelinePage with view toggle
- [ ] Build KanbanView with @dnd-kit
- [ ] Build KanbanColumn component
- [ ] Build ProjectCard with risk indicators
- [ ] Build ProjectDetailModal
- [ ] Implement drag-and-drop with validation
- [ ] Add optimistic updates

### [PARALLEL with Kanban] UI Components - Table
- [ ] Build TableView component
- [ ] Implement column sorting
- [ ] Implement inline status change
- [ ] Implement bulk selection

### [PARALLEL with Table] UI Components - Calendar
- [ ] Build CalendarView with FullCalendar
- [ ] Implement event rendering
- [ ] Implement drag-to-reschedule
- [ ] Add view toggles (month/week/day)

### [SEQUENTIAL after views] Analytics & Config
- [ ] Build StatsBar component
- [ ] Build AnalyticsPanel with charts
- [ ] Build FilterPanel
- [ ] Build SavedFiltersDropdown
- [ ] Build StageConfigModal
- [ ] Build TriggerConfigModal
- [ ] Add keyboard shortcuts

---

## Definition of Done

- [ ] Kanban board displays projects in correct columns
- [ ] Drag-and-drop validates transitions
- [ ] Table view shows sortable, filterable data
- [ ] Calendar view shows projects on due dates
- [ ] Stats bar shows accurate metrics
- [ ] Analytics panel shows throughput and bottlenecks
- [ ] Filters work across all views
- [ ] Stage configuration saves and applies
- [ ] Automation triggers fire correctly
- [ ] Keyboard shortcuts work
- [ ] All pages are tenant-isolated
- [ ] `npx tsc --noEmit` passes
- [ ] Performance: <500ms load time for 200 projects
