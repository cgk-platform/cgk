/**
 * Bundle Configuration — Create / Edit
 *
 * Allows merchants to create or edit a bundle discount configuration.
 * Manages tier thresholds, discount values, discount type, and per-tier free gift
 * products. Saves configuration as a metafield on the automatic discount.
 */
import { useState, useCallback } from 'react'
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import {
  useLoaderData,
  useSubmit,
  useNavigation,
  useActionData,
} from '@remix-run/react'
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  Banner,
  BlockStack,
  InlineStack,
  Text,
  Divider,
  Box,
  Thumbnail,
} from '@shopify/polaris'
import { useAppBridge } from '@shopify/app-bridge-react'
import { authenticate } from '../shopify.server'
import type { BundleConfig, TierConfig, BundleDiscountConfig } from '../lib/bundle-config.server'
import {
  parseBundleConfig,
  createBundleDiscount,
  updateBundleDiscountConfig,
  findBundleDiscountFunctionId,
  resolveVariantProducts,
} from '../lib/bundle-config.server'

interface FreeGiftProduct {
  variantId: string
  productTitle: string
  variantTitle: string
  imageUrl: string | null
}

interface ActionErrors {
  title?: string
  tiers?: string
  functionId?: string
  server?: string
  [key: string]: string | undefined
}

const MAX_TIERS = 8

