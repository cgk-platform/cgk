'use client'

import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Switch,
} from '@cgk-platform/ui'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Flag,
  Loader2,
  PartyPopper,
  Rocket,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useState } from 'react'

/**
 * Step 6: Feature Flags
 *
 * Enable or disable platform features for the new brand:
 * - Commerce features
 * - Content features
 * - Payment features
 * - AI features
 */

interface FeatureFlagConfig {
  key: string
  name: string
  description: string
  category: 'commerce' | 'content' | 'payments' | 'ai' | 'platform'
  defaultEnabled: boolean
}

const PLATFORM_FEATURES: FeatureFlagConfig[] = [
  // Commerce Features
  {
    key: 'commerce.shopify_enabled',
    name: 'Shopify Integration',
    description: 'Enable Shopify store connection and order sync',
    category: 'commerce',
    defaultEnabled: true,
  },
  {
    key: 'commerce.custom_checkout',
    name: 'Custom Checkout',
    description: 'Use custom Stripe checkout instead of Shopify checkout',
    category: 'commerce',
    defaultEnabled: false,
  },
  {
    key: 'commerce.subscriptions',
    name: 'Subscription Products',
    description: 'Enable recurring subscription products',
    category: 'commerce',
    defaultEnabled: false,
  },
  {
    key: 'commerce.reviews',
    name: 'Product Reviews',
    description: 'Allow customers to leave product reviews',
    category: 'commerce',
    defaultEnabled: true,
  },
  // Content Features
  {
    key: 'content.blog',
    name: 'Blog System',
    description: 'Enable blog posts and content management',
    category: 'content',
    defaultEnabled: true,
  },
  {
    key: 'content.video_hosting',
    name: 'Video Hosting',
    description: 'Enable Mux video hosting for product videos',
    category: 'content',
    defaultEnabled: false,
  },
  {
    key: 'content.ugc_uploads',
    name: 'UGC Uploads',
    description: 'Allow creators to upload user-generated content',
    category: 'content',
    defaultEnabled: false,
  },
  // Payment Features
  {
    key: 'payments.wise_payouts',
    name: 'Wise Payouts',
    description: 'Enable international creator payouts via Wise',
    category: 'payments',
    defaultEnabled: false,
  },
  {
    key: 'payments.stripe_connect',
    name: 'Stripe Connect',
    description: 'Enable Stripe Connect for marketplace payments',
    category: 'payments',
    defaultEnabled: false,
  },
  // AI Features
  {
    key: 'ai.mcp_enabled',
    name: 'MCP Integration',
    description: 'Enable Model Context Protocol for AI assistants',
    category: 'ai',
    defaultEnabled: false,
  },
  {
    key: 'ai.chat_support',
    name: 'AI Chat Support',
    description: 'Enable AI-powered customer chat support',
    category: 'ai',
    defaultEnabled: false,
  },
  // Platform Features
  {
    key: 'platform.creator_portal',
    name: 'Creator Portal',
    description: 'Enable creator management and portal access',
    category: 'platform',
    defaultEnabled: true,
  },
  {
    key: 'platform.ab_testing',
    name: 'A/B Testing',
    description: 'Enable A/B testing framework',
    category: 'platform',
    defaultEnabled: false,
  },
]

type CategoryKey = 'commerce' | 'content' | 'payments' | 'ai' | 'platform'

const CATEGORY_LABELS: Record<CategoryKey, { label: string; color: string }> = {
  commerce: { label: 'Commerce', color: 'bg-green-500/10 text-green-600' },
  content: { label: 'Content', color: 'bg-blue-500/10 text-blue-600' },
  payments: { label: 'Payments', color: 'bg-amber-500/10 text-amber-600' },
  ai: { label: 'AI', color: 'bg-purple-500/10 text-purple-600' },
  platform: { label: 'Platform', color: 'bg-gray-500/10 text-gray-600' },
}

const DEFAULT_CATEGORY = { label: 'Other', color: 'bg-gray-500/10 text-gray-600' }

function FeatureFlagsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const brandId = searchParams.get('brandId')
  const brandSlug = searchParams.get('slug')

  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  // Initialize feature states from defaults
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    PLATFORM_FEATURES.forEach((feature) => {
      initial[feature.key] = feature.defaultEnabled
    })
    return initial
  })

  const toggleFeature = useCallback((key: string) => {
    setEnabledFeatures((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  const handleFinish = useCallback(async () => {
    if (!brandId) return

    setIsSaving(true)
    setError(null)

    try {
      // Save feature flag overrides for this brand
      const response = await fetch(`/api/platform/brands/${brandId}/feature-flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flags: Object.entries(enabledFeatures).map(([key, enabled]) => ({
            flagKey: key,
            enabled,
          })),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
      } else {
        setStatus('error')
        setError(data.error || 'Failed to save feature flags')
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to save feature flags')
    } finally {
      setIsSaving(false)
    }
  }, [brandId, enabledFeatures])

  const handleGoToBrand = useCallback(() => {
    router.push(`/brands/${brandId}`)
  }, [brandId, router])

  const handleGoToBrands = useCallback(() => {
    router.push('/brands')
  }, [router])

  // Group features by category
  const featuresByCategory = PLATFORM_FEATURES.reduce<Record<string, FeatureFlagConfig[]>>(
    (acc, feature) => {
      const category = feature.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category]!.push(feature)
      return acc
    },
    {}
  )

  if (!brandId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg font-medium text-muted-foreground">
          Brand ID is required to continue setup.
        </p>
        <Link href="/brands/new">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Start Over
          </Button>
        </Link>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Success State */}
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <PartyPopper className="h-8 w-8 text-success" />
              </div>
              <h2 className="mt-6 text-2xl font-bold">Brand Created Successfully!</h2>
              <p className="mt-2 text-muted-foreground">
                {brandSlug} is now set up and ready to use.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button onClick={handleGoToBrand} size="lg">
                  <Rocket className="mr-2 h-4 w-4" />
                  Go to Brand Dashboard
                </Button>
                <Button variant="outline" onClick={handleGoToBrands} size="lg">
                  View All Brands
                </Button>
              </div>

              <div className="mt-8 rounded-lg border bg-muted/50 p-4 text-left">
                <h3 className="font-medium">Next Steps</h3>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-success" />
                    <span>Connect Shopify store in brand settings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-success" />
                    <span>Configure email templates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-success" />
                    <span>Invite team members to the admin portal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-success" />
                    <span>Set up webhooks for real-time updates</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
          <Flag className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground">
            Step 6 of 6 - Enable platform features
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div key={step} className="h-1 flex-1 rounded-full bg-primary" />
        ))}
      </div>

      {/* Feature Flags */}
      <div className="space-y-4">
        {Object.entries(featuresByCategory).map(([category, features]) => {
          const categoryLabel = CATEGORY_LABELS[category as CategoryKey] ?? DEFAULT_CATEGORY
          return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Badge className={categoryLabel.color}>
                  {categoryLabel.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {features.filter((f) => enabledFeatures[f.key]).length} of {features.length}{' '}
                  enabled
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {features.map((feature) => (
                <div
                  key={feature.key}
                  className="flex items-start justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{feature.name}</p>
                      {feature.defaultEnabled && (
                        <Badge variant="outline" className="text-xs">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                  <Switch
                    checked={enabledFeatures[feature.key]}
                    onCheckedChange={() => toggleFeature(feature.key)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
          )
        })}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info box */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <h3 className="text-sm font-medium">About Feature Flags</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>- Feature flags control which features are available to this brand</li>
            <li>- Flags can be changed at any time in brand settings</li>
            <li>- Some features may require additional configuration</li>
            <li>- Disabled features won&apos;t appear in the brand&apos;s admin portal</li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-6">
        <Link href={`/brands/new/wizard/step-5?brandId=${brandId}&slug=${brandSlug}`}>
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>

        <Button onClick={handleFinish} disabled={isSaving} size="lg">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Brand...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Complete Setup
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default function FeatureFlagsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <FeatureFlagsContent />
    </Suspense>
  )
}
