'use client'

import Link from 'next/link'
import { Edit2, ExternalLink } from 'lucide-react'

import { Badge, Button, cn } from '@cgk/ui'

import type { ABTest, ABVariant } from '@/lib/ab-tests/types'

interface TestHeaderProps {
  test: ABTest
  variants: ABVariant[]
}

export function TestHeader({ test, variants }: TestHeaderProps) {
  const statusConfig = {
    draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
    running: { label: 'Running', className: 'bg-emerald-100 text-emerald-700' },
    paused: { label: 'Paused', className: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Completed', className: 'bg-slate-100 text-slate-700' },
  }

  const { label, className } = statusConfig[test.status]

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {test.name}
            </h1>
            <Badge className={cn('text-xs', className)}>
              {test.status === 'running' && (
                <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              )}
              {label}
            </Badge>
          </div>
          {test.description && (
            <p className="mt-1 text-sm text-slate-500">{test.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span>
              <strong className="text-slate-700">{variants.length}</strong> variants
            </span>
            <span>
              <strong className="text-slate-700">
                {formatTestType(test.testType)}
              </strong>{' '}
              test
            </span>
            <span>
              <strong className="text-slate-700">{test.confidenceLevel * 100}%</strong>{' '}
              confidence
            </span>
            {test.startedAt && (
              <span>
                Started{' '}
                <strong className="text-slate-700">
                  {formatRelativeTime(test.startedAt)}
                </strong>
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {test.baseUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={test.baseUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-4 w-4" />
                View Page
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/ab-tests/${test.id}/edit`}>
              <Edit2 className="mr-1 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export function TestHeaderSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="h-6 w-20 rounded bg-slate-200" />
        </div>
        <div className="mt-3 flex gap-4">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="h-4 w-28 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  )
}

function formatTestType(type: string): string {
  const labels: Record<string, string> = {
    landing_page: 'Landing Page',
    shipping: 'Shipping',
    email: 'Email',
    checkout: 'Checkout',
    pricing: 'Pricing',
  }
  return labels[type] || type
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}
