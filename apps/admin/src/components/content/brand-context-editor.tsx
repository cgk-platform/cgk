'use client'

import { Button, Card, CardContent, CardHeader, Input, Label } from '@cgk/ui'
import { Save, ArrowLeft, History, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { MarkdownEditor } from './markdown-editor'

import {
  DOCUMENT_CATEGORIES,
  type BrandContextDocument,
  type DocumentCategory,
  type DocumentVersion,
} from '@/lib/brand-context/types'
import { formatDateTime } from '@/lib/format'

interface BrandContextEditorProps {
  document: BrandContextDocument
  versions: DocumentVersion[]
}

export function BrandContextEditor({ document: initialDoc, versions }: BrandContextEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showVersions, setShowVersions] = useState(false)

  const [doc] = useState(initialDoc)
  const [title, setTitle] = useState(doc.title)
  const [slug, setSlug] = useState(doc.slug)
  const [category, setCategory] = useState<DocumentCategory>(doc.category)
  const [content, setContent] = useState(doc.content)
  const [tags, setTags] = useState(doc.tags?.join(', ') || '')
  const [isActive, setIsActive] = useState(doc.is_active)

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const tagsArray = tags.split(',').map((t) => t.trim()).filter(Boolean)

    try {
      const res = await fetch('/api/admin/brand-context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: doc.id,
          title,
          slug,
          category,
          content,
          tags: tagsArray,
          is_active: isActive,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save document')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document')
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreVersion = async (version: number) => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/brand-context?restore_version=${version}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to restore version')
      }

      const { document: restoredDoc } = await res.json()
      setContent(restoredDoc.content)
      setShowVersions(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore version')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/brand-context">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{doc.title}</h1>
          <span className="text-sm text-muted-foreground">v{doc.version}</span>
        </div>
        <div className="flex gap-2">
          {versions.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowVersions(!showVersions)}>
              <History className="mr-2 h-4 w-4" />
              History ({versions.length})
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={showVersions ? '' : 'lg:col-span-2'}>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Document title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="document-slug"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                <MarkdownEditor value={content} onChange={setContent} minHeight="400px" />
              </div>
            </CardContent>
          </Card>
        </div>

        {showVersions ? (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Version History</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium">Version {v.version}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(v.created_at)}
                          {v.created_by_name && ` by ${v.created_by_name}`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreVersion(v.version)}
                        disabled={saving}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Settings</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                >
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border"
                />
                <Label htmlFor="active" className="font-normal">
                  Active (visible to AI)
                </Label>
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="text-muted-foreground">
                  Created {formatDateTime(doc.created_at)}
                </p>
                <p className="text-muted-foreground">
                  Updated {formatDateTime(doc.updated_at)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
