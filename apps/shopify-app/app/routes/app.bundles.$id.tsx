/**
 * Bundle Configuration — Create / Edit
 *
 * Allows merchants to create or edit a bundle discount configuration.
 * Manages tier thresholds, discount values, discount type, and free gift
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
  Spinner,
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

const DEFAULT_BUNDLE: BundleConfig = {
  bundleId: '',
  discountType: 'percentage',
  tiers: [
    { count: 2, discount: 10 },
    { count: 3, discount: 15 },
    { count: 4, discount: 20 },
  ],
  freeGiftVariantIds: [],
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request)
  const { id } = params

  if (id === 'new') {
    // Auto-detect Function ID
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

  // Fetch the specific discount by ID
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

  // Resolve free gift variant IDs to product info for display
  let freeGiftProducts: FreeGiftProduct[] = []
  if (bundle.freeGiftVariantIds.length > 0) {
    freeGiftProducts = await resolveVariantProducts(admin, bundle.freeGiftVariantIds)
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

  if (id === 'new' && !data.functionId?.trim()) {
    errors.functionId = 'Function ID is required. Deploy the bundle-order-discount extension first.'
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
  const platformApiUrl = process.env.CGK_PLATFORM_API_URL
  const platformApiKey = process.env.CGK_PLATFORM_API_KEY
  // TODO: For multi-tenant support, replace with dynamic tenant detection
  // from admin.session.shop → organizations.shopify_store_domain lookup.
  // Current model: one Shopify app instance per tenant with CGK_TENANT_SLUG env var.
  const tenantSlug = process.env.CGK_TENANT_SLUG

  if (platformApiUrl && platformApiKey && tenantSlug) {
    const bundle = data.bundle
    const platformPayload = {
      name: data.title,
      discount_type: bundle.discountType,
      tiers: bundle.tiers.map((t: TierConfig) => ({
        count: t.count,
        discount: t.discount,
        label: t.label || '',
      })),
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
        // Use bundleId from config if available
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
      // Non-blocking: log but don't fail the save
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
  const [tiers, setTiers] = useState<TierConfig[]>(initialBundle.tiers)
  const [freeGiftProducts, setFreeGiftProducts] = useState<FreeGiftProduct[]>(
    initialFreeGiftProducts
  )
  const [functionId, setFunctionId] = useState(initialFunctionId)
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})

  // Merge server errors with client errors (server takes priority)
  const errors = { ...clientErrors, ...actionData?.errors }

  const handleAddTier = useCallback(() => {
    const lastTier = tiers[tiers.length - 1]
    setTiers([
      ...tiers,
      {
        count: (lastTier?.count ?? 1) + 1,
        discount: (lastTier?.discount ?? 5) + 5,
      },
    ])
  }, [tiers])

  const handleRemoveTier = useCallback(
    (index: number) => {
      if (tiers.length <= 1) return
      setTiers(tiers.filter((_, i) => i !== index))
    },
    [tiers]
  )

  const handleTierChange = useCallback(
    (index: number, field: keyof TierConfig, value: string) => {
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

  const handleSelectFreeGifts = useCallback(async () => {
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

      // Merge with existing, avoiding duplicates by variantId
      const existingIds = new Set(freeGiftProducts.map((p) => p.variantId))
      const merged = [
        ...freeGiftProducts,
        ...newProducts.filter((p) => !existingIds.has(p.variantId)),
      ]
      setFreeGiftProducts(merged)
    } catch {
      // User cancelled the picker
    }
  }, [shopify, freeGiftProducts])

  const handleRemoveFreeGift = useCallback(
    (variantId: string) => {
      setFreeGiftProducts(freeGiftProducts.filter((p) => p.variantId !== variantId))
    },
    [freeGiftProducts]
  )

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    } else if (title.length > 255) {
      newErrors.title = 'Title must be 255 characters or fewer'
    }

    if (isNew && !functionId.trim()) {
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

    const counts = tiers.map((t) => t.count)
    const uniqueCounts = new Set(counts)
    if (uniqueCounts.size !== counts.length) {
      newErrors.tiers = 'Each tier must have a unique item count'
    }

    setClientErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [title, tiers, discountType, isNew, functionId])

  const handleSave = useCallback(() => {
    if (!validate()) return

    const freeGiftVariantIds = freeGiftProducts.map((p) => p.variantId)

    const bundle: BundleConfig = {
      bundleId: bundleId || `bundle-${Date.now()}`,
      discountType,
      tiers: [...tiers].sort((a, b) => a.count - b.count),
      freeGiftVariantIds,
    }

    const formData = new FormData()
    formData.set(
      'bundleData',
      JSON.stringify({ title, bundle, functionId })
    )
    submit(formData, { method: 'post' })
  }, [validate, title, bundleId, discountType, tiers, freeGiftProducts, functionId, submit])

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

        {isNew && functionAutoDetected && functionId && (
          <Layout.Section>
            <Banner tone="success">
              Bundle discount function auto-detected.
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
                  <TextField
                    label="Function ID"
                    value={functionId}
                    onChange={setFunctionId}
                    autoComplete="off"
                    helpText={
                      functionAutoDetected
                        ? 'Auto-detected from deployed functions. You can override this.'
                        : 'The Shopify Function ID for the bundle-order-discount extension. Deploy the extension first, then enter the Function ID or run: shopify app function info'
                    }
                    error={errors.functionId}
                    placeholder="e.g. 01ABCDEF-1234-5678-9ABC-DEF012345678"
                    disabled={isSubmitting}
                  />
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
                <Button onClick={handleAddTier} disabled={isSubmitting}>
                  Add tier
                </Button>
              </InlineStack>

              {errors.tiers && (
                <Banner tone="critical">{errors.tiers}</Banner>
              )}

              <Text as="p" variant="bodyMd" tone="subdued">
                Define discount amounts based on how many items are in the
                bundle. Higher tiers override lower ones.
              </Text>

              {tiers.map((tier, index) => (
                <Box key={index}>
                  {index > 0 && <Divider />}
                  <Box paddingBlockStart="300">
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
                  </Box>
                </Box>
              ))}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Free gifts
                </Text>
                <Button onClick={handleSelectFreeGifts} disabled={isSubmitting}>
                  Select products
                </Button>
              </InlineStack>
              <Text as="p" variant="bodyMd" tone="subdued">
                Products automatically added as free gifts when customers
                qualify. Free gifts receive a 100% discount at checkout via the
                bundle discount function.
              </Text>

              {freeGiftProducts.length > 0 ? (
                <BlockStack gap="300">
                  {freeGiftProducts.map((product) => (
                    <InlineStack
                      key={product.variantId}
                      gap="300"
                      align="start"
                      blockAlign="center"
                    >
                      <Thumbnail
                        source={product.imageUrl ?? ''}
                        alt={product.productTitle}
                        size="small"
                      />
                      <Box minWidth="0">
                        <BlockStack gap="050">
                          <Text as="span" variant="bodyMd" fontWeight="semibold">
                            {product.productTitle}
                          </Text>
                          {product.variantTitle !== 'Default Title' && (
                            <Text as="span" variant="bodySm" tone="subdued">
                              {product.variantTitle}
                            </Text>
                          )}
                        </BlockStack>
                      </Box>
                      <Button
                        variant="plain"
                        tone="critical"
                        onClick={() => handleRemoveFreeGift(product.variantId)}
                        disabled={isSubmitting}
                      >
                        Remove
                      </Button>
                    </InlineStack>
                  ))}
                </BlockStack>
              ) : (
                <Text as="p" variant="bodySm" tone="subdued">
                  No free gifts selected. Click "Select products" to add.
                </Text>
              )}
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
                  <InlineStack key={tier.count} gap="200">
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {tier.count}+ items:
                    </Text>
                    <Text as="span" variant="bodyMd">
                      {discountType === 'percentage'
                        ? `${tier.discount}% off`
                        : `$${tier.discount} off each item`}
                    </Text>
                  </InlineStack>
                ))}
              {freeGiftProducts.length > 0 && (
                <>
                  <Divider />
                  <Text as="p" variant="bodyMd">
                    {freeGiftProducts.length} free gift
                    {freeGiftProducts.length !== 1 ? 's' : ''} included when
                    bundle qualifies.
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
