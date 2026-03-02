import React from 'react'
import { ShieldCheck, Shield, Ruler, Flag } from 'lucide-react'

interface TrustBadge {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  subtitle: string
}

const trustBadges: TrustBadge[] = [
  {
    icon: ShieldCheck,
    title: 'Built to Last',
    subtitle: 'Premium materials',
  },
  {
    icon: Shield,
    title: 'Protected',
    subtitle: 'Lifetime warranty',
  },
  {
    icon: Ruler,
    title: 'Perfect Fit',
    subtitle: 'Custom sizes',
  },
  {
    icon: Flag,
    title: 'Made in USA',
    subtitle: 'Quality craftsmanship',
  },
]

export function TrustBar() {
  return (
    <section className="flex h-[121px] items-center justify-center bg-[#2E3F56] px-4">
      <div className="w-full max-w-7xl">
        {/* Desktop: Horizontal with dividers */}
        <div className="hidden md:grid md:grid-cols-4 md:divide-x md:divide-white/20">
          {trustBadges.map((badge, index) => (
            <TrustBadgeItem key={index} badge={badge} />
          ))}
        </div>

        {/* Mobile: 2x2 Grid, no dividers */}
        <div className="grid grid-cols-2 gap-6 md:hidden">
          {trustBadges.map((badge, index) => (
            <TrustBadgeItem key={index} badge={badge} />
          ))}
        </div>
      </div>
    </section>
  )
}

function TrustBadgeItem({ badge }: { badge: TrustBadge }) {
  const Icon = badge.icon

  return (
    <div className="group flex cursor-default flex-col items-center justify-center px-4 text-center md:px-6">
      {/* Icon with refined hover interaction */}
      <div className="mb-3 transition-all duration-300 group-hover:-translate-y-1 group-hover:drop-shadow-[0_4px_12px_rgba(255,255,255,0.25)]">
        <Icon className="h-8 w-8 text-white" strokeWidth={1.5} />
      </div>

      {/* Typography with Manrope font family */}
      <h3 className="mb-1 text-base leading-tight font-semibold tracking-wide text-white">
        {badge.title}
      </h3>
      <p className="text-[13px] leading-snug font-medium text-white/90">{badge.subtitle}</p>
    </div>
  )
}
