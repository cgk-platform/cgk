/**
 * E-Signature Dashboard Stats Cards
 *
 * Displays key metrics for the e-signature system with a professional,
 * legal-tech inspired aesthetic.
 */

'use client'

import { Card, CardContent, cn } from '@cgk/ui'
import {
  Clock,
  FileCheck,
  FileSignature,
  PenTool,
} from 'lucide-react'
import Link from 'next/link'

export interface EsignDashboardStatsData {
  pendingSignatures: number
  inProgress: number
  completedThisMonth: number
  counterSignQueue: number
}

interface EsignDashboardStatsProps {
  data: EsignDashboardStatsData
}

const statsConfig = [
  {
    key: 'pending' as const,
    label: 'Pending Signatures',
    description: 'Awaiting response',
    icon: Clock,
    valueKey: 'pendingSignatures' as const,
    href: '/admin/esign/pending',
    accentClass: 'border-l-amber-500 dark:border-l-amber-400',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'inProgress' as const,
    label: 'In Progress',
    description: 'Partially signed',
    icon: FileSignature,
    valueKey: 'inProgress' as const,
    href: '/admin/esign/documents?status=in_progress',
    accentClass: 'border-l-sky-500 dark:border-l-sky-400',
    iconClass: 'text-sky-600 dark:text-sky-400',
  },
  {
    key: 'completed' as const,
    label: 'Completed',
    description: 'This month',
    icon: FileCheck,
    valueKey: 'completedThisMonth' as const,
    href: '/admin/esign/documents?status=completed',
    accentClass: 'border-l-emerald-500 dark:border-l-emerald-400',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'counterSign' as const,
    label: 'Counter-Sign',
    description: 'Your turn to sign',
    icon: PenTool,
    valueKey: 'counterSignQueue' as const,
    href: '/admin/esign/counter-sign',
    accentClass: 'border-l-violet-500 dark:border-l-violet-400',
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
]

export function EsignDashboardStats({ data }: EsignDashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statsConfig.map((stat) => {
        const Icon = stat.icon
        const value = data[stat.valueKey]

        return (
          <Link key={stat.key} href={stat.href}>
            <Card
              className={cn(
                'border-l-4 transition-all duration-200',
                'hover:shadow-md hover:-translate-y-0.5',
                'bg-gradient-to-br from-white to-slate-50/50',
                'dark:from-slate-900 dark:to-slate-800/50',
                stat.accentClass
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                      {value.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {stat.description}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'rounded-lg p-2.5',
                      'bg-slate-100 dark:bg-slate-800',
                      stat.iconClass
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

export function EsignDashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card
          key={i}
          className="border-l-4 border-l-slate-200 dark:border-l-slate-700"
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-8 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
