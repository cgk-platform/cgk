'use client'

import { cn } from '@cgk-platform/ui'
import {
  AlertCircle,
  Calendar,
  Clock,
  DollarSign,
  File,
  MessageCircle,
  Tag,
  X,
} from 'lucide-react'
import { useEffect } from 'react'

import type { PipelineProject, ProjectStatus } from '@/lib/pipeline/types'
import { PIPELINE_STAGES, VALID_TRANSITIONS } from '@/lib/pipeline/types'

interface ProjectDetailModalProps {
  project: PipelineProject
  onClose: () => void
  onStatusChange: (newStatus: ProjectStatus) => void
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
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const RISK_STYLES = {
  none: { bg: '', text: 'text-slate-400' },
  low: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400' },
}

export function ProjectDetailModal({
  project,
  onClose,
  onStatusChange,
}: ProjectDetailModalProps) {
  const riskStyle = RISK_STYLES[project.riskLevel]
  const validTransitions = VALID_TRANSITIONS[project.status] || []

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const initials = project.creatorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-xl rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-700/50 p-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-mono text-lg font-semibold text-slate-200">
              {project.title}
            </h2>
            <div className="mt-1 flex items-center gap-3">
              <div className="flex items-center gap-2">
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
                <span className="font-mono text-sm text-slate-400">
                  {project.creatorName}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Status */}
          <div className="mb-6">
            <label className="mb-2 flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider text-slate-500">
              <span className="h-px flex-1 bg-slate-700/50" />
              Current Status
              <span className="h-px flex-1 bg-slate-700/50" />
            </label>
            <div className="flex flex-wrap gap-2">
              {PIPELINE_STAGES.map((stage) => {
                const isCurrentStatus = stage.id === project.status
                const isValidTransition = validTransitions.includes(stage.id)
                const canTransition = !isCurrentStatus && isValidTransition

                return (
                  <button
                    key={stage.id}
                    onClick={() => canTransition && onStatusChange(stage.id)}
                    disabled={!canTransition && !isCurrentStatus}
                    className={cn(
                      'rounded px-3 py-1.5 font-mono text-xs font-medium transition-all',
                      isCurrentStatus && 'ring-2',
                      canTransition &&
                        'cursor-pointer opacity-60 hover:opacity-100',
                      !canTransition && !isCurrentStatus && 'cursor-not-allowed opacity-30'
                    )}
                    style={{
                      backgroundColor: isCurrentStatus
                        ? `${stage.color}20`
                        : 'transparent',
                      color: stage.color,
                      borderColor: stage.color,
                      border: `1px solid ${stage.color}40`,
                      ['--tw-ring-color' as string]: isCurrentStatus ? stage.color : undefined,
                    }}
                  >
                    {stage.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Details Grid */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            {/* Value */}
            <div className="rounded border border-slate-700/50 bg-slate-800/30 p-3">
              <div className="mb-1 flex items-center gap-2 text-slate-500">
                <DollarSign className="h-4 w-4" />
                <span className="font-mono text-xs uppercase">Value</span>
              </div>
              <div className="font-mono text-lg font-semibold text-emerald-400">
                {formatCurrency(project.valueCents)}
              </div>
            </div>

            {/* Due Date */}
            <div
              className={cn(
                'rounded border border-slate-700/50 p-3',
                riskStyle.bg || 'bg-slate-800/30'
              )}
            >
              <div className="mb-1 flex items-center gap-2 text-slate-500">
                <Calendar className="h-4 w-4" />
                <span className="font-mono text-xs uppercase">Due Date</span>
              </div>
              <div className={cn('font-mono text-sm font-medium', riskStyle.text)}>
                {formatDate(project.dueDate)}
                {project.daysUntilDeadline !== null && (
                  <span className="ml-2 text-xs opacity-70">
                    ({project.daysUntilDeadline < 0
                      ? `${Math.abs(project.daysUntilDeadline)} days overdue`
                      : project.daysUntilDeadline === 0
                      ? 'Today'
                      : `${project.daysUntilDeadline} days left`})
                  </span>
                )}
              </div>
            </div>

            {/* Risk Level */}
            <div className="rounded border border-slate-700/50 bg-slate-800/30 p-3">
              <div className="mb-1 flex items-center gap-2 text-slate-500">
                <AlertCircle className="h-4 w-4" />
                <span className="font-mono text-xs uppercase">Risk Level</span>
              </div>
              <div className={cn('font-mono text-sm font-medium uppercase', riskStyle.text)}>
                {project.riskLevel}
              </div>
            </div>

            {/* Last Activity */}
            <div className="rounded border border-slate-700/50 bg-slate-800/30 p-3">
              <div className="mb-1 flex items-center gap-2 text-slate-500">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-xs uppercase">Last Activity</span>
              </div>
              <div className="font-mono text-sm text-slate-300">
                {formatDate(project.lastActivityAt)}
              </div>
            </div>
          </div>

          {/* Meta info row */}
          <div className="flex items-center gap-4 border-t border-slate-700/30 pt-4 font-mono text-xs text-slate-500">
            {/* Files */}
            <div className="flex items-center gap-1.5">
              <File className="h-3.5 w-3.5" />
              {project.filesCount} files
            </div>

            {/* Unread messages */}
            {project.hasUnreadMessages && (
              <div className="flex items-center gap-1.5 text-blue-400">
                <MessageCircle className="h-3.5 w-3.5 fill-current" />
                Unread messages
              </div>
            )}

            {/* Tags */}
            {project.tags.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-slate-700/50 px-1.5 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-700/50 px-4 py-3">
          <div className="font-mono text-xs text-slate-600">
            ID: {project.id}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded px-4 py-2 font-mono text-xs text-slate-400 transition-colors hover:text-slate-300"
            >
              Close
            </button>
            <a
              href={`/admin/creators/${project.creatorId}`}
              className="rounded bg-slate-700 px-4 py-2 font-mono text-xs font-medium text-slate-200 transition-colors hover:bg-slate-600"
            >
              View Creator
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
