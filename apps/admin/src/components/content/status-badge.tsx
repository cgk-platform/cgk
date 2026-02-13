/**
 * Content Status Badges
 *
 * Status badges for blog posts, pages, and brand documents.
 */

import { StatusBadge, type StatusBadgeProps } from '@cgk-platform/ui'

interface StatusBadgeWrapperProps extends Omit<StatusBadgeProps, 'status'> {
  status: string
}

export function PostStatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} {...props} />
}

export function PageStatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} {...props} />
}

export function DocumentCategoryBadge({
  category,
  ...props
}: { category: string } & Omit<StatusBadgeProps, 'status'>) {
  // Category badges use neutral styling since they're not semantic statuses
  const categoryLabels: Record<string, string> = {
    brand_voice: 'Brand Voice',
    product_info: 'Product Info',
    faq: 'FAQ',
    policies: 'Policies',
    guidelines: 'Guidelines',
    templates: 'Templates',
  }

  return (
    <StatusBadge
      status={category}
      label={categoryLabels[category] || category}
      variant="secondary"
      {...props}
    />
  )
}
