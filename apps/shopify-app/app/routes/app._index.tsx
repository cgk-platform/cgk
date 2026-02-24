/**
 * Bundle Configuration — Admin App Home
 *
 * Lists active bundle discount configurations and allows merchants
 * to create, edit, or delete bundle rules from the Shopify admin.
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useLoaderData, useSubmit, useNavigation } from '@remix-run/react'
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
} from '@shopify/polaris'
import { authenticate } from '../shopify.server'
import {
  listBundleDiscounts,
  deleteBundleDiscount,
  parseBundleConfig,
} from '../lib/bundle-config.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request)

  const nodes = await listBundleDiscounts(admin)

  const discounts = nodes.map((node: any) => {
    const discount = node.automaticDiscount
    const config = parseBundleConfig(node.metafield?.value)
    return {
      id: node.id,
      title: discount?.title ?? 'Untitled',
      status: discount?.status ?? 'UNKNOWN',
      bundleCount: config.bundles.length,
      config,
    }
  })

  return json({ discounts })
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request)
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'delete') {
    const discountId = formData.get('discountId') as string
    if (discountId) {
      await deleteBundleDiscount(admin, discountId)
    }
  }

  return json({ ok: true })
}

export default function BundlesIndex() {
  const { discounts } = useLoaderData<typeof loader>()
  const submit = useSubmit()
  const navigation = useNavigation()
  const isLoading = navigation.state !== 'idle'

  if (discounts.length === 0) {
    return (
      <Page title="Bundle Builder">
        <Layout>
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
                  Set up discount tiers, free gifts, and pricing rules for your
                  bundle builder. Discounts are enforced server-side at checkout.
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
                  1. Create a bundle discount with tier rules (e.g., 10% off for
                  2 items, 15% for 3, 20% for 4+).
                </Text>
                <Text as="p" variant="bodyMd">
                  2. Add the Bundle Builder block to any page in the theme
                  editor.
                </Text>
                <Text as="p" variant="bodyMd">
                  3. Customers build their bundle on the storefront. The
                  discount function enforces the tier pricing at checkout.
                </Text>
                <Text as="p" variant="bodyMd">
                  4. Optionally, the Cart Transform merges bundle items into a
                  single line in the cart for a cleaner experience.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  const rows = discounts.map((discount: typeof discounts[number]) => [
    discount.title,
    <Badge
      key={discount.id}
      tone={discount.status === 'ACTIVE' ? 'success' : undefined}
    >
      {discount.status}
    </Badge>,
    String(discount.bundleCount),
    <InlineStack key={discount.id} gap="200">
      <Button url={`/app/bundles/${encodeURIComponent(discount.id)}`}>
        Edit
      </Button>
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
    >
      <Layout>
        <Layout.Section>
          <Banner tone="info">
            Bundle discounts are enforced server-side by a Shopify Function.
            Changes here update the discount metafield configuration.
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
