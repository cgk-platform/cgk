/**
 * Collapsible Tabs (Accordion)
 *
 * Product info accordion for Description, Size Guide, Shipping, Care.
 * CGK-branded with navy borders.
 */

'use client'

import { useState } from 'react'
import { cn } from '@cgk-platform/ui'

interface Tab {
  title: string
  content: string | React.ReactNode
}

interface CollapsibleTabsProps {
  tabs: Tab[]
}

export function CollapsibleTabs({ tabs }: CollapsibleTabsProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="divide-y divide-gray-200 border-y border-gray-200">
      {tabs.map((tab, i) => (
        <div key={i}>
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex w-full items-center justify-between py-4 text-left"
          >
            <span className="text-sm font-semibold text-cgk-navy">
              {tab.title}
            </span>
            <svg
              className={cn(
                'h-4 w-4 flex-shrink-0 text-gray-500 transition-transform duration-200',
                openIndex === i && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
            className={cn(
              'overflow-hidden transition-all duration-200',
              openIndex === i ? 'max-h-[1000px] pb-4' : 'max-h-0'
            )}
          >
            {typeof tab.content === 'string' ? (
              <div
                className="prose prose-sm max-w-none text-gray-600"
                dangerouslySetInnerHTML={{ __html: tab.content }}
              />
            ) : (
              <div className="text-sm text-gray-600">{tab.content}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
