'use client'

import { Card, CardContent, Input, Label, Textarea } from '@cgk/ui'

import type { LandingPage } from '@/lib/landing-pages/types'

interface SEOEditorProps {
  page: LandingPage
  onUpdate: (updates: Partial<LandingPage>) => void
}

export function SEOEditor({ page, onUpdate }: SEOEditorProps) {
  const metaTitle = page.meta_title || page.title
  const metaDescription = page.meta_description || ''

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">SEO Settings</h3>
        <p className="text-sm text-muted-foreground">
          Optimize how this page appears in search results
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="meta-title">Meta Title</Label>
        <Input
          id="meta-title"
          value={page.meta_title || ''}
          onChange={(e) => onUpdate({ meta_title: e.target.value })}
          placeholder={page.title}
        />
        <p className="text-xs text-muted-foreground">
          {metaTitle.length}/60 characters
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="meta-description">Meta Description</Label>
        <Textarea
          id="meta-description"
          value={page.meta_description || ''}
          onChange={(e) => onUpdate({ meta_description: e.target.value })}
          placeholder="Brief description for search engines..."
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          {metaDescription.length}/160 characters
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="og-image">Open Graph Image</Label>
        <Input
          id="og-image"
          value={page.og_image_url || ''}
          onChange={(e) => onUpdate({ og_image_url: e.target.value })}
          placeholder="https://..."
        />
        <p className="text-xs text-muted-foreground">
          Recommended: 1200x630 pixels
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="canonical">Canonical URL</Label>
        <Input
          id="canonical"
          value={page.canonical_url || ''}
          onChange={(e) => onUpdate({ canonical_url: e.target.value })}
          placeholder="https://example.com/page"
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to use page URL
        </p>
      </div>

      {/* Search Preview */}
      <Card>
        <CardContent className="pt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Search Preview
          </p>
          <div className="space-y-1">
            <p className="text-lg text-blue-600">{metaTitle || 'Page Title'}</p>
            <p className="text-sm text-green-700">
              example.com/{page.slug}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {metaDescription || 'No description provided. Search engines will generate a snippet from the page content.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Open Graph Preview */}
      <Card>
        <CardContent className="pt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Social Preview
          </p>
          <div className="overflow-hidden rounded-md border">
            {page.og_image_url ? (
              <img
                src={page.og_image_url}
                alt="OG Preview"
                className="aspect-[1200/630] w-full bg-muted object-cover"
              />
            ) : (
              <div className="flex aspect-[1200/630] items-center justify-center bg-muted text-sm text-muted-foreground">
                No image set
              </div>
            )}
            <div className="p-3">
              <p className="text-xs text-muted-foreground">example.com</p>
              <p className="font-medium">{metaTitle || 'Page Title'}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {metaDescription || 'No description'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
