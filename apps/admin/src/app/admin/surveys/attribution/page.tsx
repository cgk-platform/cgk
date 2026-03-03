'use client'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@cgk-platform/ui'
import { Plus, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

import type { AttributionOption, AttributionCategory, CreateAttributionOptionInput } from '@/lib/surveys'
import { ATTRIBUTION_CATEGORY_LABELS } from '@/lib/surveys'

export default function AttributionOptionsPage() {
  const [options, setOptions] = useState<AttributionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  const fetchOptions = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/surveys/attribution-options?includeInactive=${showInactive}`,
      )
      const data = await response.json()
      if (response.ok) {
        setOptions(data.options)
      }
    } catch (error) {
      console.error('Failed to fetch options:', error)
    } finally {
      setLoading(false)
    }
  }, [showInactive])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  const handleCreate = async (input: CreateAttributionOptionInput) => {
    try {
      const response = await fetch('/api/admin/surveys/attribution-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (response.ok) {
        const data = await response.json()
        setOptions([...options, data.option])
        setShowNew(false)
      }
    } catch (error) {
      console.error('Failed to create option:', error)
    }
  }

  const handleUpdate = async (
    optionId: string,
    input: Partial<CreateAttributionOptionInput> & { is_active?: boolean },
  ) => {
    try {
      const response = await fetch(`/api/admin/surveys/attribution-options/${optionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (response.ok) {
        const data = await response.json()
        setOptions(options.map((o) => (o.id === optionId ? data.option : o)))
        setEditingId(null)
      }
    } catch (error) {
      console.error('Failed to update option:', error)
    }
  }

  const handleDelete = async (optionId: string) => {
    if (!confirm('Are you sure you want to delete this option?')) return

    try {
      const response = await fetch(`/api/admin/surveys/attribution-options/${optionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setOptions(options.filter((o) => o.id !== optionId))
      }
    } catch (error) {
      console.error('Failed to delete option:', error)
    }
  }

  const handleToggleActive = async (option: AttributionOption) => {
    await handleUpdate(option.id, { is_active: !option.is_active })
  }

  // Group options by category
  const groupedOptions = options.reduce(
    (acc, opt) => {
      const cat = opt.category || 'other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(opt)
      return acc
    },
    {} as Record<string, AttributionOption[]>,
  )

  if (loading) {
    return <AttributionSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attribution Options</h1>
          <p className="text-muted-foreground">
            Manage the "How did you hear about us?" options
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Show inactive
          </label>
          <Button onClick={() => setShowNew(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Option
          </Button>
        </div>
      </div>

      {showNew && (
        <OptionEditor
          onSave={handleCreate}
          onCancel={() => setShowNew(false)}
        />
      )}

      {Object.entries(groupedOptions).map(([category, categoryOptions]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {ATTRIBUTION_CATEGORY_LABELS[category as keyof typeof ATTRIBUTION_CATEGORY_LABELS] ||
                category}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoryOptions.map((option) =>
                editingId === option.id ? (
                  <OptionEditor
                    key={option.id}
                    option={option}
                    onSave={(input) => handleUpdate(option.id, input)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <OptionRow
                    key={option.id}
                    option={option}
                    onEdit={() => setEditingId(option.id)}
                    onToggleActive={() => handleToggleActive(option)}
                    onDelete={() => handleDelete(option.id)}
                  />
                ),
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {options.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-lg font-medium">No attribution options</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first attribution option to get started
            </p>
            <Button className="mt-4" onClick={() => setShowNew(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Option
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function OptionRow({
  option,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  option: AttributionOption
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${
        !option.is_active ? 'bg-muted/50 opacity-60' : ''
      }`}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />

      <span className="text-lg">{option.icon || '🔘'}</span>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{option.label}</span>
          {option.is_system && (
            <Badge variant="outline" className="text-xs">
              System
            </Badge>
          )}
          {!option.is_active && (
            <Badge variant="secondary" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{option.value}</p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleActive}
          title={option.is_active ? 'Hide from surveys' : 'Show in surveys'}
        >
          {option.is_active ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
        {!option.is_system && (
          <>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function OptionEditor({
  option,
  onSave,
  onCancel,
}: {
  option?: AttributionOption
  onSave: (input: CreateAttributionOptionInput) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    label: option?.label || '',
    value: option?.value || '',
    icon: option?.icon || '',
    category: option?.category || 'other',
  })

  const handleSave = () => {
    if (!formData.label.trim() || !formData.value.trim()) return
    onSave({
      label: formData.label,
      value: formData.value,
      icon: formData.icon || undefined,
      category: formData.category as CreateAttributionOptionInput['category'] | undefined,
    })
  }

  return (
    <div className="rounded-lg border border-primary p-4 space-y-3">
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Icon (emoji)</label>
          <input
            type="text"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            placeholder="📱"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Label</label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => {
              const label = e.target.value
              setFormData({
                ...formData,
                label,
                value: formData.value || label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
              })
            }}
            placeholder="TikTok"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Value (slug)</label>
          <input
            type="text"
            value={formData.value}
            onChange={(e) =>
              setFormData({
                ...formData,
                value: e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, ''),
              })
            }
            placeholder="tiktok"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as AttributionCategory })}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Object.entries(ATTRIBUTION_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!formData.label.trim() || !formData.value.trim()}
        >
          {option ? 'Save Changes' : 'Add Option'}
        </Button>
      </div>
    </div>
  )
}

function AttributionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded bg-muted" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-14 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
