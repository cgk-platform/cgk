'use client'

import { cn } from '@cgk-platform/ui'
import {
  Folder,
  FolderPlus,
  ChevronRight,
  Image as ImageIcon,
  Heart,
  Archive,
  Clock,
  Sparkles,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import type { Collection } from '@cgk-platform/dam'

export interface CollectionSidebarProps {
  collections: Collection[]
  onCreateCollection?: () => void
  assetStats?: {
    total: number
    favorites: number
    archived: number
    recent: number
  }
}

const quickFilters = [
  { id: 'all', label: 'All Assets', icon: ImageIcon, href: '/admin/dam' },
  { id: 'favorites', label: 'Favorites', icon: Heart, href: '/admin/dam?filter=favorites' },
  { id: 'recent', label: 'Recent', icon: Clock, href: '/admin/dam?filter=recent' },
  { id: 'archived', label: 'Archived', icon: Archive, href: '/admin/dam?filter=archived' },
]

export function CollectionSidebar({
  collections,
  onCreateCollection,
  assetStats,
}: CollectionSidebarProps) {
  const pathname = usePathname()
  const [isCollectionsExpanded, setIsCollectionsExpanded] = useState(true)

  const manualCollections = collections.filter(c => c.collection_type === 'manual')
  const smartCollections = collections.filter(c => c.collection_type === 'smart')

  return (
    <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Asset Library</h2>
        {assetStats && (
          <p className="mt-1 text-sm text-slate-500">
            {assetStats.total.toLocaleString()} assets
          </p>
        )}
      </div>

      {/* Quick filters */}
      <div className="border-b border-slate-800 p-2">
        <nav className="space-y-0.5">
          {quickFilters.map(({ id, label, icon: Icon, href }) => {
            const isActive = pathname === href || (id === 'all' && pathname === '/admin/dam' && !window.location.search)
            const count = assetStats?.[id as keyof typeof assetStats]

            return (
              <Link
                key={id}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                )}
              >
                <Icon className={cn('h-4 w-4', id === 'favorites' && isActive && 'fill-amber-500')} />
                <span className="flex-1">{label}</span>
                {typeof count === 'number' && count > 0 && (
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    isActive ? 'bg-amber-500/20' : 'bg-slate-800'
                  )}>
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Collections */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Manual collections */}
        <div className="mb-4">
          <button
            onClick={() => setIsCollectionsExpanded(!isCollectionsExpanded)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 hover:bg-slate-800 hover:text-slate-300"
          >
            <ChevronRight className={cn(
              'h-3.5 w-3.5 transition-transform',
              isCollectionsExpanded && 'rotate-90'
            )} />
            Collections
            <span className="ml-auto rounded bg-slate-800 px-1.5 py-0.5 text-[10px]">
              {manualCollections.length}
            </span>
          </button>

          {isCollectionsExpanded && (
            <div className="mt-1 space-y-0.5 pl-2">
              {manualCollections.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-600">No collections yet</p>
              ) : (
                manualCollections.map(collection => (
                  <Link
                    key={collection.id}
                    href={`/admin/dam/collections/${collection.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      pathname === `/admin/dam/collections/${collection.id}`
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    )}
                  >
                    <Folder className="h-4 w-4" />
                    <span className="flex-1 truncate">{collection.name}</span>
                    <span className="text-xs text-slate-600">{collection.asset_count}</span>
                  </Link>
                ))
              )}

              <button
                onClick={onCreateCollection}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-800 hover:text-slate-300"
              >
                <FolderPlus className="h-4 w-4" />
                New Collection
              </button>
            </div>
          )}
        </div>

        {/* Smart collections */}
        {smartCollections.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Smart Collections
              </span>
            </div>

            <div className="mt-1 space-y-0.5 pl-2">
              {smartCollections.map(collection => (
                <Link
                  key={collection.id}
                  href={`/admin/dam/collections/${collection.id}`}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    pathname === `/admin/dam/collections/${collection.id}`
                      ? 'bg-violet-500/10 text-violet-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  )}
                >
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <span className="flex-1 truncate">{collection.name}</span>
                  <span className="text-xs text-slate-600">{collection.asset_count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 p-2">
        <Link
          href="/admin/dam/gdrive"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            pathname === '/admin/dam/gdrive'
              ? 'bg-slate-800 text-slate-200'
              : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
          )}
        >
          <svg className="h-4 w-4" viewBox="0 0 87.3 78" fill="currentColor">
            <path d="M6.6 66.85L18.75 78h47.2l12.15-11.15z" />
            <path d="M58.6 78l28.7-50.65L75.15 0l-28.7 50.65z" />
            <path d="M0 66.85L28.7 16.2h24.25L24.25 66.85z" />
          </svg>
          Google Drive
        </Link>

        <Link
          href="/admin/dam/import-queue"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            pathname === '/admin/dam/import-queue'
              ? 'bg-slate-800 text-slate-200'
              : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
          )}
        >
          <Clock className="h-4 w-4" />
          Import Queue
        </Link>

        <Link
          href="/admin/dam/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            pathname === '/admin/dam/settings'
              ? 'bg-slate-800 text-slate-200'
              : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  )
}
