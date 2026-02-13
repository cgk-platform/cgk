'use client'

import { cn } from '@cgk-platform/ui'
import {
  ShoppingBag,
  Facebook,
  Globe,
  Phone,
  MessageSquare,
  Mail,
  Star,
  Cpu,
  ExternalLink,
  Clock,
  Key,
  Shield,
  Settings,
} from 'lucide-react'
import Link from 'next/link'

import { ConnectionStatusBadge } from './connection-status-badge'
import type { IntegrationCard as IntegrationCardType, ConnectionType } from '@/lib/integrations/types'

interface IntegrationCardProps {
  integration: IntegrationCardType
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  shopify: ShoppingBag,
  meta: Facebook,
  google: Globe,
  tiktok: Globe,
  phone: Phone,
  slack: MessageSquare,
  mail: Mail,
  star: Star,
  cpu: Cpu,
}

const connectionTypeLabels: Record<ConnectionType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  oauth: { label: 'OAuth', icon: Shield },
  api_key: { label: 'API Key', icon: Key },
  env: { label: 'Environment', icon: Settings },
  hybrid: { label: 'Hybrid', icon: Settings },
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function IntegrationCard({ integration }: IntegrationCardProps) {
  const Icon = iconMap[integration.icon] || Globe
  const connectionTypeConfig = connectionTypeLabels[integration.connectionType]
  const ConnectionIcon = connectionTypeConfig.icon

  return (
    <Link
      href={integration.configPath}
      className={cn(
        'group relative flex flex-col rounded-lg border bg-card p-4 transition-all',
        'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5',
        integration.status === 'error' && 'border-rose-500/30'
      )}
    >
      {/* Top row: Icon + Status */}
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            integration.status === 'connected' && 'bg-emerald-500/10 text-emerald-500',
            integration.status === 'disconnected' && 'bg-zinc-500/10 text-zinc-500',
            integration.status === 'error' && 'bg-rose-500/10 text-rose-500',
            integration.status === 'pending' && 'bg-amber-500/10 text-amber-500'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <ConnectionStatusBadge
          status={integration.status}
          details={integration.statusDetails}
          showPulse={integration.status === 'connected'}
        />
      </div>

      {/* Name + Description */}
      <div className="mt-3">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {integration.name}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
          {integration.description}
        </p>
      </div>

      {/* Bottom row: Connection type + Last sync */}
      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <ConnectionIcon className="h-3 w-3" />
          <span className="font-mono">{connectionTypeConfig.label}</span>
        </div>
        {integration.lastSyncedAt ? (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="font-mono">{formatTimeAgo(integration.lastSyncedAt)}</span>
          </div>
        ) : (
          <span className="text-muted-foreground/50">Never synced</span>
        )}
      </div>

      {/* Hover indicator */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  )
}
