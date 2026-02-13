'use client'

import { Button, Input, Label, Textarea } from '@cgk-platform/ui'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { BlogCategory } from '@/lib/blog/types'

interface CategoryFormProps {
  categories: BlogCategory[]
  category?: BlogCategory
  onComplete?: () => void
}

export function CategoryForm({ categories, category, onComplete }: CategoryFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(category?.name || '')
  const [slug, setSlug] = useState(category?.slug || '')
  const [description, setDescription] = useState(category?.description || '')
  const [parentId, setParentId] = useState(category?.parent_id || '')

  const isEditing = Boolean(category)

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleNameChange = (value: string) => {
    setName(value)
    if (!isEditing && !slug) {
      setSlug(generateSlug(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const body = {
      id: category?.id,
      name,
      slug,
      description: description || undefined,
      parent_id: parentId || undefined,
    }

    try {
      const res = await fetch('/api/admin/blog/categories', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save category')
      }

      if (onComplete) {
        onComplete()
      } else {
        router.refresh()
        // Reset form if creating
        if (!isEditing) {
          setName('')
          setSlug('')
          setDescription('')
          setParentId('')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  // Filter out current category from parent options to prevent circular reference
  const parentOptions = categories.filter((c) => c.id !== category?.id)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="cat-name">Name</Label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Category name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cat-slug">Slug</Label>
        <Input
          id="cat-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="category-slug"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cat-description">Description</Label>
        <Textarea
          id="cat-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={3}
        />
      </div>

      {parentOptions.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="cat-parent">Parent Category</Label>
          <select
            id="cat-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2"
          >
            <option value="">None (top level)</option>
            {parentOptions.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      )}

      <Button type="submit" disabled={saving || !name || !slug}>
        <Plus className="mr-2 h-4 w-4" />
        {saving ? 'Saving...' : isEditing ? 'Update Category' : 'Add Category'}
      </Button>
    </form>
  )
}
