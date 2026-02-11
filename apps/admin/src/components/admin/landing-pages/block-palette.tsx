'use client'

import { Input } from '@cgk/ui'
import {
  Layout,
  Type,
  Image,
  Video,
  Star,
  MessageSquare,
  ShoppingCart,
  Beaker,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { useState } from 'react'

import { BLOCK_CATEGORIES, type BlockType } from '@/lib/landing-pages/types'

interface BlockPaletteProps {
  onAddBlock: (type: BlockType) => void
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  pdp: ShoppingCart,
  promo: Star,
  core: Layout,
  content: Type,
  social: MessageSquare,
  commerce: ShoppingCart,
  interactive: Beaker,
  faq: MessageSquare,
  custom: Settings,
}

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  const [search, setSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['core', 'content']),
  )

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const filteredCategories = BLOCK_CATEGORIES.map((category) => ({
    ...category,
    types: category.types.filter((type) =>
      type.toLowerCase().includes(search.toLowerCase()) ||
      getBlockLabel(type).toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((category) => category.types.length > 0)

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search blocks..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9"
      />

      <div className="space-y-2">
        {filteredCategories.map((category) => {
          const Icon = CATEGORY_ICONS[category.id] || Layout
          const isExpanded = expandedCategories.has(category.id) || search.length > 0

          return (
            <div key={category.id} className="rounded-lg border">
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/50"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Icon className="h-4 w-4" />
                <span className="flex-1">{category.name}</span>
                <span className="text-xs text-muted-foreground">{category.types.length}</span>
              </button>

              {isExpanded && (
                <div className="border-t px-2 py-2">
                  <div className="grid gap-1">
                    {category.types.map((type) => (
                      <BlockTypeButton
                        key={type}
                        type={type}
                        onClick={() => onAddBlock(type)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredCategories.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No blocks match your search.
        </p>
      )}
    </div>
  )
}

function BlockTypeButton({
  type,
  onClick,
}: {
  type: BlockType
  onClick: () => void
}) {
  const label = getBlockLabel(type)
  const icon = getBlockIcon(type)

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100" />
    </button>
  )
}

function getBlockLabel(type: BlockType): string {
  return type
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getBlockIcon(type: BlockType): React.ReactNode {
  const iconClass = 'h-4 w-4 text-muted-foreground'

  if (type.startsWith('pdp-')) return <ShoppingCart className={iconClass} />
  if (type.includes('image')) return <Image className={iconClass} />
  if (type.includes('video')) return <Video className={iconClass} />
  if (type.includes('review') || type.includes('testimonial')) return <Star className={iconClass} />
  if (type.includes('faq')) return <MessageSquare className={iconClass} />
  if (type.includes('product') || type.includes('cart')) return <ShoppingCart className={iconClass} />

  return <Layout className={iconClass} />
}
