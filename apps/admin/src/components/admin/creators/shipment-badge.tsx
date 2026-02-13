/**
 * Shipment Status Badge
 *
 * Specialized badge with tracking link support.
 */

'use client'

import { Package } from 'lucide-react'

import { StatusBadge, type StatusBadgeProps } from '@cgk-platform/ui'

import type { ShipmentStatus } from '../../../lib/creators/lifecycle-types'
import { getTrackingUrl, SHIPMENT_STATUS_CONFIG } from '../../../lib/creators/lifecycle-types'

interface ShipmentBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  status: ShipmentStatus
  trackingNumber?: string
  carrier?: string
}

export function ShipmentBadge({
  status,
  trackingNumber,
  carrier,
  className,
  ...props
}: ShipmentBadgeProps) {
  const config = SHIPMENT_STATUS_CONFIG[status]

  const badge = (
    <StatusBadge
      status={status}
      label={config.label}
      className={className}
      {...props}
    />
  )

  if (trackingNumber && carrier && status === 'shipped') {
    const url = getTrackingUrl(carrier, trackingNumber)
    if (url !== '#') {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
          {badge}
        </a>
      )
    }
  }

  return badge
}

interface ShipmentSummaryBadgeProps {
  totalProducts: number
  latestStatus?: ShipmentStatus
  latestDate?: string
  onClick?: () => void
}

export function ShipmentSummaryBadge({
  totalProducts,
  latestStatus,
  latestDate,
  onClick,
}: ShipmentSummaryBadgeProps) {
  if (totalProducts === 0) {
    return null
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 text-xs transition-colors duration-fast hover:bg-muted"
    >
      <Package className="h-3 w-3 text-muted-foreground" />
      <span>
        {totalProducts} product{totalProducts !== 1 ? 's' : ''} sent
      </span>
      {latestStatus && latestDate && (
        <span className="text-muted-foreground">
          {SHIPMENT_STATUS_CONFIG[latestStatus].label} ({formatDate(latestDate)})
        </span>
      )}
    </button>
  )
}
