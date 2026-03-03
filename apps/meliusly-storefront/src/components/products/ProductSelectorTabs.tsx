/**
 * Product Selector Tabs
 *
 * Horizontal tabs for product information sections.
 * Replaces accordion UI with horizontal tab navigation.
 */

'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@cgk-platform/ui'

interface Tab {
  title: string
  content: string | React.ReactNode
}

interface ProductSelectorTabsProps {
  tabs: Tab[]
}

export function ProductSelectorTabs({ tabs }: ProductSelectorTabsProps) {
  return (
    <Tabs defaultValue="0" className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-none border-b border-gray-200 bg-transparent p-0 lg:grid-cols-6">
        {tabs.map((tab, i) => (
          <TabsTrigger
            key={i}
            value={String(i)}
            className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 data-[state=active]:border-[#0268a0] data-[state=active]:bg-transparent data-[state=active]:text-[#0268a0]"
          >
            {tab.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab, i) => (
        <TabsContent key={i} value={String(i)} className="mt-6">
          {typeof tab.content === 'string' ? (
            <div
              className="prose prose-sm max-w-none text-gray-600"
              dangerouslySetInnerHTML={{ __html: tab.content }}
            />
          ) : (
            <div className="text-sm text-gray-600">{tab.content}</div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}
