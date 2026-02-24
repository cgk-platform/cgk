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
  useParams,
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
} from '@shopify/polaris'
import { authenticate } from '../shopify.server'
import type { BundleConfig, TierConfig, BundleDiscountConfig } from '../lib/bundle-config.server'
import {
  parseBundleConfig,
  createBundleDiscount,
  updateBundleDiscountConfig,
} from '../lib/bundle-config.server'

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
    return json({
      isNew: true,
      discountId: null,
      title: '',
      bundle: DEFAULT_BUNDLE,
      functionId: '',
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

  return json({
    isNew: false,
    discountId: id,
    title: node.discount?.title ?? '',
    bundle,
    functionId: '',
  })
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request)
  const formData = await request.formData()
  const rawData = formData.get('bundleData') as string

  if (!rawData) {
    return json({ error: 'Missing bundle data' }, { status: 400 })
  }

  let data: {
    title: string
    bundle: BundleConfig
    functionId?: string
  }

  try {
    data = JSON.parse(rawData)
  } catch {
    return json({ error: 'Invalid bundle data' }, { status: 400 })
  }

  const config: BundleDiscountConfig = {
    bundles: [data.bundle],
  }

  const { id } = params

  if (id === 'new') {
    if (!data.functionId) {
      return json(
        { error: 'Function ID is required to create a discount. Deploy the bundle-order-discount extension first, then enter the Function ID.' },
        { status: 400 }
      )
    }
    await createBundleDiscount(admin, {
      title: data.title,
      functionId: data.functionId,
      config,
    })
  } else {
    await updateBundleDiscountConfig(admin, {
      discountId: id!,
      title: data.title,
      config,
    })
  }

  return redirect('/app')
}

export default function BundleEdit() {
  const { isNew, title: initialTitle, bundle: initialBundle, functionId: initialFunctionId } =
    useLoaderData<typeof loader>()
  const submit = useSubmit()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  const [title, setTitle] = useState(initialTitle)
  const [bundleId, setBundleId] = useState(initialBundle.bundleId)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    initialBundle.discountType
  )
  const [tiers, setTiers] = useState<TierConfig[]>(initialBundle.tiers)
  const [freeGiftIds, setFreeGiftIds] = useState(
    initialBundle.freeGiftVariantIds.join(', ')
  )
  const [functionId, setFunctionId] = useState(initialFunctionId)
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (isNew && !functionId.trim()) {
      newErrors.functionId = 'Function ID is required for new discounts'
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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [title, tiers, discountType, isNew, functionId])

  const handleSave = useCallback(() => {
    if (!validate()) return

    const freeGiftVariantIds = freeGiftIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

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
  }, [validate, title, bundleId, discountType, tiers, freeGiftIds, functionId, submit])

  return (
    <Page
      title={isNew ? 'Create bundle discount' : 'Edit bundle discount'}
      backAction={{ url: '/app' }}
      primaryAction={{
        content: isNew ? 'Create' : 'Save',
        loading: isSubmitting,
        onAction: handleSave,
      }}
    >
      <Layout>
        {Object.keys(errors).length > 0 && (
          <Layout.Section>
            <Banner tone="critical">
              Please fix the errors below before saving.
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
                />
                <TextField
                  label="Bundle ID"
                  value={bundleId}
                  onChange={setBundleId}
                  autoComplete="off"
                  helpText="Maps to the theme block ID. Leave blank to auto-generate."
                  placeholder="e.g. block-abc123"
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
                />
                {isNew && (
                  <TextField
                    label="Function ID"
                    value={functionId}
                    onChange={setFunctionId}
                    autoComplete="off"
                    helpText="The Shopify Function ID for the bundle-order-discount extension. Find this in the Partners Dashboard after deploying, or run: shopify app function info"
                    error={errors.functionId}
                    placeholder="e.g. 01ABCDEF-1234-5678-9ABC-DEF012345678"
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
                <Button onClick={handleAddTier}>Add tier</Button>
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
                        />
                      </Box>
                      {tiers.length > 1 && (
                        <Button
                          variant="plain"
                          tone="critical"
                          onClick={() => handleRemoveTier(index)}
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
              <Text as="h2" variant="headingMd">
                Free gifts
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Product variant IDs that are automatically added as free gifts
                when customers qualify. Free gifts receive a 100% discount at
                checkout via the bundle discount function.
              </Text>
              <TextField
                label="Free gift variant IDs"
                value={freeGiftIds}
                onChange={setFreeGiftIds}
                autoComplete="off"
                helpText="Comma-separated Shopify variant IDs (e.g. gid://shopify/ProductVariant/12345)"
                placeholder="gid://shopify/ProductVariant/12345, gid://shopify/ProductVariant/67890"
                multiline={2}
              />
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
              {freeGiftIds.trim() && (
                <>
                  <Divider />
                  <Text as="p" variant="bodyMd">
                    Free gift(s) included when bundle qualifies.
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
