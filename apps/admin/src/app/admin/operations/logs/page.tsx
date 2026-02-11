'use client'

import { useState } from 'react'

import { LogStream, LogTable } from '@/components/operations'

type ViewMode = 'stream' | 'search'

export default function LogsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('stream')

  return (
    <div className="flex flex-col h-full">
      {/* View mode toggle */}
      <div className="flex items-center gap-4 p-4 border-b bg-white dark:bg-gray-900">
        <h1 className="text-lg font-semibold">Platform Logs</h1>

        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('stream')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'stream'
                ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Live Stream
          </button>
          <button
            onClick={() => setViewMode('search')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'search'
                ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Search & Filter
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'stream' ? <LogStream autoRefresh /> : <LogTable />}
      </div>
    </div>
  )
}
