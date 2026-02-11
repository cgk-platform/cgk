'use client'

import { cn } from '@cgk/ui'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { TemplateRow } from './template-row'

export interface TemplateInfo {
  notificationType: string
  templateKey: string
  displayName: string
  description: string | null
  isCustom: boolean
  lastEditedAt: Date | null
  lastEditedBy: string | null
  lastEditedByName: string | null
  sendCount30d: number
}

export interface TemplateCategoryCardProps {
  category: {
    name: string
    slug: string
    editorPath: string
    description: string
    templates: TemplateInfo[]
  }
  collapsed?: boolean
  showMax?: number
}

export function TemplateCategoryCard({
  category,
  collapsed: initialCollapsed = false,
  showMax = 4,
}: TemplateCategoryCardProps) {
  const [expanded, setExpanded] = useState(!initialCollapsed)

  const visibleTemplates = expanded
    ? category.templates
    : category.templates.slice(0, showMax)
  const hasMore = category.templates.length > showMax
  const customCount = category.templates.filter((t) => t.isCustom).length

  return (
    <div className="rounded-lg border bg-card">
      {/* Category Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <h3 className="font-semibold text-sm">
              {category.name}{' '}
              <span className="text-muted-foreground font-normal">
                ({category.templates.length})
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {category.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {customCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {customCount} customized
            </span>
          )}
          <Link
            href={category.editorPath}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Edit in settings
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </button>

      {/* Template List */}
      {expanded && (
        <div className="border-t">
          <div className="divide-y">
            {visibleTemplates.map((template) => (
              <TemplateRow
                key={`${template.notificationType}:${template.templateKey}`}
                template={template}
                editorPath={category.editorPath}
              />
            ))}
          </div>

          {/* View All Link */}
          {hasMore && !expanded && (
            <div className="p-3 border-t">
              <button
                onClick={() => setExpanded(true)}
                className="text-sm text-primary hover:underline"
              >
                View all {category.templates.length} templates
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Skeleton loader for template category card
 */
export function TemplateCategoryCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card animate-pulse">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 bg-muted rounded" />
          <div>
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-48 bg-muted rounded mt-1" />
          </div>
        </div>
      </div>
      <div className="border-t p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
