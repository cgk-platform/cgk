'use client'

import { cn } from '@cgk/ui'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

import type { Creator } from '@/lib/creators/types'
import { formatDate } from '@/lib/format'

interface CreatorCardProps {
  creator: Creator
  isDragging?: boolean
}

export function CreatorCard({ creator, isDragging }: CreatorCardProps) {
  const name = creator.display_name || `${creator.first_name} ${creator.last_name}`
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border bg-card p-3 shadow-sm',
        isDragging && 'opacity-50',
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
        {creator.avatar_url ? (
          <img
            src={creator.avatar_url}
            alt={name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{creator.email}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Applied {formatDate(creator.applied_at)}
        </div>
      </div>
    </div>
  )
}

export function SortableCreatorCard({ creator }: { creator: Creator }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: creator.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const name = creator.display_name || `${creator.first_name} ${creator.last_name}`
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-2 rounded-lg border bg-card p-3 shadow-sm',
        isDragging && 'z-50 shadow-lg',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
        {creator.avatar_url ? (
          <img
            src={creator.avatar_url}
            alt={name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div className="min-w-0 flex-1">
        <a
          href={`/admin/creators/${creator.id}`}
          className="truncate font-medium hover:underline"
        >
          {name}
        </a>
        <div className="truncate text-xs text-muted-foreground">{creator.email}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Applied {formatDate(creator.applied_at)}
        </div>
      </div>
    </div>
  )
}