const DEFAULT_BUNDLE: BundleConfig = {
  bundleId: '',
  discountType: 'percentage',
  tiers: [
    { count: 2, discount: 10, freeGiftVariantIds: [] },
    { count: 3, discount: 15, freeGiftVariantIds: [] },
    { count: 4, discount: 20, freeGiftVariantIds: [] },
  ],
  freeGiftVariantIds: [],
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request)
  const { id } = params

  if (id === 'new') {
    const detectedFunctionId = await findBundleDiscountFunctionId(admin)

    return json({
      isNew: true,
      discountId: null,
      title: '',
      bundle: DEFAULT_BUNDLE,
      functionId: detectedFunctionId ?? '',
      functionAutoDetected: !!detectedFunctionId,
      freeGiftProducts: [] as FreeGiftProduct[],
    })
  }

  const response = await admin.graphql(
    `#graphql
    query GetDiscount($id: ID!) {
      discountNode(id: $id) {
        id
        discount {
          ... on DiscountAutomaticApp {
            title
            discountId
          }
        }
        metafield(namespace: "$app:bundle-discount", key: "config") {
          value
        }
      }
    }`,
    { variables: { id } }
  )

  const data = await response.json()
  const node = data.data?.discountNode

  if (!node) {
    return redirect('/app')
  }

  const config = parseBundleConfig(node.metafield?.value)
  const bundle = config.bundles[0] ?? DEFAULT_BUNDLE

  // Collect all free gift variant IDs from tiers + global (backward compat)
  const allGiftVariantIds = new Set<string>()
  for (const tier of bundle.tiers) {
    if (tier.freeGiftVariantIds) {
      for (const gid of tier.freeGiftVariantIds) {
        allGiftVariantIds.add(gid)
      }
    }
  }
  for (const gid of bundle.freeGiftVariantIds) {
    allGiftVariantIds.add(gid)
  }

  let freeGiftProducts: FreeGiftProduct[] = []
  if (allGiftVariantIds.size > 0) {
    freeGiftProducts = await resolveVariantProducts(admin, [...allGiftVariantIds])
  }

  return json({
    isNew: false,
    discountId: id,
    title: node.discount?.title ?? '',
    bundle,
    functionId: '',
    functionAutoDetected: false,
    freeGiftProducts,
  })
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request)
  const formData = await request.formData()
  const rawData = formData.get('bundleData') as string

  if (!rawData) {
    return json({ errors: { server: 'Missing bundle data' } as ActionErrors }, { status: 400 })
  }

  let data: {
    title: string
    bundle: BundleConfig
    functionId?: string
  }

  try {
    data = JSON.parse(rawData)
  } catch {
    return json({ errors: { server: 'Invalid bundle data' } as ActionErrors }, { status: 400 })
  }

  // Server-side validation
  const errors: ActionErrors = {}

  if (!data.title.trim()) {
    errors.title = 'Title is required'
  } else if (data.title.length > 255) {
    errors.title = 'Title must be 255 characters or fewer'
  }

  if (!data.bundle.tiers || data.bundle.tiers.length === 0) {
    errors.tiers = 'At least one tier is required'
  } else {
    const counts = new Set<number>()
    for (let i = 0; i < data.bundle.tiers.length; i++) {
      const tier = data.bundle.tiers[i]
      if (tier.count < 1) {
        errors[`tier_${i}_count`] = 'Item count must be at least 1'
      }
      if (tier.discount <= 0) {
        errors[`tier_${i}_discount`] = 'Discount must be greater than 0'
      }
      if (data.bundle.discountType === 'percentage' && tier.discount > 100) {
        errors[`tier_${i}_discount`] = 'Percentage cannot exceed 100'
      }
      if (counts.has(tier.count)) {
        errors.tiers = 'Each tier must have a unique item count'
      }
      counts.add(tier.count)
    }
  }

  const { id } = params

  // Auto-detect function ID as fallback when creating
  if (id === 'new' && !data.functionId?.trim()) {
    const detectedId = await findBundleDiscountFunctionId(admin)
    if (detectedId) {
      data.functionId = detectedId
    } else {
      errors.functionId = 'Function ID is required. Deploy the bundle-order-discount extension first.'
    }
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 422 })
  }

  const config: BundleDiscountConfig = {
    bundles: [data.bundle],
  }

  if (id === 'new') {
    const result = await createBundleDiscount(admin, {
      title: data.title,
      functionId: data.functionId!,
      config,
    })
    if (!result.success) {
      return json(
        {
          errors: {
            server: result.userErrors.map((e) => e.message).join(', '),
          } as ActionErrors,
        },
        { status: 422 }
      )
    }
  } else {
    const result = await updateBundleDiscountConfig(admin, {
      discountId: id!,
      title: data.title,
      config,
    })
    if (!result.success) {
      return json(
        {
          errors: {
            server: result.userErrors.map((e) => e.message).join(', '),
          } as ActionErrors,
        },
        { status: 422 }
      )
    }
  }

  // Sync bundle config to CGK platform DB (best-effort, non-blocking)
  // Resolve tenant from shop domain (multi-tenant support)
  const { session } = await authenticate.admin(request)
  const { getOrganizationIdForShop } = await import('@cgk-platform/shopify')
  const { sql: dbSql } = await import('@cgk-platform/db')

  const organizationId = await getOrganizationIdForShop(session.shop)

  if (!organizationId) {
    console.warn(`[BundleSync] Shop ${session.shop} not registered with any tenant — skipping platform sync`)
    return json({ saved: true, bundleTitle: data.title })
  }

  // Get tenant slug from organization
  const orgResult = await dbSql`
    SELECT slug FROM public.organizations WHERE id = ${organizationId} LIMIT 1
  `

  const tenantSlug = orgResult.rows[0]?.slug as string | undefined

  if (!tenantSlug) {
    console.warn(`[BundleSync] Organization ${organizationId} not found — skipping platform sync`)
    return json({ saved: true, bundleTitle: data.title })
  }

  const platformApiUrl = process.env.CGK_PLATFORM_API_URL
  const platformApiKey = process.env.CGK_PLATFORM_API_KEY

  if (platformApiUrl && platformApiKey) {
    const bundle = data.bundle
    const platformPayload = {
      bundle_id: bundle.bundleId,
      name: data.title,
      discount_type: bundle.discountType,
      tiers: bundle.tiers.map((t: TierConfig) => ({
        count: t.count,
        discount: t.discount,
        label: t.label || '',
        free_gift_variant_ids: t.freeGiftVariantIds || [],
      })),
      free_gift_variant_ids: bundle.freeGiftVariantIds || [],
      status: 'active',
    }

    try {
      if (id === 'new') {
        await fetch(`${platformApiUrl}/api/admin/bundles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-slug': tenantSlug,
            Authorization: `Bearer ${platformApiKey}`,
          },
          body: JSON.stringify(platformPayload),
        })
      } else {
        const bundleConfigId = bundle.bundleId
        if (bundleConfigId) {
          await fetch(
            `${platformApiUrl}/api/admin/bundles/${bundleConfigId}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'x-tenant-slug': tenantSlug,
                Authorization: `Bearer ${platformApiKey}`,
              },
              body: JSON.stringify(platformPayload),
            }
          )
        }
      }
    } catch (err) {
      console.error('[BundleSync] Failed to sync to platform:', err)
    }
  }

  return json({ saved: true, bundleTitle: data.title })
}

