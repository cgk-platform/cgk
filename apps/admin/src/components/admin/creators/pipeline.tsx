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
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useRouter } from 'next/navigation'
import { useState, useOptimistic, useTransition } from 'react'

import { CreatorCard, SortableCreatorCard } from './creator-card'

import type { Creator, CreatorStatus } from '@/lib/creators/types'


interface PipelineProps {
  stages: Record<CreatorStatus, Creator[]>
}

const STAGE_CONFIG: Array<{ id: CreatorStatus; label: string; color: string }> = [
  { id: 'applied', label: 'Applied', color: 'border-yellow-500' },
  { id: 'reviewing', label: 'Reviewing', color: 'border-blue-500' },
  { id: 'approved', label: 'Approved', color: 'border-green-500' },
  { id: 'onboarding', label: 'Onboarding', color: 'border-purple-500' },
  { id: 'active', label: 'Active', color: 'border-emerald-500' },
]

export function Pipeline({ stages: initialStages }: PipelineProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeCreator, setActiveCreator] = useState<Creator | null>(null)
  const [optimisticStages, updateOptimisticStages] = useOptimistic(
    initialStages,
    (current, update: { creatorId: string; from: CreatorStatus; to: CreatorStatus }) => {
      const creator = current[update.from].find((c) => c.id === update.creatorId)
      if (!creator) return current

      return {
        ...current,
        [update.from]: current[update.from].filter((c) => c.id !== update.creatorId),
        [update.to]: [...current[update.to], { ...creator, status: update.to }],
      }
    },
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  )

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const creatorId = active.id as string

    for (const stage of STAGE_CONFIG) {
      const creator = optimisticStages[stage.id].find((c) => c.id === creatorId)
      if (creator) {
        setActiveCreator(creator)
        break
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCreator(null)

    if (!over) return

    const creatorId = active.id as string
    const targetStage = over.id as CreatorStatus

    let sourceStage: CreatorStatus | null = null
    for (const stage of STAGE_CONFIG) {
      if (optimisticStages[stage.id].some((c) => c.id === creatorId)) {
        sourceStage = stage.id
        break
      }
    }

    if (!sourceStage || sourceStage === targetStage) return

    startTransition(async () => {
      updateOptimisticStages({ creatorId, from: sourceStage, to: targetStage })

      try {
        const response = await fetch(`/api/admin/creators/${creatorId}/stage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: targetStage }),
        })

        if (!response.ok) {
          throw new Error('Failed to update stage')
        }

        router.refresh()
      } catch {
        router.refresh()
      }
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGE_CONFIG.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            creators={optimisticStages[stage.id]}
            isPending={isPending}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCreator ? <CreatorCard creator={activeCreator} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function StageColumn({
  stage,
  creators,
  isPending,
}: {
  stage: { id: CreatorStatus; label: string; color: string }
  creators: Creator[]
  isPending: boolean
}) {
  return (
    <div
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border-t-4 bg-muted/30',
        stage.color,
        isPending && 'opacity-70',
      )}
    >
      <div className="flex items-center justify-between p-3">
        <h3 className="font-semibold">{stage.label}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {creators.length}
        </span>
      </div>
      <SortableContext
        id={stage.id}
        items={creators.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="min-h-[200px] flex-1 space-y-2 p-2"
          data-stage={stage.id}
        >
          {creators.map((creator) => (
            <SortableCreatorCard key={creator.id} creator={creator} />
          ))}
          {creators.length === 0 && (
            <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
