'use client'

import { cn } from '@cgk-platform/ui'
import { Circle, CircleDot, ExternalLink, Mail } from 'lucide-react'
import Link from 'next/link'

export interface TemplateRowProps {
  template: {
    notificationType: string
    templateKey: string
    displayName: string
    description: string | null
    isCustom: boolean
    lastEditedAt: Date | null
    lastEditedByName: string | null
    sendCount30d: number
  }
  editorPath: string
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never edited'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

export function TemplateRow({ template, editorPath }: TemplateRowProps) {
  // Build editor URL with template type
  const templateEditorUrl = `${editorPath}?template=${template.notificationType}`

  return (
    <Link
      href={templateEditorUrl}
      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Status indicator */}
        <div
          className={cn(
            'flex-shrink-0',
            template.isCustom ? 'text-primary' : 'text-muted-foreground'
          )}
          title={template.isCustom ? 'Custom template' : 'Using default'}
        >
          {template.isCustom ? (
            <CircleDot className="h-3 w-3" />
          ) : (
            <Circle className="h-3 w-3" />
          )}
        </div>

        {/* Template info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {template.displayName}
            </span>
            {template.sendCount30d > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                {template.sendCount30d.toLocaleString()}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {template.notificationType}
            {template.templateKey !== template.notificationType && (
              <span>.{template.templateKey}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: status and date */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right">
          <div
            className={cn(
              'text-xs font-medium',
              template.isCustom ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {template.isCustom ? 'Custom' : 'Default'}
          </div>
          <div className="text-xs text-muted-foreground">
            {template.isCustom
              ? formatRelativeTime(template.lastEditedAt)
              : 'Never edited'}
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}
