'use client'

/**
 * Gallery Stats Component
 * Clickable stat cards for filtering submissions
 */

import { cn } from '@cgk/ui'

import type { UGCGalleryStats } from '@/lib/admin-utilities/types'

interface GalleryStatsProps {
  stats: UGCGalleryStats
  activeFilter?: 'all' | 'pending' | 'approved' | 'rejected'
  onFilterChange?: (filter: 'all' | 'pending' | 'approved' | 'rejected') => void
}

export function GalleryStats({
  stats,
  activeFilter = 'all',
  onFilterChange,
}: GalleryStatsProps) {
  const statCards = [
    {
      key: 'all' as const,
      label: 'Total',
      value: stats.total,
      color: 'bg-stone-900 text-white',
      activeColor: 'ring-2 ring-stone-900 ring-offset-2',
    },
    {
      key: 'pending' as const,
      label: 'Pending Review',
      value: stats.pending,
      color: 'bg-amber-50 text-amber-900 border border-amber-200',
      activeColor: 'ring-2 ring-amber-500 ring-offset-2',
      dot: 'bg-amber-500',
    },
    {
      key: 'approved' as const,
      label: 'Approved',
      value: stats.approved,
      color: 'bg-emerald-50 text-emerald-900 border border-emerald-200',
      activeColor: 'ring-2 ring-emerald-500 ring-offset-2',
      dot: 'bg-emerald-500',
    },
    {
      key: 'rejected' as const,
      label: 'Rejected',
      value: stats.rejected,
      color: 'bg-rose-50 text-rose-900 border border-rose-200',
      activeColor: 'ring-2 ring-rose-500 ring-offset-2',
      dot: 'bg-rose-500',
    },
  ]

  return (
    <section className="border-b border-stone-200 bg-white px-6 py-6">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((card) => (
          <button
            key={card.key}
            onClick={() => onFilterChange?.(card.key)}
            className={cn(
              'group relative rounded-lg px-4 py-4 text-left transition-all',
              card.color,
              activeFilter === card.key && card.activeColor,
              'hover:scale-[1.02] active:scale-[0.98]'
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-70">
                  {card.label}
                </p>
                <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
                  {card.value}
                </p>
              </div>
              {card.dot && (
                <span
                  className={cn(
                    'mt-1 h-2 w-2 rounded-full',
                    card.dot,
                    card.key === 'pending' && stats.pending > 0 && 'animate-pulse'
                  )}
                />
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
