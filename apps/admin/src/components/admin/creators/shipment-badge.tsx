'use client'

import { Package } from 'lucide-react'

import { Badge, cn } from '@cgk/ui'

import type { ShipmentStatus } from '../../../lib/creators/lifecycle-types'
import { getTrackingUrl, SHIPMENT_STATUS_CONFIG } from '../../../lib/creators/lifecycle-types'

interface ShipmentBadgeProps {
  status: ShipmentStatus
  trackingNumber?: string
  carrier?: string
  className?: string
}

export function ShipmentBadge({ status, trackingNumber, carrier, className }: ShipmentBadgeProps) {
  const config = SHIPMENT_STATUS_CONFIG[status]

  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    red: 'bg-red-100 text-red-700 border-red-200',
  }

  const badge = (
    <Badge
      variant="outline"
      className={cn(colorClasses[config.color], 'gap-1 border', className)}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </Badge>
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
      className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 text-xs hover:bg-muted"
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
