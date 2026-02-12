'use client'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Progress,
  Spinner,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@cgk/ui'
import { useCallback, useEffect, useState } from 'react'

import {
  BrandExclusionList,
  CategorySelector,
  ContentFormatEditor,
  ContentTypeSelector,
  PartnershipTypeSelector,
  PlatformPreferencesEditor,
  PricingRangeSelector,
  RateCardEditor,
} from '@/components/brand-preferences'
import type {
  BrandCategory,
  BrandExclusion,
  ContentFormatPreference,
  ContentType,
  CreatorBrandPreferences,
  PartnershipType,
  PlatformPreference,
  PricingRange,
  RateCardEntry,
} from '@/lib/types'

/**
 * Default pricing ranges
 */
const DEFAULT_PRICING_RANGES: Record<PricingRange, boolean> = {
  budget: true,
  midrange: true,
  premium: true,
  luxury: true,
}

/**
 * Brand Preferences Settings Page
 *
 * Allows creators to configure their brand partnership preferences
 */
export default function BrandPreferencesPage(): React.JSX.Element {
  // Data state
  const [_preferences, setPreferences] = useState<CreatorBrandPreferences | null>(null)
  const [exclusions, setExclusions] = useState<BrandExclusion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [preferredCategories, setPreferredCategories] = useState<BrandCategory[]>([])
  const [contentTypes, setContentTypes] = useState<ContentType[]>([])
  const [pricingRanges, setPricingRanges] = useState<Record<PricingRange, boolean>>(DEFAULT_PRICING_RANGES)
  const [partnershipTypes, setPartnershipTypes] = useState<PartnershipType[]>([])
  const [contentFormats, setContentFormats] = useState<ContentFormatPreference[]>([])
  const [platformPreferences, setPlatformPreferences] = useState<PlatformPreference[]>([])
  const [rateCard, setRateCard] = useState<RateCardEntry[]>([])
  const [minimumRateCents, setMinimumRateCents] = useState<number | null>(null)
  const [isAvailableForWork, setIsAvailableForWork] = useState(true)
  const [availabilityNotes, setAvailabilityNotes] = useState('')

  // Fetch preferences and exclusions
  useEffect(() => {
    async function fetchData() {
      try {
        const [prefsRes, exclusionsRes] = await Promise.all([
          fetch('/api/creator/brand-preferences'),
          fetch('/api/creator/brand-preferences/exclusions'),
        ])

        if (!prefsRes.ok || !exclusionsRes.ok) {
          if (prefsRes.status === 401 || exclusionsRes.status === 401) {
            window.location.href = '/login'
            return
          }
          throw new Error('Failed to load preferences')
        }

        const prefsData = await prefsRes.json()
        const exclusionsData = await exclusionsRes.json()

        setPreferences(prefsData.preferences)
        setExclusions(exclusionsData.exclusions || [])

        // Populate form
        const prefs = prefsData.preferences
        setPreferredCategories(prefs.preferredCategories || [])
        setContentTypes(prefs.contentTypes || [])
        setPricingRanges(prefs.pricingRanges || DEFAULT_PRICING_RANGES)
        setPartnershipTypes(prefs.partnershipTypes || [])
        setContentFormats(prefs.contentFormats || [])
        setPlatformPreferences(prefs.platformPreferences || [])
        setRateCard(prefs.rateCard || [])
        setMinimumRateCents(prefs.minimumRateCents)
        setIsAvailableForWork(prefs.isAvailableForWork ?? true)
        setAvailabilityNotes(prefs.availabilityNotes || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preferences')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Save preferences
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/creator/brand-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredCategories,
          contentTypes,
          pricingRanges,
          partnershipTypes,
          contentFormats,
          platformPreferences,
          rateCard,
          minimumRateCents,
          isAvailableForWork,
          availabilityNotes: availabilityNotes.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save preferences')
      }

      setSuccess('Preferences saved successfully')
      setPreferences((prev) =>
        prev
          ? {
              ...prev,
              profileCompletenessPercent: data.profileCompletenessPercent,
            }
          : null
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setIsSaving(false)
    }
  }, [
    preferredCategories,
    contentTypes,
    pricingRanges,
    partnershipTypes,
    contentFormats,
    platformPreferences,
    rateCard,
    minimumRateCents,
    isAvailableForWork,
    availabilityNotes,
  ])

  // Add brand exclusion
  const handleAddExclusion = useCallback(async (brandName: string, reason?: string) => {
    const response = await fetch('/api/creator/brand-preferences/exclusions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName, reason }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to add exclusion')
    }

    setExclusions((prev) => [data.exclusion, ...prev])
  }, [])

  // Remove brand exclusion
  const handleRemoveExclusion = useCallback(async (id: string) => {
    const response = await fetch(`/api/creator/brand-preferences/exclusions/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to remove exclusion')
    }

    setExclusions((prev) => prev.filter((e) => e.id !== id))
  }, [])

  // Handle rate card changes
  const handleRateCardChange = useCallback(
    (newRateCard: RateCardEntry[], newMinimumRateCents: number | null) => {
      setRateCard(newRateCard)
      setMinimumRateCents(newMinimumRateCents)
    },
    []
  )

  // Calculate completeness based on current form state
  const calculateCompleteness = useCallback(() => {
    let score = 0
    const sections = 6

    if (preferredCategories.length > 0) score++
    if (contentTypes.length > 0) score++
    if (partnershipTypes.length > 0) score++
    if (contentFormats.length > 0) score++
    if (platformPreferences.length > 0) score++
    if (rateCard.length > 0) score++

    return Math.round((score / sections) * 100)
  }, [preferredCategories, contentTypes, partnershipTypes, contentFormats, platformPreferences, rateCard])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const completeness = calculateCompleteness()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Brand Preferences</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Define what kind of brands and partnerships you're interested in
          </p>
        </div>

        {/* Completeness indicator */}
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Profile</span>
            <Badge variant={completeness === 100 ? 'success' : 'secondary'}>
              {completeness}%
            </Badge>
          </div>
          <Progress value={completeness} className="mt-2 h-2 w-32" />
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950/50 dark:text-green-200">
          {success}
        </div>
      )}

      {/* Availability toggle */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <div className="font-medium text-foreground">Available for Work</div>
            <p className="text-sm text-muted-foreground">
              Show brands that you're open to new collaborations
            </p>
          </div>
          <Switch
            checked={isAvailableForWork}
            onCheckedChange={setIsAvailableForWork}
            disabled={isSaving}
          />
        </CardContent>
        {!isAvailableForWork && (
          <CardContent className="border-t pt-4">
            <label htmlFor="availability-notes" className="text-sm font-medium text-foreground">
              Away Message <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="availability-notes"
              value={availabilityNotes}
              onChange={(e) => setAvailabilityNotes(e.target.value)}
              placeholder="e.g., Taking a break until March, will respond then..."
              disabled={isSaving}
              rows={2}
              className="mt-2"
            />
          </CardContent>
        )}
      </Card>

      {/* Main content tabs */}
      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="categories" className="text-xs sm:text-sm">
            Categories
          </TabsTrigger>
          <TabsTrigger value="content" className="text-xs sm:text-sm">
            Content
          </TabsTrigger>
          <TabsTrigger value="partnerships" className="text-xs sm:text-sm">
            Partnerships
          </TabsTrigger>
          <TabsTrigger value="platforms" className="text-xs sm:text-sm">
            Platforms
          </TabsTrigger>
          <TabsTrigger value="rates" className="text-xs sm:text-sm">
            Rates
          </TabsTrigger>
          <TabsTrigger value="exclusions" className="text-xs sm:text-sm">
            Exclusions
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-foreground">Preferred Categories</h3>
              <p className="text-sm text-muted-foreground">
                Select the brand categories you're most interested in working with
              </p>
            </CardHeader>
            <CardContent>
              <CategorySelector
                selected={preferredCategories}
                onChange={setPreferredCategories}
                disabled={isSaving}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-foreground">Pricing Ranges</h3>
              <p className="text-sm text-muted-foreground">
                Which price points do you want to represent?
              </p>
            </CardHeader>
            <CardContent>
              <PricingRangeSelector
                selected={pricingRanges}
                onChange={setPricingRanges}
                disabled={isSaving}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-foreground">Content Types</h3>
              <p className="text-sm text-muted-foreground">
                What types of content do you create?
              </p>
            </CardHeader>
            <CardContent>
              <ContentTypeSelector
                selected={contentTypes}
                onChange={setContentTypes}
                disabled={isSaving}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-foreground">Content Formats</h3>
              <p className="text-sm text-muted-foreground">
                Select the formats you work with and your proficiency level
              </p>
            </CardHeader>
            <CardContent>
              <ContentFormatEditor
                formats={contentFormats}
                onChange={setContentFormats}
                disabled={isSaving}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Partnerships Tab */}
        <TabsContent value="partnerships">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-foreground">Partnership Types</h3>
              <p className="text-sm text-muted-foreground">
                What types of brand partnerships are you open to?
              </p>
            </CardHeader>
            <CardContent>
              <PartnershipTypeSelector
                selected={partnershipTypes}
                onChange={setPartnershipTypes}
                disabled={isSaving}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platforms Tab */}
        <TabsContent value="platforms">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-foreground">Platform Preferences</h3>
              <p className="text-sm text-muted-foreground">
                Select your active platforms and add your follower counts
              </p>
            </CardHeader>
            <CardContent>
              <PlatformPreferencesEditor
                platforms={platformPreferences}
                onChange={setPlatformPreferences}
                disabled={isSaving}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rates Tab */}
        <TabsContent value="rates">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-foreground">Rate Card</h3>
              <p className="text-sm text-muted-foreground">
                Set your minimum and preferred rates for different content types
              </p>
            </CardHeader>
            <CardContent>
              <RateCardEditor
                rateCard={rateCard}
                minimumRateCents={minimumRateCents}
                onChange={handleRateCardChange}
                disabled={isSaving}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exclusions Tab */}
        <TabsContent value="exclusions">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-foreground">Brand Exclusions</h3>
              <p className="text-sm text-muted-foreground">
                Add brands you don't want to work with
              </p>
            </CardHeader>
            <CardContent>
              <BrandExclusionList
                exclusions={exclusions}
                onAdd={handleAddExclusion}
                onRemove={handleRemoveExclusion}
                disabled={isSaving}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save button */}
      <div className="sticky bottom-4 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="lg"
          className="shadow-lg"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}
