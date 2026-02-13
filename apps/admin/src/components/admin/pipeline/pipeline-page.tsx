'use client'

import { cn } from '@cgk-platform/ui'
import {
  Calendar,
  Kanban,
  Plus,
  RefreshCw,
  Settings,
  Table,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useTransition } from 'react'

import type {
  PipelineProject,
  PipelineStats,
  PipelineAnalytics,
  PipelineConfig,
  PipelineFilters,
  PipelineSort,
  PipelineView,
  SavedFilter,
  ProjectStatus,
  PipelineTrigger,
} from '@/lib/pipeline/types'
import { PIPELINE_STAGES } from '@/lib/pipeline/types'

import { AnalyticsPanel } from './analytics-panel'
import { CalendarView } from './calendar-view'
import { FilterPanel } from './filter-panel'
import { KanbanView } from './kanban-view'
import { KeyboardShortcutsHelp } from './keyboard-shortcuts-help'
import { ProjectDetailModal } from './project-detail-modal'
import { StageConfigModal } from './stage-config-modal'
import { StatsBar } from './stats-bar'
import { TableView } from './table-view'
import { TriggerConfigModal } from './trigger-config-modal'

interface PipelinePageProps {
  initialProjects: PipelineProject[]
  initialStats: PipelineStats
  initialConfig: PipelineConfig
}

