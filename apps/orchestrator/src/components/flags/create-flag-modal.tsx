'use client'

import { isValidFlagKey, type FlagType } from '@cgk-platform/feature-flags'
import { Button, Card, CardContent, CardHeader, Input, Label, Select, SelectOption, Textarea } from '@cgk-platform/ui'
import { useState } from 'react'

interface CreateFlagModalProps {
  onClose: () => void
  onCreated: () => void
}

export function CreateFlagModal({ onClose, onCreated }: CreateFlagModalProps) {
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<FlagType>('boolean')
  const [category, setCategory] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate key
    if (!isValidFlagKey(key)) {
      setError('Invalid flag key. Must start with a letter and contain only lowercase letters, numbers, dots, and underscores.')
      return
    }

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/platform/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          name,
          description: description || undefined,
          type,
          defaultValue: type === 'boolean' ? false : (type === 'variant' ? 'control' : false),
          category: category || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create flag')
      }

      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Create Feature Flag</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="key">Flag Key</Label>
              <Input
                id="key"
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase())}
                placeholder="category.feature_name"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lowercase letters, numbers, dots, and underscores only
              </p>
            </div>

            <div>
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Feature Flag"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this flag control?"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as FlagType)}
              >
                <SelectOption value="boolean">Boolean (On/Off)</SelectOption>
                <SelectOption value="percentage">Percentage (Gradual Rollout)</SelectOption>
                <SelectOption value="tenant_list">Tenant List</SelectOption>
                <SelectOption value="user_list">User List</SelectOption>
                <SelectOption value="schedule">Schedule (Time-based)</SelectOption>
                <SelectOption value="variant">Variant (A/B Test)</SelectOption>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <SelectOption value="">No Category</SelectOption>
                <SelectOption value="platform">Platform</SelectOption>
                <SelectOption value="checkout">Checkout</SelectOption>
                <SelectOption value="payments">Payments</SelectOption>
                <SelectOption value="mcp">MCP</SelectOption>
                <SelectOption value="ai">AI</SelectOption>
                <SelectOption value="creators">Creators</SelectOption>
                <SelectOption value="admin">Admin</SelectOption>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Flag'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
