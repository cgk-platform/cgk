'use client'

import { cn } from '@cgk/ui'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Copy } from 'lucide-react'

import { BLOCK_CATEGORIES, type Block, type BlockType } from '@/lib/landing-pages/types'

interface BlockEditorProps {
  blocks: Block[]
  selectedBlockId: string | null
  onSelect: (id: string | null) => void
  onRemove: (id: string) => void
  onReorder: (blocks: Block[]) => void
}

export function BlockEditor({
  blocks,
  selectedBlockId,
  onSelect,
  onRemove,
  onReorder,
}: BlockEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id)
      const newIndex = blocks.findIndex((b) => b.id === over.id)
      onReorder(arrayMove(blocks, oldIndex, newIndex))
    }
  }

  if (blocks.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed bg-muted/20 p-8 text-center">
        <div>
          <p className="text-lg font-medium">No blocks yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add blocks from the palette on the left to build your page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {blocks.map((block) => (
            <SortableBlock
              key={block.id}
              block={block}
              isSelected={selectedBlockId === block.id}
              onSelect={() => onSelect(block.id)}
              onRemove={() => onRemove(block.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

interface SortableBlockProps {
  block: Block
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
}

function SortableBlock({ block, isSelected, onSelect, onRemove }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const blockLabel = getBlockLabel(block.type)
  const blockCategory = getBlockCategory(block.type)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-lg border bg-background transition-all',
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50',
        isDragging && 'opacity-50',
      )}
    >
      {/* Block Header */}
      <div
        className={cn(
          'flex items-center gap-2 border-b px-3 py-2',
          isSelected && 'bg-primary/5',
        )}
      >
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          className="flex flex-1 items-center gap-2 text-left text-sm"
          onClick={onSelect}
        >
          <span className="font-medium">{blockLabel}</span>
          <span className="text-xs text-muted-foreground">({blockCategory})</span>
        </button>

        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            className="rounded p-1 text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Block Preview */}
      <div className="p-4" onClick={onSelect}>
        <BlockPreview block={block} />
      </div>
    </div>
  )
}

function BlockPreview({ block }: { block: Block }) {
  // Simple preview based on block type
  const previewContent = getBlockPreviewContent(block)

  return (
    <div className="rounded bg-muted/30 p-4 text-center text-sm text-muted-foreground">
      {previewContent}
    </div>
  )
}

function getBlockLabel(type: BlockType): string {
  return type
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getBlockCategory(type: BlockType): string {
  for (const category of BLOCK_CATEGORIES) {
    if (category.types.includes(type)) {
      return category.name
    }
  }
  return 'Other'
}

function getBlockPreviewContent(block: Block): string {
  const { type, config } = block

  // Check for common config properties that might have content
  if (config.title && typeof config.title === 'string') return `Title: ${config.title}`
  if (config.heading && typeof config.heading === 'string') return `Heading: ${config.heading}`
  if (config.text && typeof config.text === 'string') return config.text.substring(0, 100) + (config.text.length > 100 ? '...' : '')
  if (config.content && typeof config.content === 'string') return config.content.substring(0, 100) + (config.content.length > 100 ? '...' : '')

  // Default preview messages by type
  const previews: Partial<Record<BlockType, string>> = {
    'hero': 'Hero section with headline and CTA',
    'pdp-hero': 'Product hero with images and add to cart',
    'benefits': 'Benefits/features grid',
    'reviews': 'Customer reviews carousel',
    'cta-banner': 'Call-to-action banner',
    'faq-accordion': 'FAQ accordion',
    'testimonials': 'Customer testimonials',
    'product-grid': 'Product collection grid',
    'image': 'Image block',
    'video': 'Video embed',
    'markdown': 'Rich text content',
    'spacer': 'Vertical spacing',
    'divider': 'Horizontal divider',
  }

  return previews[type] || `${getBlockLabel(type)} block`
}