export default function BundleEdit() {
  const {
    isNew,
    title: initialTitle,
    bundle: initialBundle,
    functionId: initialFunctionId,
    functionAutoDetected,
    freeGiftProducts: initialFreeGiftProducts,
  } = useLoaderData<typeof loader>()
  const actionData = useActionData<{ errors?: ActionErrors; saved?: boolean; bundleTitle?: string }>()
  const submit = useSubmit()
  const navigation = useNavigation()
  const shopify = useAppBridge()
  const isSubmitting = navigation.state === 'submitting'

  const [title, setTitle] = useState(initialTitle)
  const [bundleId, setBundleId] = useState(initialBundle.bundleId)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    initialBundle.discountType
  )
  const [tiers, setTiers] = useState<TierConfig[]>(
    initialBundle.tiers.map(t => ({
      ...t,
      freeGiftVariantIds: t.freeGiftVariantIds ?? [],
    }))
  )
  const [giftProductInfo, setGiftProductInfo] = useState<Record<string, FreeGiftProduct>>(
    Object.fromEntries(initialFreeGiftProducts.map((p: FreeGiftProduct) => [p.variantId, p]))
  )
  const [functionId, setFunctionId] = useState(initialFunctionId)
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})

  const errors = { ...clientErrors, ...actionData?.errors }

  const handleAddTier = useCallback(() => {
    if (tiers.length >= MAX_TIERS) return
    const lastTier = tiers[tiers.length - 1]
    const newTier: TierConfig = {
      count: (lastTier?.count ?? 1) + 1,
      discount: (lastTier?.discount ?? 5) + 5,
      freeGiftVariantIds: [],
    }
    setTiers([...tiers, newTier].sort((a, b) => a.count - b.count))
  }, [tiers])

  const handleRemoveTier = useCallback(
    (index: number) => {
      if (tiers.length <= 1) return
      setTiers(tiers.filter((_, i) => i !== index).sort((a, b) => a.count - b.count))
    },
    [tiers]
  )

  const handleTierChange = useCallback(
    (index: number, field: 'count' | 'discount' | 'label', value: string) => {
      if (field === 'label') {
        setTiers(
          tiers.map((tier, i) =>
            i === index ? { ...tier, label: value } : tier
          )
        )
        return
      }
      const num = parseFloat(value)
      if (isNaN(num)) return
      setTiers(
        tiers.map((tier, i) =>
          i === index ? { ...tier, [field]: num } : tier
        )
      )
    },
    [tiers]
  )

  const handleSelectTierGifts = useCallback(async (tierIndex: number) => {
    try {
      const selected = await shopify.resourcePicker({
        type: 'product',
        multiple: true,
        action: 'select',
        filter: {
          variants: true,
        },
      })

      if (!selected || selected.length === 0) return

      const newProducts: FreeGiftProduct[] = selected.flatMap(
        (product: any) => {
          const variant = product.variants?.[0]
          if (!variant) return []
          return [
            {
              variantId: variant.id,
              productTitle: product.title,
              variantTitle: variant.title ?? 'Default',
              imageUrl: product.images?.[0]?.originalSrc ?? null,
            },
          ]
        }
      )

      // Update display info lookup
      const newInfo = { ...giftProductInfo }
      newProducts.forEach(p => { newInfo[p.variantId] = p })
      setGiftProductInfo(newInfo)

      // Add to this tier's freeGiftVariantIds (dedupe)
      const tier = tiers[tierIndex]
      const existingIds = new Set(tier.freeGiftVariantIds || [])
      const newIds = newProducts.map(p => p.variantId).filter(id => !existingIds.has(id))

      setTiers(tiers.map((t, i) =>
        i === tierIndex
          ? { ...t, freeGiftVariantIds: [...(t.freeGiftVariantIds || []), ...newIds] }
          : t
      ))
    } catch {
      // User cancelled the picker
    }
  }, [shopify, tiers, giftProductInfo])

  const handleRemoveTierGift = useCallback(
    (tierIndex: number, variantId: string) => {
      setTiers(tiers.map((t, i) =>
        i === tierIndex
          ? { ...t, freeGiftVariantIds: (t.freeGiftVariantIds || []).filter(id => id !== variantId) }
          : t
      ))
    },
    [tiers]
  )

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    } else if (title.length > 255) {
      newErrors.title = 'Title must be 255 characters or fewer'
    }

    if (isNew && !functionAutoDetected && !functionId.trim()) {
      newErrors.functionId = 'Function ID is required for new discounts'
    }

    if (tiers.length === 0) {
      newErrors.tiers = 'At least one tier is required'
    }

    for (let i = 0; i < tiers.length; i++) {
      if (tiers[i].count < 1) {
        newErrors[`tier_${i}_count`] = 'Item count must be at least 1'
      }
      if (tiers[i].discount <= 0) {
        newErrors[`tier_${i}_discount`] = 'Discount must be greater than 0'
      }
      if (discountType === 'percentage' && tiers[i].discount > 100) {
        newErrors[`tier_${i}_discount`] = 'Percentage cannot exceed 100'
      }
    }

    // Check for duplicate counts and ascending order
    const counts = tiers.map((t) => t.count)
    const uniqueCounts = new Set(counts)
    if (uniqueCounts.size !== counts.length) {
      newErrors.tiers = 'Each tier must have a unique item count'
    }

    const sortedCounts = [...counts].sort((a, b) => a - b)
    for (let i = 1; i < sortedCounts.length; i++) {
      if (sortedCounts[i] <= sortedCounts[i - 1]) {
        newErrors.tiers = newErrors.tiers || 'Tier item counts must be unique and ascending'
        break
      }
    }

    setClientErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [title, tiers, discountType, isNew, functionId, functionAutoDetected])

  const handleSave = useCallback(() => {
    if (!validate()) return

    const sortedTiers = [...tiers].sort((a, b) => a.count - b.count)

    const bundle: BundleConfig = {
      bundleId: bundleId || `bundle-${Date.now()}`,
      discountType,
      tiers: sortedTiers,
      freeGiftVariantIds: [],
    }

    const formData = new FormData()
    formData.set(
      'bundleData',
      JSON.stringify({ title, bundle, functionId })
    )
    submit(formData, { method: 'post' })
  }, [validate, title, bundleId, discountType, tiers, functionId, submit])

  // Compute all free gift variant IDs across all tiers for the preview
  const allTierGiftIds = tiers.reduce<string[]>((acc, t) => {
    return acc.concat(t.freeGiftVariantIds || [])
  }, [])

  return (
    <Page
      title={isNew ? 'Create bundle discount' : 'Edit bundle discount'}
      backAction={{ url: '/app' }}
      primaryAction={{
        content: isNew ? 'Create' : 'Save',
        loading: isSubmitting,
        disabled: isSubmitting,
        onAction: handleSave,
      }}
    >
      <Layout>
        {errors.server && (
          <Layout.Section>
            <Banner tone="critical">
              {errors.server}
            </Banner>
          </Layout.Section>
        )}

        {Object.keys(errors).filter((k) => k !== 'server').length > 0 && (
          <Layout.Section>
            <Banner tone="critical">
              Please fix the errors below before saving.
            </Banner>
          </Layout.Section>
        )}

        {actionData?.saved && (
          <Layout.Section>
            <Banner tone="success">
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  Bundle discount &ldquo;{actionData.bundleTitle}&rdquo; saved
                  successfully.
                </Text>
                <Text as="p" variant="bodyMd">
                  Next step: Add the Bundle Builder block to your theme. Open the
                  theme editor and add it to a product page or custom section.
                </Text>
                <InlineStack gap="200">
                  <Button url="/app">Back to bundles</Button>
                </InlineStack>
              </BlockStack>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                General
              </Text>
              <FormLayout>
                <TextField
                  label="Discount title"
                  value={title}
                  onChange={setTitle}
                  autoComplete="off"
                  helpText="Shown in the Shopify admin and on the order."
                  error={errors.title}
                  disabled={isSubmitting}
                />
                <TextField
                  label="Bundle ID"
                  value={bundleId}
                  onChange={setBundleId}
                  autoComplete="off"
                  helpText="Maps to the theme block ID. Leave blank to auto-generate."
                  placeholder="e.g. block-abc123"
                  disabled={isSubmitting}
                />
                <Select
                  label="Discount type"
                  options={[
                    { label: 'Percentage off', value: 'percentage' },
                    { label: 'Fixed amount off', value: 'fixed' },
                  ]}
                  value={discountType}
                  onChange={(val) =>
                    setDiscountType(val as 'percentage' | 'fixed')
                  }
                  disabled={isSubmitting}
                />
                {isNew && (
                  functionAutoDetected ? (
                    <Banner tone="info">
                      <Text as="p" variant="bodyMd">
                        Bundle discount function auto-detected:{' '}
                        <Text as="span" variant="bodyMd" fontWeight="semibold">
                          {functionId.length > 24
                            ? functionId.substring(0, 24) + '...'
                            : functionId}
                        </Text>
                      </Text>
                    </Banner>
                  ) : (
                    <BlockStack gap="200">
                      <Banner tone="warning">
                        <Text as="p" variant="bodyMd">
                          No deployed bundle discount function found. Deploy the
                          bundle-order-discount extension first, then paste the
                          Function ID below.
                        </Text>
                      </Banner>
                      <TextField
                        label="Function ID"
                        value={functionId}
                        onChange={setFunctionId}
                        autoComplete="off"
                        helpText="Run: shopify app function info"
                        error={errors.functionId}
                        placeholder="e.g. 01ABCDEF-1234-5678-9ABC-DEF012345678"
                        disabled={isSubmitting}
                      />
                    </BlockStack>
                  )
                )}
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Tier rules
                </Text>
                <Button
                  onClick={handleAddTier}
                  disabled={isSubmitting || tiers.length >= MAX_TIERS}
                >
                  {tiers.length >= MAX_TIERS ? `Max ${MAX_TIERS} tiers` : 'Add tier'}
                </Button>
              </InlineStack>

              {errors.tiers && (
                <Banner tone="critical">{errors.tiers}</Banner>
              )}

              <Text as="p" variant="bodyMd" tone="subdued">
                Define discount amounts based on how many items are in the
                bundle. Tiers are auto-sorted by item count ascending.
              </Text>

              {tiers.map((tier, index) => (
                <Box key={index}>
                  {index > 0 && <Divider />}
                  <Box paddingBlockStart="300">
                    <BlockStack gap="300">
                      <InlineStack gap="400" align="start" blockAlign="end">
                        <Box minWidth="120px">
                          <TextField
                            label={`Tier ${index + 1} — Items`}
                            type="number"
                            value={String(tier.count)}
                            onChange={(val) =>
                              handleTierChange(index, 'count', val)
                            }
                            autoComplete="off"
                            min={1}
                            error={errors[`tier_${index}_count`]}
                            disabled={isSubmitting}
                          />
                        </Box>
                        <Box minWidth="120px">
                          <TextField
                            label={
                              discountType === 'percentage'
                                ? 'Discount %'
                                : 'Discount amount'
                            }
                            type="number"
                            value={String(tier.discount)}
                            onChange={(val) =>
                              handleTierChange(index, 'discount', val)
                            }
                            autoComplete="off"
                            min={0}
                            suffix={
                              discountType === 'percentage' ? '%' : undefined
                            }
                            error={errors[`tier_${index}_discount`]}
                            disabled={isSubmitting}
                          />
                        </Box>
                        <Box minWidth="140px">
                          <TextField
                            label="Label (optional)"
                            value={tier.label || ''}
                            onChange={(val) =>
                              handleTierChange(index, 'label', val)
                            }
                            autoComplete="off"
                            placeholder="e.g. Gold Tier"
                            disabled={isSubmitting}
                          />
                        </Box>
                        {tiers.length > 1 && (
                          <Button
                            variant="plain"
                            tone="critical"
                            onClick={() => handleRemoveTier(index)}
                            disabled={isSubmitting}
                          >
                            Remove
                          </Button>
                        )}
                      </InlineStack>

                      {/* Per-tier free gifts */}
                      <Box paddingInlineStart="200">
                        <BlockStack gap="200">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text as="span" variant="bodySm" tone="subdued">
                              Free gifts for this tier
                            </Text>
                            <Button
                              variant="plain"
                              onClick={() => handleSelectTierGifts(index)}
                              disabled={isSubmitting}
                            >
                              Add free gifts
                            </Button>
                          </InlineStack>

                          {(tier.freeGiftVariantIds || []).length > 0 ? (
                            <InlineStack gap="200" wrap>
                              {(tier.freeGiftVariantIds || []).map((variantId) => {
                                const product = giftProductInfo[variantId]
                                return (
                                  <InlineStack
                                    key={variantId}
                                    gap="200"
                                    blockAlign="center"
                                  >
                                    <Thumbnail
                                      source={product?.imageUrl ?? ''}
                                      alt={product?.productTitle ?? variantId}
                                      size="small"
                                    />
                                    <BlockStack gap="050">
                                      <Text as="span" variant="bodySm" fontWeight="semibold">
                                        {product?.productTitle ?? 'Unknown'}
                                      </Text>
                                      {product?.variantTitle && product.variantTitle !== 'Default Title' && (
                                        <Text as="span" variant="bodySm" tone="subdued">
                                          {product.variantTitle}
                                        </Text>
                                      )}
                                    </BlockStack>
                                    <Button
                                      variant="plain"
                                      tone="critical"
                                      onClick={() => handleRemoveTierGift(index, variantId)}
                                      disabled={isSubmitting}
                                    >
                                      Remove
                                    </Button>
                                  </InlineStack>
                                )
                              })}
                            </InlineStack>
                          ) : (
                            <Text as="p" variant="bodySm" tone="subdued">
                              No free gifts. Customers qualifying for this tier
                              won&apos;t receive a gift.
                            </Text>
                          )}
                        </BlockStack>
                      </Box>
                    </BlockStack>
                  </Box>
                </Box>
              ))}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Preview
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                This is how the tier pricing will be applied at checkout:
              </Text>
              {[...tiers]
                .sort((a, b) => a.count - b.count)
                .map((tier) => (
                  <BlockStack key={tier.count} gap="100">
                    <InlineStack gap="200">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {tier.count}+ items:
                      </Text>
                      <Text as="span" variant="bodyMd">
                        {discountType === 'percentage'
                          ? `${tier.discount}% off`
                          : `$${tier.discount} off bundle total`}
                      </Text>
                    </InlineStack>
                    {(tier.freeGiftVariantIds || []).length > 0 && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        + {tier.freeGiftVariantIds!.length} free gift
                        {tier.freeGiftVariantIds!.length !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </BlockStack>
                ))}
              {allTierGiftIds.length > 0 && (
                <>
                  <Divider />
                  <Text as="p" variant="bodyMd">
                    {allTierGiftIds.length} free gift
                    {allTierGiftIds.length !== 1 ? 's' : ''} configured across tiers
                    (cumulative — customers unlock gifts as they reach each tier).
                  </Text>
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
