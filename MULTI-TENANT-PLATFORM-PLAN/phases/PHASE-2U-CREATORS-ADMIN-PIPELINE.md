# PHASE-2U-CREATORS-ADMIN-PIPELINE: Creator Pipeline & Kanban

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: COMPLETE
**Duration**: 1 week (Week 20)
**Depends On**: PHASE-4C (creator projects), PHASE-2U-CREATORS-ADMIN-DIRECTORY
**Parallel With**: PHASE-2U-CREATORS-ADMIN-COMMUNICATIONS, PHASE-2U-CREATORS-ADMIN-ESIGN
**Blocks**: None

---

## Goal

Implement a comprehensive project pipeline management system with Kanban board, multiple views (table, calendar), stage configuration, automation triggers, and pipeline analytics for managing creator projects from creation to payout.

---

## Success Criteria

- [x] Kanban board with drag-and-drop stage transitions
- [x] Multiple views: Kanban, Table, Calendar
- [x] Stage configuration (columns, WIP limits, colors)
- [x] At-risk indicators (overdue, due soon)
- [x] Pipeline analytics (throughput, bottlenecks, cycle time)
- [x] Filtering by creator, status, deadline, risk level
- [x] Bulk stage transitions
- [x] Stage automation triggers
- [x] Keyboard shortcuts for power users

---

## Implementation Summary

### Files Created

**Database Migration:**
- `/packages/db/src/migrations/tenant/015_pipeline_config.sql` - Pipeline tables (config, triggers, saved_filters, stage_history, projects enhancements)

**TypeScript Types & Data Layer:**
- `/apps/admin/src/lib/pipeline/types.ts` - Complete type definitions for pipeline entities
- `/apps/admin/src/lib/pipeline/db.ts` - Database operations with tenant isolation
- `/apps/admin/src/lib/pipeline/index.ts` - Module exports

**API Routes:**
- `/apps/admin/src/app/api/admin/creator-pipeline/route.ts` - GET projects with filters
- `/apps/admin/src/app/api/admin/creator-pipeline/stats/route.ts` - GET pipeline statistics
- `/apps/admin/src/app/api/admin/creator-pipeline/analytics/route.ts` - GET analytics data
- `/apps/admin/src/app/api/admin/creator-pipeline/[id]/status/route.ts` - PATCH project status
- `/apps/admin/src/app/api/admin/creator-pipeline/bulk-status/route.ts` - POST bulk status updates
- `/apps/admin/src/app/api/admin/creator-pipeline/config/route.ts` - GET/PATCH pipeline config
- `/apps/admin/src/app/api/admin/creator-pipeline/triggers/route.ts` - GET/POST triggers
- `/apps/admin/src/app/api/admin/creator-pipeline/triggers/[id]/route.ts` - PATCH/DELETE trigger
- `/apps/admin/src/app/api/admin/creator-pipeline/filters/route.ts` - GET/POST saved filters
- `/apps/admin/src/app/api/admin/creator-pipeline/filters/[id]/route.ts` - DELETE filter

**UI Components:**
- `/apps/admin/src/components/admin/pipeline/pipeline-page.tsx` - Main page with view toggle
- `/apps/admin/src/components/admin/pipeline/kanban-view.tsx` - Kanban board with @dnd-kit
- `/apps/admin/src/components/admin/pipeline/kanban-column.tsx` - Individual Kanban column
- `/apps/admin/src/components/admin/pipeline/project-card.tsx` - Draggable project card with risk indicators
- `/apps/admin/src/components/admin/pipeline/table-view.tsx` - Table view with sorting, inline status change
- `/apps/admin/src/components/admin/pipeline/calendar-view.tsx` - Calendar view with month/week navigation
- `/apps/admin/src/components/admin/pipeline/filter-panel.tsx` - Collapsible filter panel with saved filters
- `/apps/admin/src/components/admin/pipeline/stats-bar.tsx` - Top statistics bar
- `/apps/admin/src/components/admin/pipeline/analytics-panel.tsx` - Expandable analytics with charts
- `/apps/admin/src/components/admin/pipeline/project-detail-modal.tsx` - Project detail modal
- `/apps/admin/src/components/admin/pipeline/stage-config-modal.tsx` - Stage configuration modal
- `/apps/admin/src/components/admin/pipeline/trigger-config-modal.tsx` - Automation trigger configuration
- `/apps/admin/src/components/admin/pipeline/keyboard-shortcuts-help.tsx` - Keyboard shortcuts help modal
- `/apps/admin/src/components/admin/pipeline/index.ts` - Component exports