export function PipelinePage({
  initialProjects,
  initialStats,
  initialConfig,
}: PipelinePageProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // State
  const [view, setView] = useState<PipelineView>('kanban')
  const [projects, setProjects] = useState(initialProjects)
  const [stats, setStats] = useState(initialStats)
  const [config, setConfig] = useState(initialConfig)
  const [filters, setFilters] = useState<PipelineFilters>({})
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [creators, setCreators] = useState<Array<{ id: string; name: string }>>([])
  const [analytics] = useState<PipelineAnalytics | null>(null)
  const [sort, setSort] = useState<PipelineSort>({
    field: 'dueDate',
    direction: 'asc',
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Modal states
  const [selectedProject, setSelectedProject] = useState<PipelineProject | null>(null)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showStageConfig, setShowStageConfig] = useState(false)
  const [showTriggerConfig, setShowTriggerConfig] = useState(false)
  const [editingTrigger, setEditingTrigger] = useState<PipelineTrigger | undefined>()

  // Fetch saved filters and creators on mount
  useEffect(() => {
    async function fetchFiltersData() {
      try {
        const res = await fetch('/api/admin/creator-pipeline/filters')
        if (res.ok) {
          const data = await res.json()
          setSavedFilters(data.filters || [])
          setCreators(data.creators || [])
        }
      } catch (error) {
        console.error('Failed to fetch filters data:', error)
      }
    }
    fetchFiltersData()
  }, [])


  // Refetch projects when filters change
  const refetchProjects = useCallback(async () => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams()
        if (filters.search) params.set('search', filters.search)
        if (filters.statuses) {
          filters.statuses.forEach((s) => params.append('status', s))
        }
        if (filters.creatorIds) {
          filters.creatorIds.forEach((id) => params.append('creatorId', id))
        }
        if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
        if (filters.dateTo) params.set('dateTo', filters.dateTo)
        if (filters.riskLevels) {
          filters.riskLevels.forEach((r) => params.append('riskLevel', r))
        }
        if (filters.hasFiles) params.set('hasFiles', 'true')
        if (filters.hasUnreadMessages) params.set('hasUnreadMessages', 'true')

        const res = await fetch(`/api/admin/creator-pipeline?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setProjects(data.projects)
          setStats(data.stats)
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error)
      }
    })
  }, [filters])

  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      refetchProjects()
    }
  }, [filters, refetchProjects])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (e.key) {
        case '?':
          e.preventDefault()
          setShowShortcutsHelp(true)
          break
        case 'Escape':
          setSelectedProject(null)
          setSelectedIds(new Set())
          break
        case 'f':
        case '/':
          e.preventDefault()
          setIsFilterExpanded(true)
          break
        case 'v':
          // Check for second key press
          break
        case 'k':
          if (e.key === 'k' && !e.ctrlKey) {
            setView('kanban')
          }
          break
        case 't':
          setView('table')
          break
        case 'c':
          setView('calendar')
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle status change
  const handleStatusChange = useCallback(
    async (projectId: string, newStatus: ProjectStatus) => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/admin/creator-pipeline/${projectId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newStatus }),
          })

          if (res.ok) {
            const data = await res.json()
            setProjects((prev) =>
              prev.map((p) => (p.id === projectId ? data.project : p))
            )
            if (selectedProject?.id === projectId) {
              setSelectedProject(data.project)
            }
            router.refresh()
          }
        } catch (error) {
          console.error('Failed to update status:', error)
        }
      })
    },
    [router, selectedProject]
  )

  // Handle due date change (calendar drag)
  const handleDueDateChange = useCallback(
    async (projectId: string, newDate: string) => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/admin/creator-pipeline/${projectId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dueDate: newDate }),
          })

          if (res.ok) {
            router.refresh()
          }
        } catch (error) {
          console.error('Failed to update due date:', error)
        }
      })
    },
    [router]
  )

  // Handle save filter
  const handleSaveFilter = useCallback(
    async (name: string) => {
      try {
        const res = await fetch('/api/admin/creator-pipeline/filters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, filters }),
        })

        if (res.ok) {
          const data = await res.json()
          setSavedFilters((prev) => [data.filter, ...prev])
        }
      } catch (error) {
        console.error('Failed to save filter:', error)
      }
    },
    [filters]
  )

  // Handle load filter
  const handleLoadFilter = useCallback((filter: SavedFilter) => {
    setFilters(filter.filters)
  }, [])

  // Handle delete filter
  const handleDeleteFilter = useCallback(async (filterId: string) => {
    try {
      const res = await fetch(`/api/admin/creator-pipeline/filters/${filterId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setSavedFilters((prev) => prev.filter((f) => f.id !== filterId))
      }
    } catch (error) {
      console.error('Failed to delete filter:', error)
    }
  }, [])

  // Handle save config
  const handleSaveConfig = useCallback(
    async (updates: Partial<PipelineConfig>) => {
      try {
        const res = await fetch('/api/admin/creator-pipeline/config', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })

        if (res.ok) {
          setConfig((prev) => ({ ...prev, ...updates }))
        }
      } catch (error) {
        console.error('Failed to save config:', error)
        throw error
      }
    },
    []
  )

  // Handle save trigger
  const handleSaveTrigger = useCallback(
    async (
      trigger: Omit<PipelineTrigger, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      try {
        const res = await fetch('/api/admin/creator-pipeline/triggers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(trigger),
        })

        if (!res.ok) {
          throw new Error('Failed to save trigger')
        }
      } catch (error) {
        console.error('Failed to save trigger:', error)
        throw error
      }
    },
    []
  )

  // Sort projects for table view
  const sortedProjects = [...projects].sort((a, b) => {
    const aVal = a[sort.field]
    const bVal = b[sort.field]
    const dir = sort.direction === 'asc' ? 1 : -1

    if (aVal === null || aVal === undefined) return dir
    if (bVal === null || bVal === undefined) return -dir

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal) * dir
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * dir
    }
    return 0
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-xl font-bold text-slate-200">
          Project Pipeline
        </h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-700/50 p-0.5">
            {[
              { id: 'kanban' as const, icon: Kanban, label: 'Kanban' },
              { id: 'table' as const, icon: Table, label: 'Table' },
              { id: 'calendar' as const, icon: Calendar, label: 'Calendar' },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded px-3 py-1.5 font-mono text-xs transition-colors',
                  view === v.id
                    ? 'bg-slate-700 text-slate-200'
                    : 'text-slate-500 hover:text-slate-300'
                )}
                title={v.label}
              >
                <v.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetchProjects()}
            disabled={isPending}
            className={cn(
              'rounded border border-slate-700/50 p-2 text-slate-500 transition-colors hover:border-slate-600 hover:text-slate-300',
              isPending && 'animate-spin'
            )}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowStageConfig(true)}
            className="rounded border border-slate-700/50 p-2 text-slate-500 transition-colors hover:border-slate-600 hover:text-slate-300"
            title="Stage Configuration"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Triggers */}
          <button
            onClick={() => {
              setEditingTrigger(undefined)
              setShowTriggerConfig(true)
            }}
            className="rounded border border-slate-700/50 p-2 text-slate-500 transition-colors hover:border-slate-600 hover:text-slate-300"
            title="Automation Triggers"
          >
            <Zap className="h-4 w-4" />
          </button>

          {/* New Project */}
          <button className="flex items-center gap-1.5 rounded bg-blue-500 px-3 py-2 font-mono text-xs font-medium text-white transition-colors hover:bg-blue-600">
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <StatsBar stats={stats} isLoading={isPending} />

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        savedFilters={savedFilters}
        creators={creators}
        onSaveFilter={handleSaveFilter}
        onLoadFilter={handleLoadFilter}
        onDeleteFilter={handleDeleteFilter}
        isExpanded={isFilterExpanded}
        onToggleExpanded={() => setIsFilterExpanded(!isFilterExpanded)}
      />

      {/* Analytics Panel */}
      <AnalyticsPanel
        analytics={
          analytics || {
            throughput: [],
            cycleTime: [],
            stageMetrics: [],
            bottlenecks: [],
            riskDistribution: [],
          }
        }
        isLoading={!analytics}
      />

      {/* Main View */}
      <div className={cn('min-h-[400px]', isPending && 'opacity-50')}>
        {view === 'kanban' && (
          <KanbanView
            projects={projects}
            config={config}
            onProjectClick={setSelectedProject}
          />
        )}
        {view === 'table' && (
          <TableView
            projects={sortedProjects}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onProjectClick={setSelectedProject}
            onStatusChange={handleStatusChange}
            sort={sort}
            onSortChange={setSort}
          />
        )}
        {view === 'calendar' && (
          <CalendarView
            projects={projects}
            onProjectClick={setSelectedProject}
            onDueDateChange={handleDueDateChange}
          />
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 shadow-xl">
          <span className="font-mono text-sm text-slate-400">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <select
            onChange={(e) => {
              if (e.target.value) {
                // Bulk status update
                Array.from(selectedIds).forEach((id) => {
                  handleStatusChange(id, e.target.value as ProjectStatus)
                })
                setSelectedIds(new Set())
              }
            }}
            className="rounded border border-slate-700/50 bg-slate-900/50 px-2 py-1 font-mono text-xs text-slate-200"
            defaultValue=""
          >
            <option value="">Move to...</option>
            {PIPELINE_STAGES.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="font-mono text-xs text-slate-500 hover:text-slate-300"
          >
            Clear
          </button>
        </div>
      )}

      {/* Modals */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onStatusChange={(newStatus) => {
            handleStatusChange(selectedProject.id, newStatus)
          }}
        />
      )}

      {showShortcutsHelp && (
        <KeyboardShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />
      )}

      {showStageConfig && (
        <StageConfigModal
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setShowStageConfig(false)}
        />
      )}

      {showTriggerConfig && (
        <TriggerConfigModal
          trigger={editingTrigger}
          onSave={handleSaveTrigger}
          onClose={() => setShowTriggerConfig(false)}
        />
      )}

      {/* Keyboard shortcut hint */}
      <div className="fixed bottom-4 right-4 font-mono text-xs text-slate-600">
        Press <kbd className="rounded border border-slate-700 bg-slate-800 px-1 text-slate-500">?</kbd> for shortcuts
      </div>
    </div>
  )
}
