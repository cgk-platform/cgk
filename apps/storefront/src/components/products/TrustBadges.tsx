/**
 * TrustBadges Component
 *
 * Displays trust signals for the storefront (Free Shipping, 30-Day Returns, US Support).
 * Matches Meliusly Figma design specifications with responsive layouts.
 */

import { Truck, Undo2, Headphones } from 'lucide-react'
import { cn } from '@cgk-platform/ui'

interface TrustBadgesProps {
  className?: string
}

interface Badge {
  icon: React.ComponentType<{ className?: string }>
  text: string
}

const badges: Badge[] = [
  {
    icon: Truck,
    text: 'Free Shipping on all orders',
  },
  {
    icon: Undo2,
    text: '30-Day Returns',
  },
  {
    icon: Headphones,
    text: 'US-Based Customer Support',
  },
]

export function TrustBadges({ className }: TrustBadgesProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-center lg:gap-6',
        className
      )}
    >
      {badges.map((badge) => {
        const Icon = badge.icon
        return (
          <div key={badge.text} className="flex items-center gap-2 lg:gap-3">
            <Icon className="h-5 w-5 shrink-0 text-meliusly-primary lg:h-6 lg:w-6" />
            <span className="font-manrope text-sm font-medium text-meliusly-dark lg:text-base">
              {badge.text}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default TrustBadges
