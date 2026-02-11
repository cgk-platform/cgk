'use client'

import { Badge, cn } from '@cgk/ui'
import { MoreHorizontal, Mail, Eye, Edit, Power, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'

import { CreatorStatusBadge, CreatorTierBadge } from '@/components/commerce/status-badge'
import type { CreatorWithEarnings } from '@/lib/creators/types'
import { formatMoney, formatDate } from '@/lib/format'

interface CreatorTableViewProps {
  creators: CreatorWithEarnings[]
}

export function CreatorTableView({ creators }: CreatorTableViewProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === creators.length) {
        return new Set()
      }
      return new Set(creators.map((c) => c.id))
    })
  }, [creators])

  const handleBulkAction = useCallback(
    (action: string) => {
      const ids = Array.from(selectedIds).join(',')
      router.push(`/admin/creators?modal=bulk&action=${action}&ids=${ids}`)
    },
    [selectedIds, router],
  )

  const allSelected = creators.length > 0 && selectedIds.size === creators.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < creators.length

  return (
    <div className="space-y-2">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="ml-4 flex gap-2">
            <button
              onClick={() => handleBulkAction('status')}
              className="rounded-md bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
            >
              Change Status
            </button>
            <button
              onClick={() => handleBulkAction('tags')}
              className="rounded-md bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
            >
              Assign Tags
            </button>
            <button
              onClick={() => handleBulkAction('tier')}
              className="rounded-md bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
            >
              Update Tier
            </button>
            <button
              onClick={() => handleBulkAction('export')}
              className="rounded-md bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
            >
              Export Selected
            </button>
            <button
              onClick={() => handleBulkAction('deactivate')}
              className="rounded-md bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/20"
            >
              Deactivate
            </button>
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Creator</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tier</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Earnings</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Projects</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Applied</th>
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {creators.map((creator) => {
              const isSelected = selectedIds.has(creator.id)
              const name = creator.display_name || `${creator.first_name} ${creator.last_name}`
              const initials = name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()

              return (
                <tr
                  key={creator.id}
                  className={cn(
                    'group transition-colors hover:bg-muted/30',
                    isSelected && 'bg-primary/5',
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(creator.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/creators/${creator.id}`}
                      className="flex items-center gap-3 hover:underline"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {creator.avatar_url ? (
                          <img
                            src={creator.avatar_url}
                            alt={name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{name}</div>
                        <div className="truncate text-xs text-muted-foreground">{creator.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <CreatorStatusBadge status={creator.status} />
                  </td>
                  <td className="px-4 py-3">
                    <CreatorTierBadge tier={creator.tier} />
                  </td>
                  <td className="px-4 py-3">
                    {(creator as { referral_code?: string }).referral_code ? (
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {(creator as { referral_code?: string }).referral_code}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatMoney(Number(creator.total_earned_cents))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{creator.total_projects}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(creator.applied_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === creator.id ? null : creator.id)}
                        className="rounded p-1 opacity-0 hover:bg-muted group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {activeMenuId === creator.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-0 top-8 z-20 w-48 rounded-md border bg-popover p-1 shadow-lg">
                            <Link
                              href={`/admin/creators/${creator.id}`}
                              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                              onClick={() => setActiveMenuId(null)}
                            >
                              <Eye className="h-4 w-4" />
                              View Profile
                            </Link>
                            <Link
                              href={`/admin/creators/${creator.id}?tab=inbox`}
                              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                              onClick={() => setActiveMenuId(null)}
                            >
                              <Mail className="h-4 w-4" />
                              View Inbox
                            </Link>
                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                router.push(`/admin/creators?modal=edit&id=${creator.id}`)
                              }}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                            >
                              <Edit className="h-4 w-4" />
                              Edit Creator
                            </button>
                            <hr className="my-1 border-border" />
                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                router.push(`/admin/creators?modal=deactivate&id=${creator.id}`)
                              }}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            >
                              <Power className="h-4 w-4" />
                              {creator.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                router.push(`/admin/creators?modal=delete&id=${creator.id}`)
                              }}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
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