**Page:**
- `/apps/admin/src/app/admin/creator-pipeline/page.tsx` - Updated pipeline page

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
+-----------------------------------------------------------------------------+
| [Kanban] [Table] [Calendar]    [Filter]    [+ New Project]                  |
+-----------------------------------------------------------------------------+
| Stats: 42 Active | $12,450 at Risk | 8 Overdue | 15 Due This Week           |
+-----------------------------------------------------------------------------+
| +--------+ +--------+ +--------+ +--------+ +--------+ +--------+           |
| | Draft  | |Upcoming| |In Prog | |Submitted| |Revisions| |Approved|        |
| |  (3)   | |  (5)   | |  (12)  | |   (8)   | |   (2)   | |  (6)  |         |
| +--------+ +--------+ +--------+ +--------+ +--------+ +--------+           |
| |Project | |Project | |Overdue | |Project | |Warning | |Project |          |
| |Card 1  | |Card 4  | |Card    | |Card 9  | |Card    | |Card    |          |
| +--------+ +--------+ +--------+ +--------+ +--------+ +--------+           |
+-----------------------------------------------------------------------------+
```

**Drag-and-Drop**:
- Uses `@dnd-kit/core` for drag-and-drop
- Validates transitions against `VALID_TRANSITIONS`
- Shows invalid drop zones as grayed out
- Locked statuses cannot be dragged
- Optimistic UI update with rollback on error

### 3. Table View

**Table Features**:
- Column sorting by any sortable field
- Inline status change dropdown
- Row click opens detail modal
- Bulk selection + bulk status actions

### 4. Calendar View

**Calendar Features**:
- Month/Week view toggle
- Projects positioned on due date
- Color-coded by status
- Click to open project detail
- Today indicator
- Legend showing status colors

### 5. Filter Panel

**Filters Implemented**:
- Creator (multi-select)
- Status (multi-select)
- Due Date (date range)
- Risk Level (multi-select)
- Has Files (toggle)
- Unread Messages (toggle)
- Search (text input)

**Saved Filters**:
- Save current filter as named preset
- Quick access to saved filters
- Delete saved filters

### 6. Pipeline Analytics

**Stats Bar (Always Visible)**:
- Active projects count
- Value at risk
- Overdue count
- Due this week count
- Average cycle time
- Throughput per week

**Analytics Panel**:
- Throughput chart (weekly)
- Cycle time distribution
- Stage distribution bars
- Risk distribution breakdown
- Bottleneck detection with WIP violations

### 7. Stage Configuration

**Configurable per Stage**:
- Label
- Color (hex)
- WIP Limit
- Auto-notify Creator toggle

### 8. Automation Triggers

**Trigger Types Supported**:
- Stage Enter
- Stage Exit
- Overdue
- Due Soon (X days before)
- Value Threshold

**Action Types Supported**:
- Send Email
- Slack Notification
- Assign to User
- Add Tag
- Change Status

### 9. Keyboard Shortcuts

**Shortcuts Implemented**:
| Key | Action |
|-----|--------|
| `?` | Show shortcuts help |
| `Esc` | Close modal/deselect |
| `f` / `/` | Focus search/filter |
| `v k` | Switch to Kanban view |
| `v t` | Switch to Table view |
| `v c` | Switch to Calendar view |

---

## Database Schema

Created in migration `015_pipeline_config.sql`:

- `pipeline_config` - Pipeline stage configuration (singleton per tenant)
- `pipeline_triggers` - Automation triggers
- `pipeline_saved_filters` - User-saved filter presets
- `pipeline_stage_history` - History of stage transitions for analytics
- Enhanced `projects` table with status enum and additional fields

---

## API Routes

All routes implemented with tenant isolation using `x-tenant-slug` header.

---

## Tasks

### [PARALLEL] Database & Types
- [x] Create `pipeline_config` table migration
- [x] Create `pipeline_triggers` table migration
- [x] Create `pipeline_saved_filters` table migration
- [x] Define TypeScript interfaces in admin lib

### [PARALLEL with types] Data Layer
- [x] Implement `getPipelineProjects(tenantId, filters)` function
- [x] Implement `getPipelineStats(tenantId)` function
- [x] Implement `getPipelineAnalytics(tenantId, period)` function
- [x] Implement `updateProjectStatus(projectId, newStatus)` function
- [x] Implement `bulkUpdateStatus(projectIds, newStatus)` function
- [x] Implement `getPipelineConfig(tenantId)` function
- [x] Implement `updatePipelineConfig(tenantId, config)` function
- [x] Implement trigger CRUD functions
- [x] Implement saved filter CRUD functions

### [SEQUENTIAL after data layer] API Routes
- [x] Create `/api/admin/creator-pipeline` route
- [x] Create `/api/admin/creator-pipeline/stats` route
- [x] Create `/api/admin/creator-pipeline/analytics` route
- [x] Create `/api/admin/creator-pipeline/[id]/status` route
- [x] Create `/api/admin/creator-pipeline/bulk-status` route
- [x] Create `/api/admin/creator-pipeline/config` route
- [x] Create `/api/admin/creator-pipeline/triggers` routes
- [x] Create `/api/admin/creator-pipeline/filters` routes

### [PARALLEL with API] UI Components - Kanban
- [x] Build PipelinePage with view toggle
- [x] Build KanbanView with @dnd-kit
- [x] Build KanbanColumn component
- [x] Build ProjectCard with risk indicators
- [x] Build ProjectDetailModal
- [x] Implement drag-and-drop with validation
- [x] Add optimistic updates

### [PARALLEL with Kanban] UI Components - Table
- [x] Build TableView component
- [x] Implement column sorting
- [x] Implement inline status change
- [x] Implement bulk selection

### [PARALLEL with Table] UI Components - Calendar
- [x] Build CalendarView (native implementation)
- [x] Implement event rendering
- [x] Implement click to view
- [x] Add view toggles (month/week)

### [SEQUENTIAL after views] Analytics & Config
- [x] Build StatsBar component
- [x] Build AnalyticsPanel with charts
- [x] Build FilterPanel
- [x] Build SavedFiltersDropdown
- [x] Build StageConfigModal
- [x] Build TriggerConfigModal
- [x] Add keyboard shortcuts

---

## Definition of Done

- [x] Kanban board displays projects in correct columns
- [x] Drag-and-drop validates transitions
- [x] Table view shows sortable, filterable data
- [x] Calendar view shows projects on due dates
- [x] Stats bar shows accurate metrics
- [x] Analytics panel shows throughput and bottlenecks
- [x] Filters work across all views
- [x] Stage configuration saves and applies
- [x] Automation triggers configured (execution requires background jobs)
- [x] Keyboard shortcuts work
- [x] All pages are tenant-isolated
- [x] TypeScript types pass (no pipeline-related errors)
- [x] Performance: Optimistic updates for responsive UI
