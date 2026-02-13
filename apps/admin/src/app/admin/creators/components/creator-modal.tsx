'use client'

import { Button, Input, Label } from '@cgk-platform/ui'
import { X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

import type { CreatorProfile, CreatorStatus, CreatorTier } from '@/lib/creators/types'
import { CREATOR_STATUSES, CREATOR_TIERS } from '@/lib/creators/types'

interface CreatorModalProps {
  mode: 'create' | 'edit'
  creatorId?: string
  onClose: () => void
  onSuccess: () => void
}

export function CreatorModal({ mode, creatorId, onClose, onSuccess }: CreatorModalProps) {
  const [isLoading, setIsLoading] = useState(mode === 'edit')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [_showAddress, _setShowAddress] = useState(false)
  const [showSocial, setShowSocial] = useState(false)

  const [form, setForm] = useState<Partial<CreatorProfile>>({
    email: '',
    first_name: '',
    last_name: '',
    display_name: '',
    phone: '',
    bio: '',
    status: 'applied',
    tier: null,
    commission_percent: 10,
    discount_code: '',
    tags: [],
    internal_notes: '',
    social_links: {},
  })

  const [tagInput, setTagInput] = useState('')

  // Load existing creator data for edit mode
  useEffect(() => {
    if (mode === 'edit' && creatorId) {
      fetch(`/api/admin/creators/${creatorId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.creator) {
            const c = data.creator
            setForm({
              email: c.email || '',
              first_name: c.first_name || '',
              last_name: c.last_name || '',
              display_name: c.display_name || '',
              phone: c.phone || '',
              bio: c.bio || '',
              status: c.status || 'applied',
              tier: c.tier || null,
              commission_percent: c.commission_rate_pct || 10,
              discount_code: c.referral_code || '',
              tags: c.tags || [],
              internal_notes: c.notes || '',
              social_links: c.social_links || c.social_profiles || {},
            })
          }
        })
        .catch(() => setError('Failed to load creator'))
        .finally(() => setIsLoading(false))
    }
  }, [mode, creatorId])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setIsSaving(true)

      try {
        const url = mode === 'create' ? '/api/admin/creators' : `/api/admin/creators/${creatorId}`
        const method = mode === 'create' ? 'POST' : 'PATCH'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Something went wrong')
        }

        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setIsSaving(false)
      }
    },
    [mode, creatorId, form, onSuccess],
  )

  const addTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !form.tags?.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...(prev.tags || []), tag] }))
      setTagInput('')
    }
  }, [tagInput, form.tags])

  const removeTag = useCallback((tag: string) => {
    setForm((prev) => ({ ...prev, tags: (prev.tags || []).filter((t) => t !== tag) }))
  }, [])

  const updateSocialLink = useCallback((platform: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      social_links: { ...prev.social_links, [platform]: value },
    }))
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-20">
      <div className="relative w-full max-w-2xl rounded-lg border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {mode === 'create' ? 'Add Creator' : 'Edit Creator'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="max-h-[60vh] space-y-6 overflow-y-auto px-6 py-4">
              {error && (
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={form.first_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={form.last_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={form.display_name || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Optional public name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={form.bio || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  maxLength={160}
                  rows={2}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Short bio (160 characters max)"
                />
                <div className="text-right text-xs text-muted-foreground">
                  {(form.bio || '').length}/160
                </div>
              </div>

              {/* Status & Tier */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, status: e.target.value as CreatorStatus }))
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {CREATOR_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier">Tier</Label>
                  <select
                    id="tier"
                    value={form.tier || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        tier: (e.target.value || null) as CreatorTier | null,
                      }))
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">No tier</option>
                    {CREATOR_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Commission & Discount */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="commission_percent">Commission %</Label>
                  <Input
                    id="commission_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.commission_percent}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, commission_percent: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount_code">Discount Code</Label>
                  <Input
                    id="discount_code"
                    value={form.discount_code || ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, discount_code: e.target.value.toUpperCase() }))
                    }
                    placeholder="e.g., JANE15"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    placeholder="Add a tag..."
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    Add
                  </Button>
                </div>
                {form.tags && form.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {form.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Social Links (Collapsible) */}
              <div className="rounded-md border">
                <button
                  type="button"
                  onClick={() => setShowSocial(!showSocial)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50"
                >
                  <span>Social Links</span>
                  {showSocial ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showSocial && (
                  <div className="space-y-3 border-t px-4 py-3">
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram</Label>
                      <Input
                        id="instagram"
                        value={form.social_links?.instagram || ''}
                        onChange={(e) => updateSocialLink('instagram', e.target.value)}
                        placeholder="@username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tiktok">TikTok</Label>
                      <Input
                        id="tiktok"
                        value={form.social_links?.tiktok || ''}
                        onChange={(e) => updateSocialLink('tiktok', e.target.value)}
                        placeholder="@username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="youtube">YouTube</Label>
                      <Input
                        id="youtube"
                        value={form.social_links?.youtube || ''}
                        onChange={(e) => updateSocialLink('youtube', e.target.value)}
                        placeholder="Channel URL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portfolio_url">Portfolio URL</Label>
                      <Input
                        id="portfolio_url"
                        type="url"
                        value={form.social_links?.portfolio_url || ''}
                        onChange={(e) => updateSocialLink('portfolio_url', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Internal Notes */}
              <div className="space-y-2">
                <Label htmlFor="internal_notes">Internal Notes (Admin Only)</Label>
                <textarea
                  id="internal_notes"
                  value={form.internal_notes || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, internal_notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Private notes about this creator..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Create Creator' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
