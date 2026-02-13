'use client'

import { Button, Card, CardContent, CardHeader, Input, Label, Textarea } from '@cgk-platform/ui'
import { Save, Eye, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { MarkdownEditor } from './markdown-editor'

import type { BlogPost, BlogCategory, BlogAuthor, PostStatus } from '@/lib/blog/types'

interface PostEditorProps {
  post?: BlogPost
  categories: BlogCategory[]
  authors: BlogAuthor[]
  mode: 'create' | 'edit'
}

export function PostEditor({ post, categories, authors, mode }: PostEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(post?.title || '')
  const [slug, setSlug] = useState(post?.slug || '')
  const [excerpt, setExcerpt] = useState(post?.excerpt || '')
  const [content, setContent] = useState(post?.content || '')
  const [status, setStatus] = useState<PostStatus>(post?.status || 'draft')
  const [authorId, setAuthorId] = useState(post?.author_id || '')
  const [categoryId, setCategoryId] = useState(post?.category_id || '')
  const [featuredImageUrl, setFeaturedImageUrl] = useState(post?.featured_image_url || '')
  const [tags, setTags] = useState(post?.tags?.join(', ') || '')
  const [metaTitle, setMetaTitle] = useState(post?.meta_title || '')
  const [metaDescription, setMetaDescription] = useState(post?.meta_description || '')

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (mode === 'create' && !slug) {
      setSlug(generateSlug(value))
    }
  }

  const handleSave = async (publishNow?: boolean) => {
    setSaving(true)
    setError(null)

    const finalStatus = publishNow ? 'published' : status
    const tagsArray = tags.split(',').map((t) => t.trim()).filter(Boolean)

    const body = {
      title,
      slug,
      excerpt: excerpt || undefined,
      content,
      status: finalStatus,
      author_id: authorId || undefined,
      category_id: categoryId || undefined,
      featured_image_url: featuredImageUrl || undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      meta_title: metaTitle || undefined,
      meta_description: metaDescription || undefined,
    }

    try {
      const url = mode === 'create' ? '/api/admin/blog/posts' : `/api/admin/blog/posts/${post?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save post')
      }

      router.push('/admin/blog')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter post title..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="post-url-slug"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief description of the post..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <MarkdownEditor value={content} onChange={setContent} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">SEO</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meta-title">Meta Title</Label>
              <Input
                id="meta-title"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="SEO title (defaults to post title)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta-description">Meta Description</Label>
              <Textarea
                id="meta-description"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="SEO description for search engines..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {metaDescription.length}/160 characters
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Publish</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as PostStatus)}
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={() => handleSave()} disabled={saving || !title || !slug || !content}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              {status === 'draft' && (
                <Button variant="outline" onClick={() => handleSave(true)} disabled={saving || !title || !slug || !content}>
                  <Eye className="mr-2 h-4 w-4" />
                  Publish Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold">Settings</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <select
                id="author"
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                <option value="">Select author...</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>{author.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                <option value="">Select category...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="featured-image">Featured Image URL</Label>
              <Input
                id="featured-image"
                value={featuredImageUrl}
                onChange={(e) => setFeaturedImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
              />
              <p className="text-xs text-muted-foreground">Separate tags with commas</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
