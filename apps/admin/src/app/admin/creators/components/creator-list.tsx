import { cn } from '@cgk-platform/ui'
import Link from 'next/link'

import { CreatorStatusBadge, CreatorTierBadge } from '@/components/commerce/status-badge'
import type { CreatorWithEarnings } from '@/lib/creators/types'
import { formatMoney, formatDate } from '@/lib/format'

interface CreatorListProps {
  creators: CreatorWithEarnings[]
}

export function CreatorList({ creators }: CreatorListProps) {
  if (creators.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No creators found matching your filters.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Creator</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tier</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Earned</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pending</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Projects</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Applied</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {creators.map((creator) => (
            <tr key={creator.id} className="hover:bg-muted/50">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/creators/${creator.id}`}
                  className="flex items-center gap-3 hover:underline"
                >
                  <CreatorAvatar
                    name={creator.display_name || `${creator.first_name} ${creator.last_name}`}
                    avatarUrl={creator.avatar_url}
                  />
                  <div>
                    <div className="font-medium">
                      {creator.display_name || `${creator.first_name} ${creator.last_name}`}
                    </div>
                    <div className="text-xs text-muted-foreground">{creator.email}</div>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3">
                <CreatorStatusBadge status={creator.status} />
              </td>
              <td className="px-4 py-3">
                <CreatorTierBadge tier={creator.tier} />
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {formatMoney(Number(creator.total_earned_cents))}
              </td>
              <td className="px-4 py-3 text-right">
                {formatMoney(Number(creator.pending_balance_cents))}
              </td>
              <td className="px-4 py-3 text-right">{creator.total_projects}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(creator.applied_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CreatorAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium',
        avatarUrl ? '' : 'bg-muted text-muted-foreground',
      )}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="h-10 w-10 rounded-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}
