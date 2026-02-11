'use client'

import { useState } from 'react'
import { Badge, Button, Card, CardContent, CardHeader, Input, Textarea } from '@cgk/ui'
import {
  Lightbulb,
  Plus,
  Search,
  Star,
  TrendingUp,
  X,
  Save,
} from 'lucide-react'

import type { CreativeIdea, CreativeIdeaType, CreativeIdeaStatus } from '@/lib/bri/types'

interface CreativeIdeasViewProps {
  tenantSlug: string
  initialIdeas: CreativeIdea[]
}

const IDEA_TYPES: { value: CreativeIdeaType; label: string }[] = [
  { value: 'ad_concept', label: 'Ad Concept' },
  { value: 'script', label: 'Script' },
  { value: 'hook', label: 'Hook' },
  { value: 'angle', label: 'Angle' },
  { value: 'cta', label: 'CTA' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'trend', label: 'Trend' },
  { value: 'inspiration', label: 'Inspiration' },
]

const IDEA_STATUSES: { value: CreativeIdeaStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'in_use', label: 'In Use' },
  { value: 'proven', label: 'Proven' },
  { value: 'archived', label: 'Archived' },
  { value: 'rejected', label: 'Rejected' },
]

const STATUS_COLORS: Record<CreativeIdeaStatus, 'secondary' | 'info' | 'warning' | 'success' | 'destructive'> = {
  draft: 'secondary',
  ready: 'info',
  in_use: 'warning',
  proven: 'success',
  archived: 'secondary',
  rejected: 'destructive',
}

export function CreativeIdeasView({ initialIdeas }: CreativeIdeasViewProps) {
  const [ideas, setIdeas] = useState(initialIdeas)
  const [selectedIdea, setSelectedIdea] = useState<CreativeIdea | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Form state
  const [formData, setFormData] = useState<Partial<CreativeIdea>>({})

  const filteredIdeas = ideas.filter((idea) => {
    if (searchQuery && !idea.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (typeFilter && idea.type !== typeFilter) return false
    if (statusFilter && idea.status !== statusFilter) return false
    return true
  })

  const startCreate = () => {
    setFormData({
      title: '',
      type: 'hook',
      status: 'draft',
      description: '',
      content: '',
      products: [],
      platforms: [],
      formats: [],
      tags: [],
      performanceScore: null,
      bestExample: '',
      notes: '',
    })
    setSelectedIdea(null)
    setIsCreating(true)
    setIsEditing(true)
  }

  const startEdit = (idea: CreativeIdea) => {
    setFormData(idea)
    setSelectedIdea(idea)
    setIsCreating(false)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setFormData({})
    setIsEditing(false)
    setIsCreating(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const url = isCreating
        ? '/api/admin/bri/creative-ideas'
        : `/api/admin/bri/creative-ideas/${selectedIdea?.id}`

      const response = await fetch(url, {
        method: isCreating ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        if (isCreating) {
          setIdeas([data.idea, ...ideas])
          setSelectedIdea(data.idea)
        } else {
          setIdeas(ideas.map((i) => (i.id === data.idea.id ? data.idea : i)))
          setSelectedIdea(data.idea)
        }
        setIsEditing(false)
        setIsCreating(false)
      }
    } catch (error) {
      console.error('Failed to save idea:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Creative Ideas</h1>
          <p className="text-sm text-muted-foreground">Manage content hooks, scripts, and concepts</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Idea
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ideas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="">All Types</option>
              {IDEA_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="">All Statuses</option>
              {IDEA_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Ideas List */}
        <div className="lg:col-span-1">
          <Card className="h-[calc(100vh-340px)] overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Ideas</h3>
                <span className="text-xs text-muted-foreground">{filteredIdeas.length} total</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto h-[calc(100%-60px)]">
              {filteredIdeas.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No ideas found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredIdeas.map((idea) => (
                    <button
                      key={idea.id}
                      onClick={() => {
                        setSelectedIdea(idea)
                        setIsEditing(false)
                        setIsCreating(false)
                      }}
                      className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                        selectedIdea?.id === idea.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{idea.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">
                              {IDEA_TYPES.find((t) => t.value === idea.type)?.label}
                            </Badge>
                            <Badge variant={STATUS_COLORS[idea.status]} className="text-[10px]">
                              {idea.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {idea.timesUsed}
                            </span>
                            {idea.performanceScore !== null && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {idea.performanceScore}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Idea Detail / Edit Form */}
        <div className="lg:col-span-2">
          {isEditing ? (
            <Card className="h-[calc(100vh-340px)] overflow-hidden flex flex-col">
              <CardHeader className="pb-3 border-b shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    {isCreating ? 'New Idea' : 'Edit Idea'}
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEdit}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Title *</label>
                    <Input
                      value={formData.title ?? ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter idea title"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Type</label>
                    <select
                      value={formData.type ?? 'hook'}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value as CreativeIdeaType })
                      }
                      className="mt-1 w-full px-3 py-2 border rounded-md bg-background text-sm"
                    >
                      {IDEA_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Status</label>
                    <select
                      value={formData.status ?? 'draft'}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as CreativeIdeaStatus })
                      }
                      className="mt-1 w-full px-3 py-2 border rounded-md bg-background text-sm"
                    >
                      {IDEA_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Description</label>
                    <Textarea
                      value={formData.description ?? ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description"
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Content</label>
                    <Textarea
                      value={formData.content ?? ''}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="The actual script, hook, or concept text"
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Products (comma-separated)</label>
                    <Input
                      value={formData.products?.join(', ') ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          products: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="product1, product2"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Platforms (comma-separated)</label>
                    <Input
                      value={formData.platforms?.join(', ') ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          platforms: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="tiktok, instagram"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Tags (comma-separated)</label>
                    <Input
                      value={formData.tags?.join(', ') ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="ugc, viral"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Performance Score (0-100)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.performanceScore ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          performanceScore: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      placeholder="0-100"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Notes</label>
                    <Textarea
                      value={formData.notes ?? ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Internal notes"
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : selectedIdea ? (
            <Card className="h-[calc(100vh-340px)] overflow-hidden flex flex-col">
              <CardHeader className="pb-3 border-b shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">{selectedIdea.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {IDEA_TYPES.find((t) => t.value === selectedIdea.type)?.label}
                      </Badge>
                      <Badge variant={STATUS_COLORS[selectedIdea.status]} className="text-[10px]">
                        {selectedIdea.status}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => startEdit(selectedIdea)}>
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 overflow-y-auto flex-1 space-y-4">
                {selectedIdea.description && (
                  <div>
                    <label className="text-xs text-muted-foreground">Description</label>
                    <p className="text-sm mt-1">{selectedIdea.description}</p>
                  </div>
                )}
                {selectedIdea.content && (
                  <div>
                    <label className="text-xs text-muted-foreground">Content</label>
                    <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                      {selectedIdea.content}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Times Used</label>
                    <p className="text-sm font-medium mt-1">{selectedIdea.timesUsed}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Performance Score</label>
                    <p className="text-sm font-medium mt-1">
                      {selectedIdea.performanceScore ?? 'N/A'}
                    </p>
                  </div>
                </div>
                {selectedIdea.products.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground">Products</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedIdea.products.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedIdea.platforms.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground">Platforms</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedIdea.platforms.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedIdea.tags.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground">Tags</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedIdea.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedIdea.notes && (
                  <div>
                    <label className="text-xs text-muted-foreground">Notes</label>
                    <p className="text-sm mt-1 text-muted-foreground">{selectedIdea.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[calc(100vh-340px)] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Select an idea to view details</p>
                <p className="text-xs mt-1">or create a new one</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
