'use client'

import { Badge, Button, Card, CardContent, cn } from '@cgk/ui'
import { Edit2, Eye, MoreHorizontal, Trash2 } from 'lucide-react'
import Link from 'next/link'

import type { CreatorEmailTemplate, TemplateCategory } from '@/lib/creator-communications/types'

interface TemplateGridProps {
  templates: CreatorEmailTemplate[]
}

export function TemplateGrid({ templates }: TemplateGridProps) {
  const getCategoryColor = (category: TemplateCategory) => {
    const colors: Record<TemplateCategory, string> = {
      onboarding: 'bg-blue-100 text-blue-700',
      projects: 'bg-purple-100 text-purple-700',
      payments: 'bg-emerald-100 text-emerald-700',
      esign: 'bg-amber-100 text-amber-700',
      general: 'bg-slate-100 text-slate-700',
    }
    return colors[category]
  }

  // Group by category
  const grouped = templates.reduce(
    (acc, template) => {
      const cat = template.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(template)
      return acc
    },
    {} as Record<TemplateCategory, CreatorEmailTemplate[]>,
  )

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([category, categoryTemplates]) => (
        <div key={category}>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {category}
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categoryTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                categoryColor={getCategoryColor(template.category)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TemplateCard({
  template,
  categoryColor,
}: {
  template: CreatorEmailTemplate
  categoryColor: string
}) {
  return (
    <Card className="group relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate font-medium">{template.name}</h4>
              {template.is_default && (
                <Badge variant="outline" className="text-xs">
                  Default
                </Badge>
              )}
            </div>
            <span
              className={cn(
                'mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                categoryColor,
              )}
            >
              {template.category}
            </span>
          </div>

          {!template.is_enabled && (
            <Badge variant="secondary" className="shrink-0">
              Disabled
            </Badge>
          )}
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {template.description || template.subject}
        </p>

        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <div className="text-xs text-muted-foreground">
            v{template.version}
            {template.last_edited_at && (
              <span>
                {' - '}
                {new Date(template.last_edited_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/admin/creators/communications/templates/${template.id}/preview`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/admin/creators/communications/templates/${template.id}`}>
                <Edit2 className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
