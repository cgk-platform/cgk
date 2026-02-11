'use client'

import { cn } from '@cgk/ui'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AlertCircle,
  Clock,
  DollarSign,
  File,
  GripVertical,
  MessageCircle,
} from 'lucide-react'

import type { PipelineProject, RiskLevel } from '@/lib/pipeline/types'
import { LOCKED_STATUSES } from '@/lib/pipeline/types'

interface ProjectCardProps {
  project: PipelineProject
  isDragging?: boolean
  onClick?: () => void
}

const RISK_STYLES: Record<RiskLevel, { border: string; badge: string; text: string }> = {
  none: { border: '', badge: '', text: '' },
  low: {
    border: 'border-l-2 border-l-yellow-500/50',
    badge: 'bg-yellow-500/20 text-yellow-400',
    text: '',
  },
  medium: {
    border: 'border-l-2 border-l-amber-500',
    badge: 'bg-amber-500/20 text-amber-400',
    text: 'text-amber-400',
  },
  high: {
    border: 'border-l-2 border-l-orange-500',
    badge: 'bg-orange-500/20 text-orange-400',
    text: 'text-orange-400',
  },
  critical: {
    border: 'border-l-4 border-l-red-500',
    badge: 'bg-red-500/20 text-red-400',
    text: 'text-red-400',
  },
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDueDate(daysUntil: number | null): string {
  if (daysUntil === null) return ''
  if (daysUntil < 0) return `${Math.abs(daysUntil)}d overdue`
  if (daysUntil === 0) return 'Due today'
  if (daysUntil === 1) return 'Due tomorrow'
  return `${daysUntil}d left`
}

export function ProjectCard({ project, isDragging, onClick }: ProjectCardProps) {
  const riskStyle = RISK_STYLES[project.riskLevel]
  const isCompleted = ['approved', 'payout_ready', 'withdrawal_requested', 'payout_approved'].includes(project.status)
  const initials = project.creatorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer rounded border border-slate-700/50 bg-slate-800/50 p-3 font-mono text-xs transition-all hover:border-slate-600 hover:bg-slate-800',
        riskStyle.border,
        isDragging && 'rotate-2 opacity-90 shadow-xl shadow-black/50',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Title row */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="line-clamp-2 font-medium text-slate-200">{project.title}</h4>
        {project.valueCents > 0 && (
          <span className="flex shrink-0 items-center gap-1 text-emerald-400">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(project.valueCents)}
          </span>
        )}
      </div>

      {/* Creator row */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-medium text-slate-300">
          {project.creatorAvatar ? (
            <img
              src={project.creatorAvatar}
              alt={project.creatorName}
              className="h-5 w-5 rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <span className="truncate text-slate-400">{project.creatorName}</span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-slate-500">
        {/* Due date */}
        {project.daysUntilDeadline !== null && (
          <span
            className={cn(
              'flex items-center gap-1',
              riskStyle.text
            )}
          >
            <Clock className="h-3 w-3" />
            {formatDueDate(project.daysUntilDeadline)}
          </span>
        )}

        {/* Files count */}
        {project.filesCount > 0 && (
          <span className="flex items-center gap-1">
            <File className="h-3 w-3" />
            {project.filesCount}
          </span>
        )}

        {/* Unread messages indicator */}
        {project.hasUnreadMessages && (
          <span className="flex items-center gap-1 text-blue-400">
            <MessageCircle className="h-3 w-3 fill-current" />
          </span>
        )}

        {/* Risk badge */}
        {project.riskLevel !== 'none' && (
          <span
            className={cn(
              'ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium uppercase',
              riskStyle.badge
            )}
          >
            {project.riskLevel === 'critical' && (
              <AlertCircle className="mr-1 inline h-3 w-3" />
            )}
            {project.riskLevel}
          </span>
        )}
      </div>

      {/* Tags */}
      {project.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {project.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-400"
            >
              {tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="text-[10px] text-slate-500">
              +{project.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function SortableProjectCard({
  project,
  onClick,
}: {
  project: PipelineProject
  onClick?: () => void
}) {
  const isLocked = LOCKED_STATUSES.includes(project.status)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
    disabled: isLocked,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative',
        isDragging && 'z-50'
      )}
    >
      {!isLocked && (
        <button
          {...attributes}
          {...listeners}
          className="absolute -left-1 top-3 z-10 cursor-grab touch-none rounded p-1 text-slate-600 opacity-0 transition-opacity hover:text-slate-400 group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <ProjectCard project={project} isDragging={isDragging} onClick={onClick} />
    </div>
  )
}
