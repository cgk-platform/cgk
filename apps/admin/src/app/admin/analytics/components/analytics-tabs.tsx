'use client'

import { useState } from 'react'
import { cn } from '@cgk-platform/ui'

import type { DateRange } from '@/lib/analytics'

import { BurnRateTab } from './tabs/burn-rate-tab'
import { GeographyTab } from './tabs/geography-tab'
import { PlatformDataTab } from './tabs/platform-data-tab'
import { SlackNotificationsTab } from './tabs/slack-notifications-tab'
import { SpendSensitivityTab } from './tabs/spend-sensitivity-tab'
import { UnitEconomicsTab } from './tabs/unit-economics-tab'

interface AnalyticsTabsProps {
  dateRange: DateRange
}

const TABS = [
  { id: 'unit-economics', label: 'Unit Economics' },
  { id: 'spend-sensitivity', label: 'Spend Sensitivity' },
  { id: 'geography', label: 'Geography' },
  { id: 'burn-rate', label: 'Burn Rate' },
  { id: 'platform-data', label: 'Platform Data' },
  { id: 'slack-notifications', label: 'Slack Notifications' },
] as const

type TabId = (typeof TABS)[number]['id']

export function AnalyticsTabs({ dateRange }: AnalyticsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('unit-economics')

  return (
    <div>
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="pt-6">
        {activeTab === 'unit-economics' && <UnitEconomicsTab dateRange={dateRange} />}
        {activeTab === 'spend-sensitivity' && <SpendSensitivityTab dateRange={dateRange} />}
        {activeTab === 'geography' && <GeographyTab dateRange={dateRange} />}
        {activeTab === 'burn-rate' && <BurnRateTab dateRange={dateRange} />}
        {activeTab === 'platform-data' && <PlatformDataTab dateRange={dateRange} />}
        {activeTab === 'slack-notifications' && <SlackNotificationsTab />}
      </div>
    </div>
  )
}
