'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react'
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cgk-platform/ui'

interface Article {
  id: string
  title: string
  content: string
  excerpt: string | null
  categoryId: string | null
  tags: string[]
  isPublished: boolean
  isInternal: boolean
  viewCount: number
  helpfulCount: number
  notHelpfulCount: number
  updatedAt: string
}

interface Category {
  id: string
  name: string
}

export default function ArticleEditorPage() {
  const params = useParams()
  const router = useRouter()
  const articleId = params.id as string
  const isNew = articleId === 'new'

  const [article, setArticle] = useState<Partial<Article>>({
    title: '',
    content: '',
    excerpt: '',
    categoryId: null,
    tags: [],
    isPublished: false,
    isInternal: false,
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    loadCategories()
    if (!isNew) {
      loadArticle()
    }
  }, [articleId])

  async function loadCategories() {
    try {
      const res = await fetch('/api/admin/knowledge-base/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch {
      // Ignore
    }
  }

  async function loadArticle() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/knowledge-base/articles/${articleId}`)
      if (!res.ok) throw new Error('Article not found')
      const data = await res.json()
      setArticle(data.article)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load article')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const url = isNew
        ? '/api/admin/knowledge-base/articles'
        : `/api/admin/knowledge-base/articles/${articleId}`

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          categoryId: article.categoryId,
          tags: article.tags,
          isPublished: article.isPublished,
          isInternal: article.isInternal,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      const data = await res.json()
      if (isNew && data.article?.id) {
        router.replace(`/admin/knowledge-base/articles/${data.article.id}`)
      }

      setSuccess('Article saved successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePublish() {
    const newState = !article.isPublished
    setArticle((prev) => ({ ...prev, isPublished: newState }))

    if (!isNew) {
      try {
        await fetch(`/api/admin/knowledge-base/articles/${articleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublished: newState }),
        })
        setSuccess(newState ? 'Article published' : 'Article unpublished')
        setTimeout(() => setSuccess(null), 3000)
      } catch {
        setArticle((prev) => ({ ...prev, isPublished: !newState }))
      }
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this article? This cannot be undone.')) return

    try {
      await fetch(`/api/admin/knowledge-base/articles/${articleId}`, { method: 'DELETE' })
      router.push('/admin/knowledge-base')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !article.tags?.includes(tag)) {
      setArticle((prev) => ({ ...prev, tags: [...(prev.tags || []), tag] }))
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setArticle((prev) => ({ ...prev, tags: (prev.tags || []).filter((t) => t !== tag) }))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/knowledge-base')}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isNew ? 'New Article' : 'Edit Article'}
            </h1>
            {article.viewCount !== undefined && !isNew && (
              <p className="text-sm text-muted-foreground">
                {article.viewCount} views · {article.helpfulCount || 0} helpful · Updated{' '}
                {article.updatedAt
                  ? new Date(article.updatedAt).toLocaleDateString()
                  : 'never'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePublish}
              >
                {article.isPublished ? (
                  <>
                    <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Publish
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-rose-600 hover:text-rose-700"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            </>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <Check className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
        {/* Main content */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Title *</label>
                <input
                  type="text"
                  value={article.title || ''}
                  onChange={(e) => setArticle((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Article title"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Excerpt</label>
                <input
                  type="text"
                  value={article.excerpt || ''}
                  onChange={(e) => setArticle((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Short summary shown in search results"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Content *</label>
                <textarea
                  value={article.content || ''}
                  onChange={(e) => setArticle((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your article content here (Markdown supported)..."
                  rows={20}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-center justify-between">
                <span className="text-sm">Visibility</span>
                <Badge variant={article.isPublished ? 'default' : 'outline'}>
                  {article.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Internal only</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={article.isInternal || false}
                    onChange={(e) =>
                      setArticle((prev) => ({ ...prev, isInternal: e.target.checked }))
                    }
                    className="peer sr-only"
                  />
                  <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-4" />
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Category</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <select
                value={article.categoryId || ''}
                onChange={(e) =>
                  setArticle((prev) => ({ ...prev, categoryId: e.target.value || null }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  placeholder="Add tag..."
                  className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button size="sm" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
              {(article.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(article.tags || []).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => removeTag(tag)}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                    >
                      {tag}
                      <span className="text-xs">×</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
