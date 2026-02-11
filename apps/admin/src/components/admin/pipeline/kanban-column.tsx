'use client'

import { cn } from '@cgk/ui'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Lock } from 'lucide-react'

import type { PipelineProject, ProjectStatus, StageConfig } from '@/lib/pipeline/types'
import { LOCKED_STATUSES } from '@/lib/pipeline/types'

import { SortableProjectCard } from './project-card'

interface KanbanColumnProps {
  stage: StageConfig
  projects: PipelineProject[]
  isOver?: boolean
  isValidDrop?: boolean
  wipLimit?: number
  onProjectClick?: (project: PipelineProject) => void
}

export function KanbanColumn({
  stage,
  projects,
  isOver,
  isValidDrop = true,
  wipLimit,
  onProjectClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver: droppableIsOver } = useDroppable({
    id: stage.id,
  })

  const isLocked = LOCKED_STATUSES.includes(stage.id as ProjectStatus)
  const hasWipViolation = wipLimit && projects.length > wipLimit
  const isOverColumn = isOver ?? droppableIsOver

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border border-slate-700/30 bg-slate-900/30 backdrop-blur-sm',
        isOverColumn && isValidDrop && 'border-blue-500/50 bg-blue-500/5',
        isOverColumn && !isValidDrop && 'border-red-500/30 bg-red-500/5',
        isLocked && 'border-slate-700/20 bg-slate-900/20'
      )}
    >
      {/* Column Header */}
      <div
        className="flex items-center justify-between border-b border-slate-700/30 px-3 py-2"
        style={{
          borderTopColor: stage.color,
          borderTopWidth: '3px',
          borderTopLeftRadius: '0.5rem',
          borderTopRightRadius: '0.5rem',
        }}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-sm font-semibold text-slate-200">
            {stage.label}
          </h3>
          {isLocked && (
            <Lock className="h-3 w-3 text-slate-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {wipLimit && (
            <span
              className={cn(
                'font-mono text-[10px]',
                hasWipViolation ? 'text-amber-400' : 'text-slate-500'
              )}
            >
              WIP: {wipLimit}
            </span>
          )}
          <span
            className={cn(
              'flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 font-mono text-xs font-medium',
              hasWipViolation
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-slate-700/50 text-slate-400'
            )}
          >
            {projects.length}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <SortableContext
        id={stage.id}
        items={projects.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className={cn(
            'flex min-h-[200px] flex-1 flex-col gap-2 overflow-y-auto p-2',
            isOverColumn && 'bg-gradient-to-b from-transparent to-blue-500/5'
          )}
          data-stage={stage.id}
        >
          {projects.map((project) => (
            <SortableProjectCard
              key={project.id}
              project={project}
              onClick={() => onProjectClick?.(project)}
            />
          ))}
          {projects.length === 0 && (
            <div
              className={cn(
                'flex h-20 items-center justify-center rounded border-2 border-dashed text-xs',
                isOverColumn && isValidDrop
                  ? 'border-blue-500/30 text-blue-400'
                  : 'border-slate-700/50 text-slate-600'
              )}
            >
              {isOverColumn && !isValidDrop ? (
                <span className="text-red-400">Invalid transition</span>
              ) : (
                <span>Drop here</span>
              )}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
