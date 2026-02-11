import { Badge } from '@cgk/ui'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

interface StatusBadgeProps {
  status: string
}

const POST_STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  published: { label: 'Published', variant: 'default' },
  scheduled: { label: 'Scheduled', variant: 'outline' },
  archived: { label: 'Archived', variant: 'destructive' },
}

const PAGE_STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  published: { label: 'Published', variant: 'default' },
  scheduled: { label: 'Scheduled', variant: 'outline' },
  archived: { label: 'Archived', variant: 'destructive' },
}

const DOCUMENT_CATEGORY_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  brand_voice: { label: 'Brand Voice', variant: 'default' },
  product_info: { label: 'Product Info', variant: 'secondary' },
  faq: { label: 'FAQ', variant: 'outline' },
  policies: { label: 'Policies', variant: 'outline' },
  guidelines: { label: 'Guidelines', variant: 'secondary' },
  templates: { label: 'Templates', variant: 'outline' },
}

export function PostStatusBadge({ status }: StatusBadgeProps) {
  const config = POST_STATUS_MAP[status] || { label: status, variant: 'outline' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function PageStatusBadge({ status }: StatusBadgeProps) {
  const config = PAGE_STATUS_MAP[status] || { label: status, variant: 'outline' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function DocumentCategoryBadge({ category }: { category: string }) {
  const config = DOCUMENT_CATEGORY_MAP[category] || { label: category, variant: 'outline' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
