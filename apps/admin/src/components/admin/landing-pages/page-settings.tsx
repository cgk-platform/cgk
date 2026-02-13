'use client'

import { Input, Label, Textarea } from '@cgk-platform/ui'

import type { LandingPage, PageStatus } from '@/lib/landing-pages/types'

interface PageSettingsProps {
  page: LandingPage
  onUpdate: (updates: Partial<LandingPage>) => void
}

export function PageSettings({ page, onUpdate }: PageSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="page-title">Title</Label>
        <Input
          id="page-title"
          value={page.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Page title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="page-slug">URL Slug</Label>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">/</span>
          <Input
            id="page-slug"
            value={page.slug}
            onChange={(e) => onUpdate({ slug: e.target.value })}
            placeholder="page-url"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="page-description">Description</Label>
        <Textarea
          id="page-description"
          value={page.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Internal description..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="page-status">Status</Label>
        <select
          id="page-status"
          value={page.status}
          onChange={(e) => onUpdate({ status: e.target.value as PageStatus })}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {page.status === 'scheduled' && (
        <div className="space-y-2">
          <Label htmlFor="page-scheduled">Scheduled For</Label>
          <Input
            id="page-scheduled"
            type="datetime-local"
            value={page.scheduled_at?.slice(0, 16) || ''}
            onChange={(e) => onUpdate({ scheduled_at: e.target.value })}
          />
        </div>
      )}

      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          {page.published_at
            ? `Published on ${new Date(page.published_at).toLocaleDateString()}`
            : 'Not yet published'}
        </p>
        <p className="text-xs text-muted-foreground">
          Last updated {new Date(page.updated_at).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
