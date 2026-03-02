import React from 'react'
import { Users, Star, Wrench, FileText } from 'lucide-react'

interface TrustBadge {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  subtitle: string
}

const trustBadges: TrustBadge[] = [
  {
    icon: Users,
    title: 'Over 500,000',
    subtitle: 'Happy Customers',
  },
  {
    icon: Star,
    title: 'Over 8,000',
    subtitle: '5-Star Reviews',
  },
  {
    icon: Wrench,
    title: 'Engineered',
    subtitle: 'and Designed in USA',
  },
  {
    icon: FileText,
    title: 'Featured',
    subtitle: 'in New York Times Wirecutter',
  },
]

export function TrustBar() {
  return (
    <section className="flex h-[121px] items-center justify-center bg-[#2E3F56] px-4 sm:px-8 md:px-20">
      <div className="flex w-full max-w-[1440px] items-center justify-center gap-12 md:gap-20">
        {trustBadges.map((badge, index) => (
          <TrustBadgeItem key={index} badge={badge} />
        ))}
      </div>
    </section>
  )
}

function TrustBadgeItem({ badge }: { badge: TrustBadge }) {
  const Icon = badge.icon

  return (
    <div className="group flex cursor-default items-center gap-6 text-left">
      {/* Icon with refined hover interaction */}
      <div className="transition-all duration-300 group-hover:-translate-y-1 group-hover:drop-shadow-[0_4px_12px_rgba(255,255,255,0.25)]">
        <Icon className="h-10 w-10 flex-shrink-0 text-white" strokeWidth={1.5} />
      </div>

      {/* Typography with Manrope font family */}
      <div className="flex flex-col gap-4">
        <h3 className="font-manrope text-[18px] leading-[1.3] font-semibold text-[#F6F6F6] capitalize">
          {badge.title}
        </h3>
        <p className="font-manrope text-[16px] leading-[1.6] font-medium tracking-[-0.16px] text-[#F6F6F6]">
          {badge.subtitle}
        </p>
      </div>
    </div>
  )
}
