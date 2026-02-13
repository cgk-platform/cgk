'use client'

import { cn } from '@cgk-platform/ui'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { useRouter } from 'next/navigation'
import { useState, useOptimistic, useTransition, useCallback } from 'react'

import type {
  PipelineProject,
  ProjectStatus,
  PipelineConfig,
} from '@/lib/pipeline/types'
import { LOCKED_STATUSES, isValidTransition } from '@/lib/pipeline/types'

import { KanbanColumn } from './kanban-column'
import { ProjectCard } from './project-card'

interface KanbanViewProps {
  projects: PipelineProject[]
  config: PipelineConfig
  onProjectClick?: (project: PipelineProject) => void
}

export function KanbanView({ projects, config, onProjectClick }: KanbanViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeProject, setActiveProject] = useState<PipelineProject | null>(null)
  const [overStage, setOverStage] = useState<ProjectStatus | null>(null)

  // Group projects by status
  const projectsByStatus = projects.reduce(
    (acc, project) => {
      if (!acc[project.status]) acc[project.status] = []
      acc[project.status].push(project)
      return acc
    },
    {} as Record<ProjectStatus, PipelineProject[]>
  )

  // Optimistic state for smooth UI updates
  const [optimisticProjects, updateOptimisticProjects] = useOptimistic(
    projectsByStatus,
    (
      current: Record<ProjectStatus, PipelineProject[]>,
      update: { projectId: string; from: ProjectStatus; to: ProjectStatus }
    ) => {
      const project = current[update.from]?.find((p) => p.id === update.projectId)
      if (!project) return current

      return {
        ...current,
        [update.from]: current[update.from].filter((p) => p.id !== update.projectId),
        [update.to]: [...(current[update.to] || []), { ...project, status: update.to }],
      }
    }
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const projectId = event.active.id as string
    for (const status of Object.keys(optimisticProjects) as ProjectStatus[]) {
      const project = optimisticProjects[status]?.find((p) => p.id === projectId)
      if (project) {
        setActiveProject(project)
        break
      }
    }
  }, [optimisticProjects])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    if (over) {
      setOverStage(over.id as ProjectStatus)
    } else {
      setOverStage(null)
    }
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveProject(null)
    setOverStage(null)

    if (!over) return

    const projectId = active.id as string
    const targetStage = over.id as ProjectStatus

    // Find source stage
    let sourceStage: ProjectStatus | null = null
    for (const status of Object.keys(optimisticProjects) as ProjectStatus[]) {
      if (optimisticProjects[status]?.some((p) => p.id === projectId)) {
        sourceStage = status
        break
      }
    }

    if (!sourceStage || sourceStage === targetStage) return

    // Check if transition is valid
    if (!isValidTransition(sourceStage, targetStage)) {
      return
    }

    startTransition(async () => {
      updateOptimisticProjects({
        projectId,
        from: sourceStage,
        to: targetStage,
      })

      try {
        const response = await fetch(`/api/admin/creator-pipeline/${projectId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newStatus: targetStage }),
        })

        if (!response.ok) {
          throw new Error('Failed to update status')
        }

        router.refresh()
      } catch {
        // Rollback will happen via router.refresh()
        router.refresh()
      }
    })
  }, [optimisticProjects, router, startTransition, updateOptimisticProjects])

  // Check if drop on current stage is valid
  const isValidDropTarget = useCallback(
    (stageId: ProjectStatus): boolean => {
      if (!activeProject) return true
      if (LOCKED_STATUSES.includes(activeProject.status)) return false
      return isValidTransition(activeProject.status, stageId)
    },
    [activeProject]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          'flex gap-3 overflow-x-auto pb-4',
          isPending && 'pointer-events-none opacity-70'
        )}
      >
        {config.stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            projects={optimisticProjects[stage.id as ProjectStatus] || []}
            isOver={overStage === stage.id}
            isValidDrop={isValidDropTarget(stage.id as ProjectStatus)}
            wipLimit={config.wipLimits[stage.id]}
            onProjectClick={onProjectClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeProject ? (
          <div className="w-72">
            <ProjectCard project={activeProject} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
