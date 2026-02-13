'use client'

import { cn } from '@cgk-platform/ui'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Clock,
  DollarSign,
  File,
  MessageCircle,
} from 'lucide-react'
import { useState } from 'react'

import type {
  PipelineProject,
  PipelineSortField,
  PipelineSort,
  ProjectStatus,
  RiskLevel,
} from '@/lib/pipeline/types'
import { PIPELINE_STAGES, getStageLabel, getStageColor } from '@/lib/pipeline/types'

interface TableViewProps {
  projects: PipelineProject[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onProjectClick: (project: PipelineProject) => void
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => void
  sort: PipelineSort
  onSortChange: (sort: PipelineSort) => void
}

const RISK_STYLES: Record<RiskLevel, string> = {
  none: 'text-slate-500',
  low: 'text-yellow-400',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateString)
}

interface SortableHeaderProps {
  field: PipelineSortField
  label: string
  currentSort: PipelineSort
  onSort: (field: PipelineSortField) => void
  className?: string
}

function SortableHeader({
  field,
  label,
  currentSort,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSort.field === field
  const Icon = currentSort.direction === 'asc' ? ArrowUp : ArrowDown

  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 text-left text-xs font-medium uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300',
        isActive && 'text-blue-400',
        className
      )}
    >
      {label}
      {isActive && <Icon className="h-3 w-3" />}
    </button>
  )
}

interface StatusDropdownProps {
  currentStatus: ProjectStatus
  projectId: string
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => void
}

function StatusDropdown({ currentStatus, projectId, onStatusChange }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-slate-700/50"
        style={{ color: getStageColor(currentStatus) }}
      >
        {getStageLabel(currentStatus)}
        <ChevronDown className="h-3 w-3" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
            {PIPELINE_STAGES.map((stage) => (
              <button
                key={stage.id}
                onClick={() => {
                  onStatusChange(projectId, stage.id)
                  setIsOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-slate-700/50',
                  currentStatus === stage.id && 'bg-slate-700/30'
                )}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-slate-300">{stage.label}</span>
                {currentStatus === stage.id && (
                  <Check className="ml-auto h-3 w-3 text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function TableView({
  projects,
  selectedIds,
  onSelectionChange,
  onProjectClick,
  onStatusChange,
  sort,
  onSortChange,
}: TableViewProps) {
  const allSelected = projects.length > 0 && selectedIds.size === projects.length

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(projects.map((p) => p.id)))
    }
  }

  const handleSelectOne = (projectId: string) => {
    const newSelection = new Set(selectedIds)
    if (newSelection.has(projectId)) {
      newSelection.delete(projectId)
    } else {
      newSelection.add(projectId)
    }
    onSelectionChange(newSelection)
  }

  const handleSort = (field: PipelineSortField) => {
    if (sort.field === field) {
      onSortChange({
        field,
        direction: sort.direction === 'asc' ? 'desc' : 'asc',
      })
    } else {
      onSortChange({ field, direction: 'asc' })
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700/30">
      <table className="w-full border-collapse font-mono text-xs">
        <thead>
          <tr className="border-b border-slate-700/30 bg-slate-900/50">
            <th className="w-10 px-3 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500/20"
              />
            </th>
            <th className="px-3 py-3 text-left">
              <SortableHeader
                field="title"
                label="Project"
                currentSort={sort}
                onSort={handleSort}
              />
            </th>
            <th className="px-3 py-3 text-left">
              <SortableHeader
                field="status"
                label="Status"
                currentSort={sort}
                onSort={handleSort}
              />
            </th>
            <th className="px-3 py-3 text-left">
              <SortableHeader
                field="dueDate"
                label="Due Date"
                currentSort={sort}
                onSort={handleSort}
              />
            </th>
            <th className="px-3 py-3 text-right">
              <SortableHeader
                field="valueCents"
                label="Value"
                currentSort={sort}
                onSort={handleSort}
                className="justify-end"
              />
            </th>
            <th className="px-3 py-3 text-center">
              <SortableHeader
                field="riskLevel"
                label="Risk"
                currentSort={sort}
                onSort={handleSort}
                className="justify-center"
              />
            </th>
            <th className="w-16 px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
              Files
            </th>
            <th className="px-3 py-3 text-left">
              <SortableHeader
                field="lastActivityAt"
                label="Last Activity"
                currentSort={sort}
                onSort={handleSort}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const isSelected = selectedIds.has(project.id)
            const initials = project.creatorName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()

            return (
              <tr
                key={project.id}
                className={cn(
                  'border-b border-slate-700/20 transition-colors hover:bg-slate-800/30',
                  isSelected && 'bg-blue-500/5'
                )}
              >
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectOne(project.id)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500/20"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => onProjectClick(project)}
                    className="group flex items-center gap-2 text-left"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-medium text-slate-300">
                      {project.creatorAvatar ? (
                        <img
                          src={project.creatorAvatar}
                          alt={project.creatorName}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-200 group-hover:text-blue-400">
                        {project.title}
                      </div>
                      <div className="truncate text-slate-500">
                        {project.creatorName}
                      </div>
                    </div>
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <StatusDropdown
                    currentStatus={project.status}
                    projectId={project.id}
                    onStatusChange={onStatusChange}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span
                      className={cn(
                        'tabular-nums',
                        project.daysUntilDeadline !== null &&
                          project.daysUntilDeadline < 0 &&
                          'text-red-400',
                        project.daysUntilDeadline !== null &&
                          project.daysUntilDeadline <= 3 &&
                          project.daysUntilDeadline >= 0 &&
                          'text-amber-400'
                      )}
                    >
                      {formatDate(project.dueDate)}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="flex items-center justify-end gap-1 tabular-nums text-emerald-400">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(project.valueCents)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {project.riskLevel !== 'none' && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium uppercase',
                        RISK_STYLES[project.riskLevel]
                      )}
                    >
                      {project.riskLevel === 'critical' && (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      {project.riskLevel}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {project.filesCount > 0 && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <File className="h-3 w-3" />
                        {project.filesCount}
                      </span>
                    )}
                    {project.hasUnreadMessages && (
                      <MessageCircle className="h-3 w-3 fill-blue-400 text-blue-400" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 tabular-nums text-slate-500">
                  {formatRelativeTime(project.lastActivityAt)}
                </td>
              </tr>
            )
          })}
          {projects.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-12 text-center text-slate-500">
                No projects found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
