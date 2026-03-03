/**
 * Bundle Configuration — Admin App Home
 *
 * Lists active bundle discount configurations and allows merchants
 * to create, edit, or delete bundle rules from the Shopify admin.
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useLoaderData, useSubmit, useNavigation, useActionData } from '@remix-run/react'
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  Banner,
  EmptyState,
  Badge,
  BlockStack,
  InlineStack,
  Text,
  Spinner,
} from '@shopify/polaris'
import { authenticate } from '../shopify.server'
import {
  listBundleDiscounts,
  deleteBundleDiscount,
  parseBundleConfig,
} from '../lib/bundle-config.server'
import { logger } from '@cgk-platform/logging'

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request)

  try {
    const nodes = await listBundleDiscounts(admin)

    const discounts = nodes.map((node: unknown) => {
      const n = node as Record<string, unknown>
      const discount = n.automaticDiscount as Record<string, unknown> | undefined
      const metafield = n.metafield as Record<string, unknown> | undefined
      const config = parseBundleConfig(metafield?.value as unknown as string)
      return {
        id: n.id as unknown as string,
        title: (discount?.title as unknown as string) ?? 'Untitled',
        status: (discount?.status as unknown as string) ?? 'UNKNOWN',
        bundleCount: config.bundles.length,
        config,
      }
    })

    return json({ discounts, error: null })
  } catch (err) {
    logger.error(
      '[BundleBuilder] Failed to load discounts:',
      err instanceof Error ? err : new Error(String(err))
    )
    return json({
      discounts: [],
      error: 'Failed to load bundle discounts. Please try refreshing the page.',
    })
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request)
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'delete') {
    const discountId = formData.get('discountId') as string
    if (discountId) {
      const result = await deleteBundleDiscount(admin, discountId)
      if (!result.success) {
        return json({
          ok: false,
          error: result.userErrors.map((e) => e.message).join(', '),
        })
      }
      return json({ ok: true, deleted: true })
    }
  }

  return json({ ok: true })
}

export default function BundlesIndex() {
  const { discounts, error: loaderError } = useLoaderData<typeof loader>()
  const actionData = useActionData<{ ok?: boolean; deleted?: boolean; error?: string }>()
  const submit = useSubmit()
  const navigation = useNavigation()
  const isLoading = navigation.state !== 'idle'

  if (loaderError) {
    return (
      <Page title="Bundle Builder">
        <Layout>
          <Layout.Section>
            <Banner tone="critical">{loaderError}</Banner>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  if (discounts.length === 0) {
    return (
      <Page title="Bundle Builder">
        <Layout>
          {actionData?.deleted && (
            <Layout.Section>
              <Banner tone="success" onDismiss={() => {}}>
                Bundle discount deleted successfully.
              </Banner>
            </Layout.Section>
          )}
          <Layout.Section>
            <Card>
              <EmptyState
                heading="Configure your bundle discounts"
                action={{
                  content: 'Create bundle discount',
                  url: '/app/bundles/new',
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Set up discount tiers, free gifts, and pricing rules for your bundle builder.
                  Discounts are enforced server-side at checkout.
                </p>
              </EmptyState>
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  How it works
                </Text>
                <Text as="p" variant="bodyMd">
                  1. Create a bundle discount with tier rules (e.g., 10% off for 2 items, 15% for 3,
                  20% for 4+).
                </Text>
                <Text as="p" variant="bodyMd">
                  2. Add the Bundle Builder block to any page in the theme editor.
                </Text>
                <Text as="p" variant="bodyMd">
                  3. Customers build their bundle on the storefront. The discount function enforces
                  the tier pricing at checkout.
                </Text>
                <Text as="p" variant="bodyMd">
                  4. Optionally, the Cart Transform merges bundle items into a single line in the
                  cart for a cleaner experience.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  const rows = discounts.map((discount: (typeof discounts)[number]) => [
    discount.title,
    <Badge key={discount.id} tone={discount.status === 'ACTIVE' ? 'success' : undefined}>
      {discount.status}
    </Badge>,
    String(discount.bundleCount),
    <InlineStack key={discount.id} gap="200">
      <Button url={`/app/bundles/${encodeURIComponent(discount.id)}`}>Edit</Button>
      <Button
        variant="plain"
        tone="critical"
        loading={isLoading}
        onClick={() => {
          if (confirm('Delete this bundle discount?')) {
            const formData = new FormData()
            formData.set('intent', 'delete')
            formData.set('discountId', discount.id)
            submit(formData, { method: 'post' })
          }
        }}
      >
        Delete
      </Button>
    </InlineStack>,
  ])

  return (
    <Page
      title="Bundle Builder"
      primaryAction={{
        content: 'Create bundle discount',
        url: '/app/bundles/new',
      }}
      secondaryActions={[]}
    >
      <Layout>
        {actionData?.error && (
          <Layout.Section>
            <Banner tone="critical">{actionData.error}</Banner>
          </Layout.Section>
        )}
        {actionData?.deleted && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => {}}>
              Bundle discount deleted successfully.
            </Banner>
          </Layout.Section>
        )}
        <Layout.Section>
          <Banner tone="info">
            Bundle discounts are enforced server-side by a Shopify Function. Changes here update the
            discount metafield configuration.
          </Banner>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <DataTable
              columnContentTypes={['text', 'text', 'numeric', 'text']}
              headings={['Title', 'Status', 'Bundles', 'Actions']}
              rows={rows}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
