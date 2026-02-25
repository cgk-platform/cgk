'use client'

import type { ReactNode } from 'react'

import { CommandPalette } from '@/components/search/command-palette'
import { AlertsProvider } from '@/context/alerts-context'

export function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <AlertsProvider>
      {children}
      <CommandPalette />
    </AlertsProvider>
  )
}
