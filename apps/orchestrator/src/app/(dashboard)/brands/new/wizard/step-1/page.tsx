'use client'

import { Button, Input, Label, Textarea } from '@cgk-platform/ui'
import { AlertCircle, ArrowRight, Building2, CheckCircle2, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useWizard } from '../context'

/**
 * Step 1: Basic Info
 *
 * Collects brand name, slug, and description.
 * Validates slug availability in real-time.
 */
export default function Step1Page() {
  const { data, updateData, completeStep, goBack } = useWizard()

  const [name, setName] = useState(data.name)
  const [slug, setSlug] = useState(data.slug)
  const [description, setDescription] = useState(data.description)

  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-generate slug from name
  const generateSlug = useCallback((brandName: string) => {
    return brandName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
  }, [])

  // Update slug when name changes (if slug hasn't been manually edited)
  useEffect(() => {
    if (name && !data.slug) {
      const generated = generateSlug(name)
      setSlug(generated)
    }
  }, [name, data.slug, generateSlug])

  // Check slug availability with debounce
  useEffect(() => {
    if (!slug || slug.length < 2) {
      setSlugStatus('idle')
      return
    }

    setSlugStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/platform/brands/check-slug?slug=${encodeURIComponent(slug)}`)
        const result = await response.json()
        setSlugStatus(result.available ? 'available' : 'taken')
      } catch {
        // On error, allow proceeding (will validate on submit)
        setSlugStatus('available')
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [slug])

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (slugStatus === 'taken') {
        return
      }

      setIsSubmitting(true)

      try {
        // Update wizard data
        updateData({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
        })

        // Proceed to next step
        completeStep()
      } finally {
        setIsSubmitting(false)
      }
    },
    [name, slug, description, slugStatus, updateData, completeStep]
  )

  const isValid = name.trim().length >= 2 && slug.trim().length >= 2 && slugStatus !== 'taken'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Brand Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Brand Name <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="name"
            type="text"
            placeholder="My Awesome Brand"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>
        <p className="text-xs text-muted-foreground">
          The display name for your brand. This will appear in the admin dashboard and emails.
        </p>
      </div>

      {/* Brand Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug" className="text-sm font-medium">
          Brand Slug <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            /
          </span>
          <Input
            id="slug"
            type="text"
            placeholder="my-awesome-brand"
            value={slug}
            onChange={(e) => setSlug(generateSlug(e.target.value))}
            className="pl-7 pr-10 font-mono text-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {slugStatus === 'checking' && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {slugStatus === 'available' && (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            {slugStatus === 'taken' && <AlertCircle className="h-4 w-4 text-destructive" />}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            URL-friendly identifier. Used for API paths and database schema.
          </p>
          {slugStatus === 'taken' && (
            <p className="text-xs text-destructive">This slug is already in use</p>
          )}
          {slugStatus === 'available' && slug.length >= 2 && (
            <p className="text-xs text-emerald-500">Available</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          placeholder="A brief description of your brand..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Optional. A short description for internal reference.
        </p>
      </div>

      {/* Preview */}
      {(name || slug) && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Preview
          </p>
          <div className="space-y-1">
            <p className="font-semibold">{name || 'Brand Name'}</p>
            <p className="font-mono text-sm text-muted-foreground">
              tenant_{slug || 'slug'} (database schema)
            </p>
            <p className="font-mono text-sm text-muted-foreground">
              /api/brands/{slug || 'slug'}/... (API routes)
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button type="button" variant="ghost" onClick={goBack}>
          Cancel
        </Button>

        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
